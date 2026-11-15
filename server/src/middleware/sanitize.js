const mongoSanitize = require('express-mongo-sanitize');

/**
 * Strips keys that start with "$" or contain "." from body, params and query, which blocks
 * NoSQL operator injection (OWASP A03). express-mongo-sanitize's own middleware reassigns
 * req.query, which Express 5 does not allow, so its sanitize() is applied in place instead.
 */
function sanitize(req, _res, next) {
  if (req.body && typeof req.body === 'object') mongoSanitize.sanitize(req.body);
  if (req.params) mongoSanitize.sanitize(req.params);
  const q = req.query;
  if (q && typeof q === 'object') {
    for (const key of Object.keys(q)) {
      if (key.startsWith('$') || key.includes('.')) delete q[key];
      else if (q[key] && typeof q[key] === 'object') mongoSanitize.sanitize(q[key]);
    }
  }
  next();
}

module.exports = { sanitize };
