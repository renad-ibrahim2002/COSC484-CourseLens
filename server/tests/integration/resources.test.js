const { app, request, startDb, stopDb, clearDb, fixtures, loginAs } = require('../helpers');
const { makePdf } = require('../../src/seed/files');

let fx;
beforeAll(startDb);
afterAll(stopDb);
beforeEach(async () => {
  await clearDb();
  fx = await fixtures();
});

const upload = (agent, fields, file) => {
  let req = agent.post('/api/resources');
  for (const [k, v] of Object.entries(fields)) {
    if (Array.isArray(v)) v.forEach((x) => (req = req.field(k, x)));
    else req = req.field(k, v);
  }
  if (file) req = req.attach('file', file.buffer, file.name);
  return req;
};
const fields = (fx2, extra = {}) => ({
  courseId: String(fx2.web._id),
  type: 'formula_sheet',
  title: 'Express + JWT auth cheat sheet',
  description: 'Login flow summary',
  semester: 'Spring 2026',
  tags: ['jwt', 'express'],
  confirmOwnership: 'true',
  ...extra,
});

describe('uploading resources (UC-08, FR-08)', () => {
  test('uploads a PDF, counts its pages and lists it in search', async () => {
    const agent = await loginAs('student@aubh.edu.bh');
    const res = await upload(agent, fields(fx), { buffer: makePdf('Cheat sheet', 3), name: 'cheat.pdf' });
    expect(res.status).toBe(201);
    expect(res.body.resource).toMatchObject({ kind: 'pdf', file: { format: 'pdf', pages: 3 }, uploaderLabel: 'Computer Science student' });

    const search = await request(app)
      .get('/api/resources')
      .query({ q: 'jwt', course: String(fx.web._id), formats: 'pdf' });
    expect(search.body.total).toBe(1);
    expect(search.body.typeCounts.formula_sheet).toBe(1);
    expect(
      (
        await request(app)
          .get('/api/resources')
          .query({ types: 'notes', course: String(fx.web._id) })
      ).body.total,
    ).toBe(0);
  });

  test('rejects a file whose content is not an allowed type, whatever its name', async () => {
    const agent = await loginAs('student@aubh.edu.bh');
    const res = await upload(agent, fields(fx), { buffer: Buffer.from('MZ\x90\x00 fake exe', 'latin1'), name: 'notes.pdf' });
    expect(res.status).toBe(415);
  });

  test('rejects files over 10 MB', async () => {
    const agent = await loginAs('student@aubh.edu.bh');
    const big = Buffer.concat([makePdf('x', 1), Buffer.alloc(10 * 1024 * 1024 + 10)]);
    expect((await upload(agent, fields(fx), { buffer: big, name: 'big.pdf' })).status).toBe(413);
  });

  test('requires the ownership confirmation and either a file or a text tip', async () => {
    const agent = await loginAs('student@aubh.edu.bh');
    expect((await upload(agent, fields(fx, { confirmOwnership: 'false' }), { buffer: makePdf('x'), name: 'x.pdf' })).status).toBe(400);
    expect((await upload(agent, fields(fx))).status).toBe(400);
    const tip = await upload(agent, fields(fx, { type: 'tips', text: 'Write Supertest cases first.' }));
    expect(tip.status).toBe(201);
    expect(tip.body.resource.kind).toBe('tip');
  });
});

describe('downloads need a verified account', () => {
  test('guests get 401; students get a short-lived signed link that serves the file', async () => {
    const agent = await loginAs('student@aubh.edu.bh');
    const { body } = await upload(agent, fields(fx), { buffer: makePdf('Cheat sheet', 1), name: 'cheat.pdf' });
    const id = body.resource.id;

    expect((await request(app).get(`/api/resources/${id}/file`)).status).toBe(401);

    const reader = await loginAs('student2@aubh.edu.bh');
    const link = await reader.get(`/api/resources/${id}/file`);
    expect(link.status).toBe(200);
    const path = link.body.url.replace(/^https?:\/\/[^/]+/, '');
    const file = await request(app).get(path);
    expect(file.status).toBe(200);
    expect(file.headers['content-type']).toBe('application/pdf');
    expect(file.headers['content-disposition']).toMatch(/^attachment/);
    expect(file.body.toString('latin1').startsWith('%PDF')).toBe(true);

    expect((await request(app).get('/api/files/not-a-valid-token')).status).toBe(410);
    expect((await request(app).get(`/api/resources/${id}`)).body.resource.downloadCount).toBe(1);
  });

  test('only the uploader can delete', async () => {
    const owner = await loginAs('student@aubh.edu.bh');
    const { body } = await upload(owner, fields(fx, { type: 'tips', text: 'tip' }));
    const other = await loginAs('student2@aubh.edu.bh');
    expect((await other.delete(`/api/resources/${body.resource.id}`)).status).toBe(403);
    expect((await owner.delete(`/api/resources/${body.resource.id}`)).status).toBe(200);
  });
});
