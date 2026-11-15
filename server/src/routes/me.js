const express = require('express');
const bcrypt = require('bcryptjs');
const { z } = require('zod');
const { User, Major, Review, MidtermRating, Resource, Bookmark, Vote, Course, University } = require('../models');
const { validate } = require('../middleware/validate');
const { requireAuth } = require('../middleware/auth');
const { asyncHandler, HttpError } = require('../utils/http');
const { reviewOut, resourceOut, courseOut } = require('../services/serializers');
const { viewerFlags } = require('../services/viewer');
const { BCRYPT_ROUNDS, passwordSchema, clearSessionCookies } = require('./auth');
const { authorLabelFor } = require('../utils/labels');
const { semesterIndex } = require('../utils/semesters');

const router = express.Router();
router.use(requireAuth);

// Sidebar counts
router.get(
  '/summary',
  asyncHandler(async (req, res) => {
    const uid = req.user._id;
    const [reviews, midterms, uploads, bookmarks] = await Promise.all([
      Review.countDocuments({ userId: uid }),
      MidtermRating.countDocuments({ userId: uid }),
      Resource.countDocuments({ uploaderId: uid }),
      Bookmark.countDocuments({ userId: uid }),
    ]);
    res.json({ reviews, midterms, uploads, bookmarks });
  }),
);

router.get(
  '/reviews',
  asyncHandler(async (req, res) => {
    const [reviews, midterms] = await Promise.all([
      Review.find({ userId: req.user._id }).populate('courseId', 'code title').lean(),
      MidtermRating.find({ userId: req.user._id }).populate('courseId', 'code title').sort({ createdAt: -1 }).lean(),
    ]);
    reviews.sort((a, b) => semesterIndex(b.semester) - semesterIndex(a.semester) || b.createdAt - a.createdAt);
    res.json({
      reviews: reviews.map((r) => ({
        ...reviewOut({ ...r, courseId: r.courseId._id }, { viewer: req.user, course: r.courseId }),
        flagReason: r.status === 'held' ? r.flagReason : r.status === 'hidden' ? 'A moderator hid this review. It is not public.' : '',
      })),
      midterms: midterms.map((m) => ({
        id: String(m._id),
        course: { id: String(m.courseId._id), code: m.courseId.code, title: m.courseId.title },
        semester: m.semester,
        section: m.section,
        assessment: m.assessment,
        ratings: m.ratings,
        comment: m.comment,
        status: m.status,
        createdAt: m.createdAt,
      })),
    });
  }),
);

router.get(
  '/uploads',
  asyncHandler(async (req, res) => {
    const docs = await Resource.find({ uploaderId: req.user._id }).sort({ createdAt: -1 }).populate('courseId', 'code title').lean();
    res.json({
      resources: docs.map((d) => resourceOut(d, { viewer: req.user })),
      stats: {
        uploads: docs.length,
        helpful: docs.reduce((s, d) => s + d.helpfulCount, 0),
        downloads: docs.reduce((s, d) => s + d.downloadCount, 0),
      },
    });
  }),
);

router.get(
  '/bookmarks',
  asyncHandler(async (req, res) => {
    const marks = await Bookmark.find({ userId: req.user._id }).sort({ createdAt: -1 }).lean();
    const ids = (t) => marks.filter((m) => m.targetType === t).map((m) => m.targetId);
    const [courses, reviews, resources] = await Promise.all([
      Course.find({ _id: { $in: ids('course') } }).lean(),
      Review.find({ _id: { $in: ids('review') }, status: 'published' })
        .populate('courseId', 'code title')
        .lean(),
      Resource.find({ _id: { $in: ids('resource') }, status: 'published' })
        .populate('courseId', 'code title')
        .lean(),
    ]);
    const rf = await viewerFlags(
      req.user,
      'resource',
      resources.map((r) => r._id),
    );
    const vf = await viewerFlags(
      req.user,
      'review',
      reviews.map((r) => r._id),
    );
    res.json({
      courses: courses.map(courseOut),
      reviews: reviews.map((r) => reviewOut({ ...r, courseId: r.courseId._id }, { viewer: req.user, flags: vf, course: r.courseId })),
      resources: resources.map((r) => resourceOut(r, { viewer: req.user, flags: rf })),
    });
  }),
);

// Account settings: name and major. Email and university are fixed by the verified email domain.
router.patch(
  '/',
  validate(z.object({ name: z.string().trim().min(2, 'Enter your full name').max(80), majorId: z.string().regex(/^[a-f\d]{24}$/i) })),
  asyncHandler(async (req, res) => {
    const major = await Major.findOne({ _id: req.body.majorId, universityId: req.user.universityId, archived: false });
    if (!major) throw new HttpError(400, 'Choose a major from your university');
    req.user.name = req.body.name;
    const majorChanged = String(req.user.majorId) !== String(major._id);
    req.user.majorId = major._id;
    await req.user.save();
    // New posts use the new major; existing reviews keep the label they were posted with.
    const university = await University.findById(req.user.universityId, { name: 1, shortName: 1 }).lean();
    res.json({ user: { ...req.user.toPublic(), university, major: { _id: major._id, name: major.name, code: major.code } }, majorChanged });
  }),
);

router.post(
  '/password',
  validate(
    z
      .object({
        currentPassword: z.string().min(1, 'Enter your current password'),
        newPassword: passwordSchema,
        confirmPassword: z.string(),
      })
      .refine((b) => b.newPassword === b.confirmPassword, { message: 'Passwords do not match', path: ['confirmPassword'] }),
  ),
  asyncHandler(async (req, res) => {
    const user = await User.findById(req.user._id).select('+passwordHash');
    if (!(await bcrypt.compare(req.body.currentPassword, user.passwordHash))) {
      throw new HttpError(400, 'Your current password is incorrect', [{ path: 'currentPassword', message: 'Incorrect password' }]);
    }
    user.passwordHash = await bcrypt.hash(req.body.newPassword, BCRYPT_ROUNDS);
    user.tokenVersion = (user.tokenVersion || 0) + 1; // sign out other devices
    await user.save();
    res.json({ ok: true });
  }),
);

// Delete account: bookmarks and votes go; reviews and uploads stay, still anonymous.
router.delete(
  '/',
  validate(z.object({ password: z.string().min(1, 'Enter your password to confirm') })),
  asyncHandler(async (req, res) => {
    const user = await User.findById(req.user._id).select('+passwordHash');
    if (!(await bcrypt.compare(req.body.password, user.passwordHash))) throw new HttpError(400, 'Incorrect password');
    const uid = user._id;
    const votes = await Vote.find({ userId: uid }).lean();
    await Promise.all([
      Bookmark.deleteMany({ userId: uid }),
      Vote.deleteMany({ userId: uid }),
      Review.updateMany({ userId: uid }, { userId: null }),
      MidtermRating.updateMany({ userId: uid }, { userId: null }),
      Resource.updateMany({ uploaderId: uid }, { uploaderId: null }),
    ]);
    for (const v of votes) {
      const Model = v.targetType === 'review' ? Review : Resource;
      await Model.updateOne({ _id: v.targetId }, { $inc: { helpfulCount: -1 } });
    }
    await User.deleteOne({ _id: uid });
    clearSessionCookies(res);
    res.json({ ok: true });
  }),
);

module.exports = router;
module.exports.authorLabelFor = authorLabelFor;
