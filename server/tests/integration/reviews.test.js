const { app, request, startDb, stopDb, clearDb, fixtures, loginAs, goodReview, M } = require('../helpers');

let fx;
beforeAll(startDb);
afterAll(stopDb);
beforeEach(async () => {
  await clearDb();
  fx = await fixtures();
});

describe('posting reviews (UC-05, FR-05, FR-07)', () => {
  test('guests cannot post', async () => {
    const res = await request(app).post(`/api/courses/${fx.web._id}/reviews`).send(goodReview());
    expect(res.status).toBe(401);
  });

  test('a student posts a review with recommendations and the course summary updates', async () => {
    const agent = await loginAs('student@aubh.edu.bh');
    const res = await agent
      .post(`/api/courses/${fx.web._id}/reviews`)
      .send(goodReview({ recommendations: { takeBefore: [String(fx.db._id)], takeTogether: [], avoidTogether: [String(fx.se._id)] } }));
    expect(res.status).toBe(201);
    expect(res.body.held).toBe(false);

    const course = await request(app).get(`/api/courses/${fx.web._id}`);
    expect(course.body.course.ratingSummary.count).toBe(1);
    expect(course.body.course.ratingSummary.averages.overall).toBe(5);
    expect(course.body.combos.takeBefore[0]).toMatchObject({ code: 'COSC 330', count: 1 });
    expect(course.body.combos.avoidTogether[0]).toMatchObject({ code: 'COSC 470', count: 1 });
  });

  test('reviews are anonymous: the public API never returns the author account (NFR-03)', async () => {
    const agent = await loginAs('student@aubh.edu.bh');
    await agent.post(`/api/courses/${fx.web._id}/reviews`).send(goodReview());
    const res = await request(app).get(`/api/courses/${fx.web._id}/reviews`);
    const body = JSON.stringify(res.body);
    expect(res.body.reviews[0].authorLabel).toBe('Computer Science student');
    expect(body).not.toContain(String(fx.users.student._id));
    expect(body).not.toContain('student@aubh.edu.bh');
    expect(res.body.reviews[0].userId).toBeUndefined();
  });

  test('guests only see a preview of long reviews', async () => {
    const agent = await loginAs('student@aubh.edu.bh');
    await agent.post(`/api/courses/${fx.web._id}/reviews`).send(goodReview({ text: 'x'.repeat(400) }));
    const guest = await request(app).get(`/api/courses/${fx.web._id}/reviews`);
    expect(guest.body.reviews[0].truncated).toBe(true);
    const member = await (await loginAs('student2@aubh.edu.bh')).get(`/api/courses/${fx.web._id}/reviews`);
    expect(member.body.reviews[0].text).toHaveLength(400);
  });

  test('one review per course per semester', async () => {
    const agent = await loginAs('student@aubh.edu.bh');
    await agent.post(`/api/courses/${fx.web._id}/reviews`).send(goodReview());
    const again = await agent.post(`/api/courses/${fx.web._id}/reviews`).send(goodReview());
    expect(again.status).toBe(409);
    const other = await agent.post(`/api/courses/${fx.web._id}/reviews`).send(goodReview({ semester: 'Fall 2025' }));
    expect(other.status).toBe(201);
  });

  test.each([
    ['rating above 5', goodReview({ ratings: { difficulty: 6, workload: 5, usefulness: 5, fairness: 4, overall: 5 } })],
    ['decimal rating', goodReview({ ratings: { difficulty: 3.5, workload: 5, usefulness: 5, fairness: 4, overall: 5 } })],
    ['future semester', goodReview({ semester: 'Fall 2031' })],
    ['invalid semester', goodReview({ semester: 'Fall 2025<script>' })],
    ['text too long', goodReview({ text: 'a'.repeat(2001) })],
  ])('validates input: %s', async (_name, body) => {
    const agent = await loginAs('student@aubh.edu.bh');
    expect((await agent.post(`/api/courses/${fx.web._id}/reviews`).send(body)).status).toBe(400);
  });

  test('students cannot review courses at another university', async () => {
    const agent = await loginAs('student@aubh.edu.bh');
    expect((await agent.post(`/api/courses/${fx.ouCourse._id}/reviews`).send(goodReview())).status).toBe(403);
  });

  test('reviews that name an instructor are held and sent to the moderation queue', async () => {
    const agent = await loginAs('student@aubh.edu.bh');
    const res = await agent
      .post(`/api/courses/${fx.web._id}/reviews`)
      .send(goodReview({ text: 'Dr. Smith is unfair, avoid his section.' }));
    expect(res.status).toBe(201);
    expect(res.body.held).toBe(true);
    expect((await request(app).get(`/api/courses/${fx.web._id}/reviews`)).body.total).toBe(0);
    const report = await M.Report.findOne({ targetId: res.body.review.id });
    expect(report).toMatchObject({ reason: 'names_instructor', reporterId: null, status: 'open' });
  });
});

describe('editing and deleting own content (FR-13)', () => {
  test('owners can edit and delete; other students cannot', async () => {
    const owner = await loginAs('student@aubh.edu.bh');
    const { body } = await owner.post(`/api/courses/${fx.web._id}/reviews`).send(goodReview());
    const id = body.review.id;
    const other = await loginAs('student2@aubh.edu.bh');

    expect((await other.patch(`/api/reviews/${id}`).send(goodReview({ text: 'hacked' }))).status).toBe(403);
    expect((await other.delete(`/api/reviews/${id}`)).status).toBe(403);

    const edited = await owner
      .patch(`/api/reviews/${id}`)
      .send(goodReview({ ratings: { difficulty: 2, workload: 2, usefulness: 2, fairness: 2, overall: 2 } }));
    expect(edited.status).toBe(200);
    expect((await request(app).get(`/api/courses/${fx.web._id}`)).body.course.ratingSummary.averages.overall).toBe(2);

    expect((await owner.delete(`/api/reviews/${id}`)).status).toBe(200);
    expect((await request(app).get(`/api/courses/${fx.web._id}`)).body.course.ratingSummary.count).toBe(0);
  });
});

describe('helpful votes, bookmarks and reports (UC-10, FR-10)', () => {
  test('one helpful vote per user, toggled; no voting on your own review', async () => {
    const owner = await loginAs('student@aubh.edu.bh');
    const { body } = await owner.post(`/api/courses/${fx.web._id}/reviews`).send(goodReview());
    const target = { targetType: 'review', targetId: body.review.id };
    expect((await owner.post('/api/votes').send(target)).status).toBe(400);

    const voter = await loginAs('student2@aubh.edu.bh');
    expect((await voter.post('/api/votes').send(target)).body).toEqual({ helpful: true, helpfulCount: 1 });
    expect((await voter.post('/api/votes').send(target)).body).toEqual({ helpful: false, helpfulCount: 0 });
  });

  test('bookmarks appear in My bookmarks', async () => {
    const agent = await loginAs('student@aubh.edu.bh');
    expect((await agent.post('/api/bookmarks').send({ targetType: 'course', targetId: String(fx.web._id) })).body.bookmarked).toBe(true);
    const list = await agent.get('/api/me/bookmarks');
    expect(list.body.courses.map((c) => c.code)).toEqual(['COSC 484']);
  });

  test('a student can report a review once', async () => {
    const owner = await loginAs('student@aubh.edu.bh');
    const { body } = await owner.post(`/api/courses/${fx.web._id}/reviews`).send(goodReview());
    const reporter = await loginAs('student2@aubh.edu.bh');
    const report = { targetType: 'review', targetId: body.review.id, reason: 'spam', comment: 'Selling notes' };
    expect((await reporter.post('/api/reports').send(report)).status).toBe(201);
    expect((await reporter.post('/api/reports').send(report)).status).toBe(409);
    expect((await reporter.post('/api/reports').send({ ...report, reason: 'made-up' })).status).toBe(400);
  });
});

describe('mid-semester ratings (UC-06, FR-06)', () => {
  test('ratings are for the current semester and shown separately from reviews', async () => {
    const { termOf } = require('../../src/utils/semesters');
    const agent = await loginAs('student@aubh.edu.bh');
    const body = {
      assessment: 'midterm',
      semester: termOf(),
      section: 'Section 01',
      ratings: { pace: 4, workload: 4, clarity: 3, fairness: 4 },
      comment: 'Start early.',
    };
    expect((await agent.post(`/api/courses/${fx.web._id}/midterms`).send(body)).status).toBe(201);
    expect((await agent.post(`/api/courses/${fx.web._id}/midterms`).send(body)).status).toBe(409);
    expect((await agent.post(`/api/courses/${fx.web._id}/midterms`).send({ ...body, semester: 'Spring 2025' })).status).toBe(400);

    const res = await request(app).get(`/api/courses/${fx.web._id}/midterms`);
    expect(res.body.midterm).toMatchObject({ count: 1, averages: { pace: 4, clarity: 3 } });
    expect(res.body.comments[0].comment).toBe('Start early.');
    expect((await request(app).get(`/api/courses/${fx.web._id}`)).body.course.ratingSummary.count).toBe(0);
  });
});
