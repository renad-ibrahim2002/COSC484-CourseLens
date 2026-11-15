const { rateLimit } = require('express-rate-limit');
const env = require('../config/env');

// Production limits; development and tests get much higher ones so automated runs are not blocked.
const make = (windowMs, limit, message, extra = {}) =>
  rateLimit({
    windowMs,
    limit: env.isTest ? 10000 : env.isProd ? limit : limit * 20,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    message: { error: message },
    ...extra,
  });

module.exports = {
  apiLimiter: make(15 * 60 * 1000, 600, 'Too many requests. Please slow down.'),
  loginLimiter: make(15 * 60 * 1000, 20, 'Too many log-in attempts. Try again in 15 minutes.'),
  registerLimiter: make(60 * 60 * 1000, 10, 'Too many sign-ups from this network. Try again later.'),
  emailLimiter: make(60 * 60 * 1000, 8, 'Too many emails requested. Try again later.'),
  postLimiter: make(60 * 60 * 1000, 30, 'You are posting too quickly. Try again later.'),
};
