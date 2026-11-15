const { app, request, startDb, stopDb, clearDb, fixtures, loginAs, PASSWORD, M } = require('../helpers');
const { outbox } = require('../../src/services/email');

let fx;
beforeAll(startDb);
afterAll(stopDb);
beforeEach(async () => {
  await clearDb();
  fx = await fixtures();
  outbox.length = 0;
});

const linkToken = () => outbox.at(-1).text.match(/\/(verify|reset-password)\/([a-f0-9]+)/)[2];

describe('registration and email verification (UC-01, FR-01)', () => {
  test('detects the university from the email domain', async () => {
    const res = await request(app).get('/api/auth/email-domain').query({ email: 'new@aubh.edu.bh' });
    expect(res.body.university.shortName).toBe('AUBH');
    expect(res.body.majors.map((m) => m.code)).toEqual(['COSC']);
  });

  test('rejects emails whose domain is not in the catalog', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Sara', email: 'sara@gmail.com', majorId: String(fx.cs._id), password: 'Password1', agree: true });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/university email/i);
  });

  test('rejects weak passwords and a missing agreement', async () => {
    const base = { name: 'Sara', email: 'sara@aubh.edu.bh', majorId: String(fx.cs._id) };
    expect(
      (
        await request(app)
          .post('/api/auth/register')
          .send({ ...base, password: 'short', agree: true })
      ).status,
    ).toBe(400);
    expect(
      (
        await request(app)
          .post('/api/auth/register')
          .send({ ...base, password: 'nonumbers', agree: true })
      ).status,
    ).toBe(400);
    expect(
      (
        await request(app)
          .post('/api/auth/register')
          .send({ ...base, password: 'Password1', agree: false })
      ).status,
    ).toBe(400);
  });

  test('account only works after the email link is opened', async () => {
    const reg = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Sara Ali', email: 'Sara@AUBH.edu.bh', majorId: String(fx.cs._id), password: 'Password1', agree: true });
    expect(reg.status).toBe(201);
    expect(reg.body.email).toBe('sara@aubh.edu.bh');

    const user = await M.User.findOne({ email: 'sara@aubh.edu.bh' }).select('+passwordHash');
    expect(user.isVerified).toBe(false);
    expect(user.passwordHash).toMatch(/^\$2[aby]\$/); // bcrypt, never plain text

    const early = await request(app).post('/api/auth/login').send({ email: 'sara@aubh.edu.bh', password: 'Password1' });
    expect(early.status).toBe(403);
    expect(early.body.code).toBe('UNVERIFIED');

    const agent = request.agent(app);
    const verified = await agent.post('/api/auth/verify').send({ token: linkToken() });
    expect(verified.status).toBe(200);
    expect(verified.body.user.university.shortName).toBe('AUBH');
    expect((await agent.get('/api/auth/me')).body.user.email).toBe('sara@aubh.edu.bh');

    // The link is single use.
    expect((await request(app).post('/api/auth/verify').send({ token: linkToken() })).status).toBe(400);
  });

  test('does not allow registering an email that already has a verified account', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Someone', email: 'student@aubh.edu.bh', majorId: String(fx.cs._id), password: 'Password1', agree: true });
    expect(res.status).toBe(409);
  });
});

describe('log in, sessions and lockout (UC-02, FR-02)', () => {
  test('sets httpOnly cookies and never returns the password hash', async () => {
    const res = await request(app).post('/api/auth/login').send({ email: 'student@aubh.edu.bh', password: PASSWORD });
    expect(res.status).toBe(200);
    expect(JSON.stringify(res.body)).not.toMatch(/passwordHash|\$2[aby]\$/);
    const cookies = res.headers['set-cookie'].join(';');
    expect(cookies).toMatch(/cl_at=.*HttpOnly/);
    expect(cookies).toMatch(/SameSite=Lax/);
  });

  test('counts down attempts and locks the account after five failures', async () => {
    const bad = () => request(app).post('/api/auth/login').send({ email: 'student@aubh.edu.bh', password: 'wrong' });
    expect((await bad()).body.error).toMatch(/4 attempts left/);
    await bad();
    await bad();
    expect((await bad()).body.error).toMatch(/1 attempt left/);
    expect((await bad()).status).toBe(429);
    const right = await request(app).post('/api/auth/login').send({ email: 'student@aubh.edu.bh', password: PASSWORD });
    expect(right.status).toBe(429);
  });

  test('guests get user: null from /me', async () => {
    const res = await request(app).get('/api/auth/me');
    expect(res.status).toBe(200);
    expect(res.body.user).toBeNull();
  });

  test('refresh renews the session; logout ends it', async () => {
    const agent = await loginAs('student@aubh.edu.bh');
    expect((await agent.post('/api/auth/refresh')).status).toBe(200);
    await agent.post('/api/auth/logout');
    expect((await agent.get('/api/auth/me')).body.user).toBeNull();
    expect((await agent.get('/api/me/summary')).status).toBe(401);
  });

  test('blocks NoSQL operator injection in the login body', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: { $gt: '' }, password: { $gt: '' } });
    expect(res.status).toBe(400);
  });
});

describe('password reset', () => {
  test('emails a link, sets the new password and signs out old sessions', async () => {
    const old = await loginAs('student@aubh.edu.bh');
    const res = await request(app).post('/api/auth/forgot-password').send({ email: 'student@aubh.edu.bh' });
    expect(res.status).toBe(200);
    const token = linkToken();
    expect((await request(app).post('/api/auth/reset-password').send({ token, password: 'NewPassword9' })).status).toBe(200);
    expect((await old.post('/api/auth/refresh')).status).toBe(401);
    await loginAs('student@aubh.edu.bh', 'NewPassword9');
  });

  test('answers the same for unknown emails', async () => {
    const res = await request(app).post('/api/auth/forgot-password').send({ email: 'nobody@aubh.edu.bh' });
    expect(res.status).toBe(200);
    expect(outbox).toHaveLength(0);
  });
});
