const { HttpError } = require('../utils/http');

/**
 * Validates req[part] against a Zod schema and replaces it with the parsed value.
 * Express 5 exposes req.query as a getter, so parsed query values go on req.validQuery.
 */
const validate =
  (schema, part = 'body') =>
  (req, _res, next) => {
    const result = schema.safeParse(req[part] ?? {});
    if (!result.success) {
      const details = result.error.issues.map((i) => ({ path: i.path.join('.'), message: i.message }));
      return next(new HttpError(400, details[0]?.message || 'Invalid input', details));
    }
    if (part === 'query') req.validQuery = result.data;
    else req[part] = result.data;
    return next();
  };

module.exports = { validate };
