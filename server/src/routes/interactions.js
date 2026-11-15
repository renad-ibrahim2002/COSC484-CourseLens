const express = require('express');
const { z } = require('zod');
const { Vote, Bookmark, Review, Resource, Course, MidtermRating, Report, Counter } = require('../models');
const { REPORT_REASONS } = require('../models/Report');
const { validate } = require('../middleware/validate');
const { requireAuth, isOwner } = require('../middleware/auth');
const { postLimiter } = require('../middleware/rateLimits');
const { asyncHandler, notFound, HttpError } = require('../utils/http');

const router = express.Router();
const objectId = z.string().regex(/^[a-f\d]{24}$/i, 'Invalid id');
const MODELS = { review: Review, resource: Resource, course: Course, midterm: MidtermRating };

async function loadTarget(type, id) {
  const doc = await MODELS[type].findById(id);
  if (!doc || (doc.status && !['published', 'active'].includes(doc.status))) throw notFound(type[0].toUpperCase() + type.slice(1));
  return doc;
}

// FR-10: mark helpful (toggle). One vote per user per item, enforced by a unique index.
router.post(
  '/votes',
  requireAuth,
  validate(z.object({ targetType: z.enum(['review', 'resource']), targetId: objectId })),
  asyncHandler(async (req, res) => {
    const { targetType, targetId } = req.body;
    const target = await loadTarget(targetType, targetId);
    const owner = target.userId || target.uploaderId;
    if (isOwner(req.user, owner)) throw new HttpError(400, 'You cannot vote on your own post');
    const removed = await Vote.findOneAndDelete({ userId: req.user._id, targetType, targetId });
    let helpful;
    if (removed) {
      helpful = false;
    } else {
      try {
        await Vote.create({ userId: req.user._id, targetType, targetId });
      } catch (e) {
        if (e.code !== 11000) throw e;
      }
      helpful = true;
    }
    const helpfulCount = await Vote.countDocuments({ targetType, targetId });
    await MODELS[targetType].updateOne({ _id: targetId }, { helpfulCount });
    res.json({ helpful, helpfulCount });
  }),
);

// FR-10: bookmarks (toggle)
router.post(
  '/bookmarks',
  requireAuth,
  validate(z.object({ targetType: z.enum(['course', 'review', 'resource']), targetId: objectId })),
  asyncHandler(async (req, res) => {
    const { targetType, targetId } = req.body;
    await loadTarget(targetType, targetId);
    const removed = await Bookmark.findOneAndDelete({ userId: req.user._id, targetType, targetId });
    if (!removed) {
      try {
        await Bookmark.create({ userId: req.user._id, targetType, targetId });
      } catch (e) {
        if (e.code !== 11000) throw e;
      }
    }
    res.json({ bookmarked: !removed });
  }),
);

// UC-10: report a review, mid-term comment or resource
router.post(
  '/reports',
  requireAuth,
  postLimiter,
  validate(
    z.object({
      targetType: z.enum(['review', 'midterm', 'resource']),
      targetId: objectId,
      reason: z.enum(REPORT_REASONS, { message: 'Choose a reason' }),
      comment: z.string().trim().max(300).default(''),
    }),
  ),
  asyncHandler(async (req, res) => {
    const { targetType, targetId, reason, comment } = req.body;
    const target = await loadTarget(targetType, targetId);
    if (await Report.exists({ reporterId: req.user._id, targetType, targetId })) {
      throw new HttpError(409, 'You already reported this. A moderator will review it.');
    }
    await Report.create({
      number: await Counter.next('report'),
      reporterId: req.user._id,
      targetType,
      targetId,
      universityId: target.universityId,
      courseId: target.courseId,
      reason,
      comment,
    });
    res.status(201).json({ ok: true });
  }),
);

module.exports = router;
