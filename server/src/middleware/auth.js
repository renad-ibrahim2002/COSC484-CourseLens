const jwt = require('jsonwebtoken');
const env = require('../config/env');
const { User } = require('../models');
const { HttpError } = require('../utils/http');

const ACCESS_COOKIE = 'cl_at';
const REFRESH_COOKIE = 'cl_rt';

async function loadUser(req) {
  const token = req.cookies?.[ACCESS_COOKIE];
  if (!token) return null;
  try {
    const payload = jwt.verify(token, env.jwtSecret);
    const user = await User.findById(payload.sub);
    if (!user || !user.isVerified) return null;
    return user;
  } catch {
    return null;
  }
}

/** Attaches req.user when a valid access token is present; never rejects. */
async function optionalAuth(req, _res, next) {
  try {
    req.user = await loadUser(req);
    next();
  } catch (e) {
    next(e);
  }
}

/** Rejects with 401 unless the request carries a valid access token for a verified account. */
async function requireAuth(req, _res, next) {
  try {
    req.user = req.user || (await loadUser(req));
    if (!req.user) return next(new HttpError(401, 'Please log in to continue'));
    return next();
  } catch (e) {
    return next(e);
  }
}

/** Role check. Must run after requireAuth. */
const requireRole =
  (...roles) =>
  (req, _res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return next(new HttpError(403, 'You do not have permission to do that'));
    }
    return next();
  };

/** Moderators may act only on content from their own university; admins on everything. */
function canModerate(user, universityId) {
  if (!user) return false;
  if (user.role === 'admin') return true;
  return user.role === 'moderator' && String(user.universityId) === String(universityId);
}

/** Ownership check for edit/delete of a student's own content (FR-13). */
function isOwner(user, ownerId) {
  return !!user && !!ownerId && String(user._id) === String(ownerId);
}

module.exports = { optionalAuth, requireAuth, requireRole, canModerate, isOwner, ACCESS_COOKIE, REFRESH_COOKIE };
