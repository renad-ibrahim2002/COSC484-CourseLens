const { app, request, startDb, stopDb, clearDb, fixtures, loginAs, goodReview, M } = require('../helpers');

let fx;
let reportId;
let reviewId;
beforeAll(startDb);
afterAll(stopDb);
beforeEach(async () => {
  await clearDb();
  fx = await fixtures();
  const author = await loginAs('student@aubh.edu.bh');
  const { body } = await author.post(`/api/courses/${fx.web._id}/reviews`).send(goodReview({ text: 'Buy my notes on WhatsApp' }));
  reviewId = body.review.id;
  const reporter = await loginAs('student2@aubh.edu.bh');
  await reporter.post('/api/reports').send({ targetType: 'review', targetId: reviewId, reason: 'spam' });
  reportId = String((await M.Report.findOne({ targetId: reviewId }))._id);
});

describe('role-based access (UC-11, FR-11)', () => {
  test('students cannot open the moderation queue or admin console', async () => {
    const student = await loginAs('student2@aubh.edu.bh');
    expect((await student.get('/api/moderation/queue')).status).toBe(403);
    expect((await student.get('/api/admin/stats')).status).toBe(403);
    expect((await request(app).get('/api/moderation/queue')).status).toBe(401);
  });

  test('moderators only act on content from their own university', async () => {
    const otherMod = await loginAs('mod@ou.edu.bh');
    expect((await otherMod.get('/api/moderation/queue')).body.items).toHaveLength(0);
    expect((await otherMod.get(`/api/moderation/cases/${reportId}`)).status).toBe(403);
    expect((await otherMod.post(`/api/moderation/cases/${reportId}/decision`).send({ action: 'hide', note: 'spam' })).status).toBe(403);
  });
});

describe('moderation decisions', () => {
  test('hiding removes the review from the public site and is written to the log', async () => {
    const mod = await loginAs('mod@aubh.edu.bh');
    const queue = await mod.get('/api/moderation/queue');
    expect(queue.body.items[0]).toMatchObject({ course: 'COSC 484', reasonLabel: 'Spam', reports: 1 });

    const kase = await mod.get(`/api/moderation/cases/${reportId}`);
    expect(kase.body.case.author.email).toBe('student@aubh.edu.bh'); // moderators only

    expect((await mod.post(`/api/moderation/cases/${reportId}/decision`).send({ action: 'hide', note: '' })).status).toBe(400);
    expect((await mod.post(`/api/moderation/cases/${reportId}/decision`).send({ action: 'hide', note: 'Selling notes' })).status).toBe(200);

    expect((await request(app).get(`/api/courses/${fx.web._id}/reviews`)).body.total).toBe(0);
    const log = await mod.get('/api/moderation/log');
    expect(log.body.entries[0]).toMatchObject({ action: 'hidden', item: 'Review on COSC 484', note: 'Selling notes' });
    expect((await mod.get('/api/moderation/queue')).body.counts).toMatchObject({ open: 0, hidden: 1 });

    expect((await mod.post(`/api/moderation/cases/${reportId}/decision`).send({ action: 'restore', note: 'Mistake' })).status).toBe(200);
    expect((await request(app).get(`/api/courses/${fx.web._id}/reviews`)).body.total).toBe(1);

    const csv = await mod.get('/api/moderation/log.csv');
    expect(csv.headers['content-type']).toMatch(/text\/csv/);
    expect(csv.text.split('\n')).toHaveLength(3);
  });
});

describe('admin console (UC-12, FR-12)', () => {
  test('admins manage courses and roles; changes go to the audit log', async () => {
    const admin = await loginAs('admin@aubh.edu.bh');
    const created = await admin
      .post('/api/admin/courses')
      .send({
        universityId: String(fx.aubh._id),
        code: 'cosc499',
        title: 'Special Topics in Computing',
        credits: 3,
        majorIds: [String(fx.cs._id)],
      });
    expect(created.status).toBe(201);
    expect(created.body.course.code).toBe('COSC 499');
    expect(
      (
        await admin
          .post('/api/admin/courses')
          .send({ universityId: String(fx.aubh._id), code: 'COSC 499', title: 'Dup', majorIds: [String(fx.cs._id)] })
      ).status,
    ).toBe(409);

    await admin.patch(`/api/admin/courses/${created.body.course.id}`).send({ status: 'archived' });
    expect((await request(app).get(`/api/majors/${fx.cs._id}/courses`).query({ limit: 50 })).body.courses.map((c) => c.code)).not.toContain(
      'COSC 499',
    );

    const role = await admin.patch(`/api/admin/users/${fx.users.student2._id}/role`).send({ role: 'moderator' });
    expect(role.status).toBe(200);
    expect((await admin.patch(`/api/admin/users/${fx.users.admin._id}/role`).send({ role: 'student' })).status).toBe(400);

    const audit = await admin.get('/api/admin/audit');
    expect(audit.body.entries.map((e) => e.action)).toEqual(
      expect.arrayContaining(['Added course', 'Archived course', 'Changed role: Student → Moderator']),
    );
  });

  test('approving a student course suggestion adds it to the catalog', async () => {
    const student = await loginAs('student2@aubh.edu.bh');
    expect(
      (await student.post('/api/suggestions/course').send({ majorId: String(fx.cs._id), code: 'COSC 499', title: 'Special Topics' }))
        .status,
    ).toBe(201);
    const admin = await loginAs('admin@aubh.edu.bh');
    const list = await admin.get('/api/admin/suggestions');
    expect(list.body.suggestions[0]).toMatchObject({ code: 'COSC 499', requests: 1 });
    await admin.post(`/api/admin/suggestions/${list.body.suggestions[0].id}/approve`).send({ title: 'Special Topics in Computing' });
    const courses = await request(app).get(`/api/majors/${fx.cs._id}/courses`).query({ q: '499' });
    expect(courses.body.courses[0].title).toBe('Special Topics in Computing');
  });
});
