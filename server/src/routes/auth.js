const express = require('express');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const { z } = require('zod');
const env = require('../config/env');
const { User, University, Major, Token } = require('../models');
const { validate } = require('../middleware/validate');
const { optionalAuth, ACCESS_COOKIE, REFRESH_COOKIE } = require('../middleware/auth');
const { loginLimiter, registerLimiter, emailLimiter } = require('../middleware/rateLimits');
const { HttpError, asyncHandler } = require('../utils/http');
const { sendVerificationEmail, sendResetEmail, isConfigured: emailConfigured } = require('../services/email');

const router = express.Router();

const MAX_FAILED_LOGINS = 5;
const LOCK_MINUTES = 15;
const BCRYPT_ROUNDS = env.isTest ? 4 : 12;

const password = z
  .string()
  .min(8, 'Use at least 8 characters, with a number')
  .max(128)
  .regex(/\d/, 'Use at least 8 characters, with a number');
const email = z.string().trim().toLowerCase().email('Enter a valid email').max(254);

const DUMMY_HASH = bcrypt.hashSync('not-a-real-password', 4);
const hashToken = (t) => crypto.createHash('sha256').update(t).digest('hex');

async function issueToken(userId, type, ttlMs) {
  const raw = crypto.randomBytes(32).toString('hex');
  await Token.deleteMany({ userId, type });
  await Token.create({ userId, type, tokenHash: hashToken(raw), expiresAt: new Date(Date.now() + ttlMs) });
  return raw;
}

async function consumeToken(raw, type) {
  const token = await Token.findOne({ tokenHash: hashToken(raw), type, expiresAt: { $gt: new Date() } });
  if (!token) return null;
  await Token.deleteOne({ _id: token._id });
  return token;
}

/** In local development without an email provider the link is returned so the flow can be tested. */
const devLink = (link) => (!env.isProd && !emailConfigured() ? { devLink: link } : {});

const cookieBase = () => ({ httpOnly: true, secure: env.isProd, sameSite: 'lax' });

function setSessionCookies(res, user, remember) {
  const access = jwt.sign({ sub: String(user._id), role: user.role }, env.jwtSecret, { expiresIn: env.accessTokenTtl });
  const refresh = jwt.sign({ sub: String(user._id), v: user.tokenVersion || 0, r: !!remember }, env.jwtRefreshSecret, {
    expiresIn: remember ? env.rememberMeTtl : env.sessionIdleTtl,
  });
  res.cookie(ACCESS_COOKIE, access, { ...cookieBase(), path: '/', maxAge: 15 * 60 * 1000 });
  // Without "Keep me logged in" the refresh cookie is a session cookie and its token expires
  // after SESSION_IDLE_TTL of inactivity (it is renewed on every refresh).
  res.cookie(REFRESH_COOKIE, refresh, {
    ...cookieBase(),
    path: '/api/auth',
    ...(remember ? { maxAge: 30 * 24 * 60 * 60 * 1000 } : {}),
  });
}

function clearSessionCookies(res) {
  res.clearCookie(ACCESS_COOKIE, { ...cookieBase(), path: '/' });
  res.clearCookie(REFRESH_COOKIE, { ...cookieBase(), path: '/api/auth' });
}

async function sessionPayload(user) {
  const [university, major] = await Promise.all([
    user.universityId ? University.findById(user.universityId, { name: 1, shortName: 1 }).lean() : null,
    user.majorId ? Major.findById(user.majorId, { name: 1, code: 1 }).lean() : null,
  ]);
  return { user: { ...user.toPublic(), university, major } };
}

// Which university does this email belong to? Used for the "AUBH detected" hint on sign-up.
router.get(
  '/email-domain',
  validate(z.object({ email }), 'query'),
  asyncHandler(async (req, res) => {
    const domain = req.validQuery.email.split('@')[1];
    const university = await University.findOne({ emailDomains: domain, status: 'active' }, { name: 1, shortName: 1 }).lean();
    if (!university) return res.json({ university: null, majors: [] });
    const majors = await Major.find({ universityId: university._id, archived: false }, { name: 1, code: 1 }).sort({ name: 1 }).lean();
    return res.json({ university, majors });
  }),
);

router.post(
  '/register',
  registerLimiter,
  validate(
    z.object({
      name: z.string().trim().min(2, 'Enter your full name').max(80),
      email,
      majorId: z.string().regex(/^[a-f\d]{24}$/i, 'Choose your major'),
      password,
      agree: z.literal(true, { message: 'Please agree to the posting guidelines' }),
    }),
  ),
  asyncHandler(async (req, res) => {
    const { name, majorId } = req.body;
    const domain = req.body.email.split('@')[1];
    const university = await University.findOne({ emailDomains: domain, status: 'active' });
    if (!university) {
      throw new HttpError(400, 'Use your university email. This domain is not in the CourseLens catalog yet.', [
        { path: 'email', message: 'Use your university email' },
      ]);
    }
    const major = await Major.findOne({ _id: majorId, universityId: university._id, archived: false });
    if (!major) throw new HttpError(400, 'Choose a major from your university', [{ path: 'majorId', message: 'Choose your major' }]);

    let user = await User.findOne({ email: req.body.email });
    if (user && user.isVerified) {
      throw new HttpError(409, 'An account with this email already exists. Log in instead.', [
        { path: 'email', message: 'An account with this email already exists' },
      ]);
    }
    const passwordHash = await bcrypt.hash(req.body.password, BCRYPT_ROUNDS);
    if (user) {
      Object.assign(user, { name, passwordHash, universityId: university._id, majorId: major._id });
      await user.save();
    } else {
      user = await User.create({ name, email: req.body.email, passwordHash, universityId: university._id, majorId: major._id });
    }
    const raw = await issueToken(user._id, 'verify', 24 * 60 * 60 * 1000);
    const link = `${env.clientUrl}/verify/${raw}`;
    await sendVerificationEmail(user, link);
    res.status(201).json({ email: user.email, ...devLink(link) });
  }),
);

router.post(
  '/resend-verification',
  emailLimiter,
  validate(z.object({ email })),
  asyncHandler(async (req, res) => {
    const user = await User.findOne({ email: req.body.email });
    let extra = {};
    if (user && !user.isVerified) {
      const raw = await issueToken(user._id, 'verify', 24 * 60 * 60 * 1000);
      const link = `${env.clientUrl}/verify/${raw}`;
      await sendVerificationEmail(user, link);
      extra = devLink(link);
    }
    // Same response either way so the endpoint does not reveal which emails are registered.
    res.json({ ok: true, ...extra });
  }),
);

router.post(
  '/verify',
  validate(z.object({ token: z.string().min(10).max(200) })),
  asyncHandler(async (req, res) => {
    const token = await consumeToken(req.body.token, 'verify');
    if (!token) throw new HttpError(400, 'This verification link is invalid or has expired. Request a new one.');
    const user = await User.findByIdAndUpdate(token.userId, { isVerified: true }, { new: true }).select('+tokenVersion');
    if (!user) throw new HttpError(400, 'Account not found');
    setSessionCookies(res, user, false);
    res.json(await sessionPayload(user));
  }),
);

router.post(
  '/login',
  loginLimiter,
  validate(z.object({ email, password: z.string().min(1, 'Enter your password').max(128), remember: z.boolean().optional() })),
  asyncHandler(async (req, res) => {
    const user = await User.findOne({ email: req.body.email }).select('+passwordHash +failedLogins +lockUntil +tokenVersion');
    if (user?.lockUntil && user.lockUntil > new Date()) {
      const mins = Math.ceil((user.lockUntil - Date.now()) / 60000);
      throw new HttpError(429, `Too many attempts. Try again in ${mins} minute${mins === 1 ? '' : 's'} or reset your password.`);
    }
    const ok = user ? await bcrypt.compare(req.body.password, user.passwordHash) : await bcrypt.compare(req.body.password, DUMMY_HASH);
    if (!user || !ok) {
      if (user) {
        user.failedLogins = (user.failedLogins || 0) + 1;
        if (user.failedLogins >= MAX_FAILED_LOGINS) {
          user.lockUntil = new Date(Date.now() + LOCK_MINUTES * 60 * 1000);
          user.failedLogins = 0;
          await user.save();
          throw new HttpError(429, `Too many attempts. Try again in ${LOCK_MINUTES} minutes or reset your password.`);
        }
        await user.save();
        const left = MAX_FAILED_LOGINS - user.failedLogins;
        throw new HttpError(401, `Incorrect email or password. ${left} attempt${left === 1 ? '' : 's'} left before a short lockout.`);
      }
      throw new HttpError(401, 'Incorrect email or password.');
    }
    if (!user.isVerified) {
      const err = new HttpError(403, 'Verify your email before logging in. We can send a new link.');
      err.extra = { code: 'UNVERIFIED' };
      throw err;
    }
    user.failedLogins = 0;
    user.lockUntil = undefined;
    await user.save();
    setSessionCookies(res, user, !!req.body.remember);
    res.json(await sessionPayload(user));
  }),
);

router.post(
  '/refresh',
  asyncHandler(async (req, res) => {
    const raw = req.cookies?.[REFRESH_COOKIE];
    if (!raw) throw new HttpError(401, 'Session expired');
    let payload;
    try {
      payload = jwt.verify(raw, env.jwtRefreshSecret);
    } catch {
      clearSessionCookies(res);
      throw new HttpError(401, 'Session expired');
    }
    const user = await User.findById(payload.sub).select('+tokenVersion');
    if (!user || !user.isVerified || (user.tokenVersion || 0) !== payload.v) {
      clearSessionCookies(res);
      throw new HttpError(401, 'Session expired');
    }
    setSessionCookies(res, user, payload.r);
    res.json(await sessionPayload(user));
  }),
);

router.post('/logout', (req, res) => {
  clearSessionCookies(res);
  res.json({ ok: true });
});

// Current session. Guests get { user: null } (not a 401) so pages load without console errors;
// an expired access token is renewed here from the refresh cookie.
router.get(
  '/me',
  optionalAuth,
  asyncHandler(async (req, res) => {
    if (req.user) return res.json(await sessionPayload(req.user));
    const raw = req.cookies?.[REFRESH_COOKIE];
    if (raw) {
      try {
        const payload = jwt.verify(raw, env.jwtRefreshSecret);
        const user = await User.findById(payload.sub).select('+tokenVersion');
        if (user && user.isVerified && (user.tokenVersion || 0) === payload.v) {
          setSessionCookies(res, user, payload.r);
          return res.json(await sessionPayload(user));
        }
      } catch {
        /* fall through to guest */
      }
      clearSessionCookies(res);
    }
    return res.json({ user: null });
  }),
);

router.post(
  '/forgot-password',
  emailLimiter,
  validate(z.object({ email })),
  asyncHandler(async (req, res) => {
    const user = await User.findOne({ email: req.body.email });
    let extra = {};
    if (user) {
      const raw = await issueToken(user._id, 'reset', 60 * 60 * 1000);
      const link = `${env.clientUrl}/reset-password/${raw}`;
      await sendResetEmail(user, link);
      extra = devLink(link);
    }
    res.json({ ok: true, ...extra });
  }),
);

router.post(
  '/reset-password',
  validate(z.object({ token: z.string().min(10).max(200), password })),
  asyncHandler(async (req, res) => {
    const token = await consumeToken(req.body.token, 'reset');
    if (!token) throw new HttpError(400, 'This reset link is invalid or has expired. Request a new one.');
    const passwordHash = await bcrypt.hash(req.body.password, BCRYPT_ROUNDS);
    // Resetting also verifies the email (the user proved they can read it) and signs out other sessions.
    await User.updateOne(
      { _id: token.userId },
      { passwordHash, isVerified: true, failedLogins: 0, $unset: { lockUntil: 1 }, $inc: { tokenVersion: 1 } },
    );
    clearSessionCookies(res);
    res.json({ ok: true });
  }),
);

module.exports = router;
module.exports.BCRYPT_ROUNDS = BCRYPT_ROUNDS;
module.exports.passwordSchema = password;
module.exports.clearSessionCookies = clearSessionCookies;
