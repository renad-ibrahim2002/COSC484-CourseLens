class HttpError extends Error {
  constructor(status, message, details) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

const notFound = (what = 'Resource') => new HttpError(404, `${what} not found`);
const forbidden = (msg = 'You do not have permission to do that') => new HttpError(403, msg);

module.exports = { HttpError, asyncHandler, notFound, forbidden };
