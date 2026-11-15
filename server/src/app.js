const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const morgan = require('morgan');
const env = require('./config/env');
const { sanitize } = require('./middleware/sanitize');
const { optionalAuth } = require('./middleware/auth');
const { apiLimiter } = require('./middleware/rateLimits');
const { notFoundHandler, errorHandler } = require('./middleware/errors');
const { courses, reviews, midterms, meta } = require('./routes/courses');
const { resources, files } = require('./routes/resources');

function createApp() {
  const app = express();
  app.set('trust proxy', env.trustProxy);
  app.disable('x-powered-by');

  app.use(
    helmet({
      contentSecurityPolicy: { directives: { defaultSrc: ["'none'"], frameAncestors: ["'none'"] } },
      crossOriginResourcePolicy: { policy: 'same-site' },
    }),
  );
  app.use(
    cors({
      origin(origin, cb) {
        // Same-origin requests (no Origin header) and the configured frontend are allowed.
        if (!origin || env.corsOrigins.includes(origin)) return cb(null, true);
        return cb(null, false);
      },
      credentials: true,
    }),
  );
  if (!env.isTest) app.use(morgan(env.isProd ? 'combined' : 'dev'));
  app.use(express.json({ limit: '100kb' }));
  app.use(express.urlencoded({ extended: false, limit: '100kb' }));
  app.use(cookieParser());
  app.use(sanitize);

  app.get('/api/health', (_req, res) => res.json({ ok: true }));

  app.use('/api', apiLimiter);
  app.use('/api/files', files);
  app.use('/api/auth', require('./routes/auth'));
  app.use('/api', optionalAuth);
  app.use('/api', require('./routes/catalog'));
  app.use('/api/meta', meta);
  app.use('/api/courses', courses);
  app.use('/api/reviews', reviews);
  app.use('/api/midterms', midterms);
  app.use('/api/resources', resources);
  app.use('/api', require('./routes/interactions'));
  app.use('/api/search', require('./routes/search'));
  app.use('/api/me', require('./routes/me'));
  app.use('/api/moderation', require('./routes/moderation'));
  app.use('/api/admin', require('./routes/admin'));

  app.use('/api', notFoundHandler);
  app.use(errorHandler);
  return app;
}

module.exports = { createApp };
