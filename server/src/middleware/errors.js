const { HttpError } = require('../utils/http');
const env = require('../config/env');

function notFoundHandler(_req, _res, next) {
  next(new HttpError(404, 'Route not found'));
}

function errorHandler(err, _req, res, _next) {
  let status = err.status || 500;
  let message = err.message || 'Something went wrong';
  let { details } = err;

  if (err.name === 'CastError') {
    status = 400;
    message = 'Invalid id';
  } else if (err.code === 11000) {
    status = 409;
    message = 'That already exists';
  } else if (err.name === 'ValidationError') {
    status = 400;
    details = Object.values(err.errors).map((e) => ({ path: e.path, message: e.message }));
    message = details[0]?.message || 'Invalid input';
  } else if (err.name === 'MulterError') {
    status = err.code === 'LIMIT_FILE_SIZE' ? 413 : 400;
    message = err.code === 'LIMIT_FILE_SIZE' ? 'Files can be up to 10 MB' : err.message;
  } else if (err.type === 'entity.too.large') {
    status = 413;
    message = 'Request is too large';
  }

  if (status >= 500) {
    if (!env.isTest) console.error(err);
    if (env.isProd) message = 'Something went wrong. Please try again.';
  }
  const body = { error: message };
  if (details) body.details = details;
  if (err instanceof HttpError && err.extra) Object.assign(body, err.extra);
  res.status(status).json(body);
}

module.exports = { notFoundHandler, errorHandler };
