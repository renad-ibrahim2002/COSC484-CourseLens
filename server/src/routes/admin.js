const express = require('express');
const { z } = require('zod');
const { University, Major, Course, CourseSuggestion, User, Review, Resource, Report, AuditLog } = require('../models');
const { validate } = require('../middleware/validate');
const { requireAuth, requireRole } = require('../middleware/auth');
const { asyncHandler, notFound, HttpError } = require('../utils/http');
const { audit } = require('../services/audit');
const { courseOut } = require('../services/serializers');
const { escapeRegex } = require('../utils/labels');

const router = express.Router();
router.use(requireAuth, requireRole('admin'));

const objectId = z.string().regex(/^[a-f\d]{24}$/i, 'Invalid id');
const courseCode = z
  .string()
  .trim()
  .toUpperCase()
  .regex(/^[A-Z]{2,5} ?\d{3}[A-Z]?$/, 'Use a code like COSC 499')
  .transform((c) => c.replace(/^([A-Z]+)\s?(\d)/, '$1 $2'));

/* ---------------- Universities & majors ---------------- */
router.get(
  '/universities',
  asyncHandler(async (_req, res) => {
    const unis = await University.find().sort({ name: 1 }).lean();
    const majors = await Major.find().sort({ name: 1 }).lean();
    res.json({
      universities: unis.map((u) => ({
        id: String(u._id),
        name: u.name,
        shortName: u.shortName,
        location: u.location,
        status: u.status,
        emailDomains: u.emailDomains,
        majors: majors
          .filter((m) => String(m.universityId) === String(u._id))
          .map((m) => ({ id: String(m._id), name: m.name, code: m.code, archived: m.archived })),
      })),
    });
  }),
);

const uniBody = z.object({
  name: z.string().trim().min(3).max(120),
  shortName: z.string().trim().min(2).max(12),
  location: z.string().trim().max(80).default('Bahrain'),
  emailDomains: z
    .array(
      z
        .string()
        .trim()
        .toLowerCase()
        .regex(/^[a-z0-9.-]+\.[a-z]{2,}$/, 'Enter a domain like aubh.edu.bh'),
    )
    .max(5)
    .default([]),
  status: z.enum(['active', 'coming_soon', 'archived']).default('coming_soon'),
});

router.post(
  '/universities',
  validate(uniBody),
  asyncHandler(async (req, res) => {
    const u = await University.create(req.body);
    await audit(req.user, {
      action: 'university_added',
      targetType: 'university',
      targetId: u._id,
      targetLabel: u.name,
      detail: 'Added university',
    });
    res.status(201).json({ id: String(u._id) });
  }),
);

router.patch(
  '/universities/:id',
  validate(uniBody.partial()),
  asyncHandler(async (req, res) => {
    const u = await University.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!u) throw notFound('University');
    await audit(req.user, {
      action: 'university_updated',
      targetType: 'university',
      targetId: u._id,
      targetLabel: u.name,
      detail: 'Updated university',
    });
    res.json({ ok: true });
  }),
);

router.post(
  '/majors',
  validate(
    z.object({
      universityId: objectId,
      name: z.string().trim().min(2).max(80),
      code: z
        .string()
        .trim()
        .toUpperCase()
        .regex(/^[A-Z]{2,6}$/, 'Use a short code like COSC'),
    }),
  ),
  asyncHandler(async (req, res) => {
    if (!(await University.exists({ _id: req.body.universityId }))) throw notFound('University');
    const m = await Major.create(req.body);
    await audit(req.user, {
      action: 'major_added',
      targetType: 'major',
      targetId: m._id,
      targetLabel: m.name,
      detail: 'Added major',
      universityId: m.universityId,
    });
    res.status(201).json({ id: String(m._id) });
  }),
);

router.patch(
  '/majors/:id',
  validate(z.object({ name: z.string().trim().min(2).max(80).optional(), archived: z.boolean().optional() })),
  asyncHandler(async (req, res) => {
    const m = await Major.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!m) throw notFound('Major');
    await audit(req.user, {
      action: m.archived ? 'major_archived' : 'major_updated',
      targetType: 'major',
      targetId: m._id,
      targetLabel: m.name,
      detail: m.archived ? 'Archived major' : 'Updated major',
      universityId: m.universityId,
    });
    res.json({ ok: true });
  }),
);

/* ---------------- Courses (FR-12) ---------------- */
router.get(
  '/courses',
  validate(z.object({ universityId: objectId, majorId: objectId.optional(), q: z.string().max(60).optional() }), 'query'),
  asyncHandler(async (req, res) => {
    const filter = { universityId: req.validQuery.universityId };
    if (req.validQuery.majorId) filter.majorIds = req.validQuery.majorId;
    if (req.validQuery.q)
      filter.$or = [{ code: new RegExp(escapeRegex(req.validQuery.q), 'i') }, { title: new RegExp(escapeRegex(req.validQuery.q), 'i') }];
    const courses = await Course.find(filter).sort({ status: 1, code: 1 }).lean();
    res.json({ courses: courses.map(courseOut) });
  }),
);

const courseBody = z.object({
  universityId: objectId,
  code: courseCode,
  title: z.string().trim().min(3, 'Enter a title').max(120),
  credits: z.coerce.number().int().min(0).max(30).default(3),
  description: z.string().trim().max(600).default(''),
  majorIds: z.array(objectId).min(1, 'Choose at least one major').max(6),
  visible: z.boolean().default(true),
});

router.post(
  '/courses',
  validate(courseBody),
  asyncHandler(async (req, res) => {
    const { visible, ...data } = req.body;
    const majors = await Major.countDocuments({ _id: { $in: data.majorIds }, universityId: data.universityId });
    if (majors !== data.majorIds.length) throw new HttpError(400, 'Majors must belong to the selected university');
    const c = await Course.create({ ...data, status: visible ? 'active' : 'archived' });
    await audit(req.user, {
      action: 'course_added',
      targetType: 'course',
      targetId: c._id,
      targetLabel: c.code,
      detail: 'Added course',
      universityId: c.universityId,
    });
    res.status(201).json({ course: courseOut(c.toObject()) });
  }),
);

router.patch(
  '/courses/:id',
  validate(
    courseBody
      .omit({ universityId: true, visible: true })
      .partial()
      .extend({ status: z.enum(['active', 'archived']).optional() }),
  ),
  asyncHandler(async (req, res) => {
    const c = await Course.findById(req.params.id);
    if (!c) throw notFound('Course');
    const before = c.status;
    Object.assign(c, req.body);
    await c.save();
    const archived = before !== c.status;
    await audit(req.user, {
      action: archived ? (c.status === 'archived' ? 'course_archived' : 'course_restored') : 'course_updated',
      targetType: 'course',
      targetId: c._id,
      targetLabel: c.code,
      detail: archived ? (c.status === 'archived' ? 'Archived course' : 'Restored course') : 'Updated course',
      universityId: c.universityId,
    });
    res.json({ course: courseOut(c.toObject()) });
  }),
);

/* ---------------- Course suggestions ---------------- */
router.get(
  '/suggestions',
  validate(z.object({ status: z.enum(['pending', 'approved', 'rejected']).default('pending') }), 'query'),
  asyncHandler(async (req, res) => {
    const list = await CourseSuggestion.find({ status: req.validQuery.status })
      .sort({ createdAt: -1 })
      .populate('universityId', 'name')
      .populate('majorId', 'name')
      .lean();
    const counts = await CourseSuggestion.aggregate([{ $group: { _id: '$status', n: { $sum: 1 } } }]);
    res.json({
      suggestions: list.map((s) => ({
        id: String(s._id),
        code: s.code,
        title: s.title,
        credits: s.credits,
        university: s.universityId?.name,
        universityId: String(s.universityId?._id),
        major: s.majorId?.name,
        majorId: String(s.majorId?._id),
        requests: s.requestedBy.length,
        createdAt: s.createdAt,
        status: s.status,
      })),
      counts: Object.fromEntries(['pending', 'approved', 'rejected'].map((k) => [k, counts.find((c) => c._id === k)?.n || 0])),
    });
  }),
);

router.post(
  '/suggestions/:id/approve',
  validate(
    z.object({
      code: courseCode.optional(),
      title: z.string().trim().min(3).max(120).optional(),
      credits: z.coerce.number().int().min(0).max(30).optional(),
    }),
  ),
  asyncHandler(async (req, res) => {
    const s = await CourseSuggestion.findById(req.params.id);
    if (!s || s.status !== 'pending') throw notFound('Suggestion');
    Object.assign(s, req.body);
    const existing = await Course.findOne({ universityId: s.universityId, code: s.code });
    if (existing) {
      await Course.updateOne({ _id: existing._id }, { $addToSet: { majorIds: s.majorId }, status: 'active' });
    } else {
      await Course.create({ universityId: s.universityId, majorIds: [s.majorId], code: s.code, title: s.title, credits: s.credits });
    }
    s.status = 'approved';
    s.handledBy = req.user._id;
    await s.save();
    await audit(req.user, {
      action: 'suggestion_approved',
      targetType: 'course',
      targetLabel: s.code,
      detail: 'Approved course suggestion',
      universityId: s.universityId,
    });
    res.json({ ok: true });
  }),
);

router.post(
  '/suggestions/:id/reject',
  asyncHandler(async (req, res) => {
    const s = await CourseSuggestion.findById(req.params.id);
    if (!s || s.status !== 'pending') throw notFound('Suggestion');
    s.status = 'rejected';
    s.handledBy = req.user._id;
    await s.save();
    await audit(req.user, {
      action: 'suggestion_rejected',
      targetType: 'course',
      targetLabel: s.code,
      detail: 'Rejected course suggestion',
      universityId: s.universityId,
    });
    res.json({ ok: true });
  }),
);

/* ---------------- Users & roles ---------------- */
router.get(
  '/users',
  validate(
    z.object({
      q: z.string().max(80).optional(),
      role: z.enum(['all', 'student', 'moderator', 'admin']).default('all'),
      universityId: z.union([objectId, z.literal('all')]).default('all'),
      page: z.coerce.number().int().min(1).max(500).default(1),
    }),
    'query',
  ),
  asyncHandler(async (req, res) => {
    const { q, role, universityId, page } = req.validQuery;
    const filter = {};
    if (role !== 'all') filter.role = role;
    if (universityId !== 'all') filter.universityId = universityId;
    if (q) filter.$or = [{ name: new RegExp(escapeRegex(q), 'i') }, { email: new RegExp(escapeRegex(q), 'i') }];
    const [total, users] = await Promise.all([
      User.countDocuments(filter),
      User.find(filter)
        .sort({ role: 1, name: 1 })
        .skip((page - 1) * 20)
        .limit(20)
        .populate('universityId', 'shortName')
        .lean(),
    ]);
    res.json({
      total,
      pages: Math.max(1, Math.ceil(total / 20)),
      users: users.map((u) => ({
        id: String(u._id),
        name: u.name,
        email: u.email,
        role: u.role,
        isVerified: u.isVerified,
        university: u.universityId?.shortName || '',
        isSelf: String(u._id) === String(req.user._id),
      })),
    });
  }),
);

router.patch(
  '/users/:id/role',
  validate(z.object({ role: z.enum(['student', 'moderator', 'admin']) })),
  asyncHandler(async (req, res) => {
    if (String(req.params.id) === String(req.user._id)) throw new HttpError(400, 'You cannot change your own role');
    const u = await User.findById(req.params.id);
    if (!u) throw notFound('User');
    if (req.body.role === 'moderator' && !u.universityId) throw new HttpError(400, 'Moderators must belong to a university');
    const before = u.role;
    if (before === req.body.role) return res.json({ ok: true });
    u.role = req.body.role;
    u.tokenVersion = (u.tokenVersion || 0) + 1; // new permissions apply at the next sign-in refresh
    await u.save();
    const cap = (s) => s[0].toUpperCase() + s.slice(1);
    await audit(req.user, {
      action: 'role_changed',
      targetType: 'user',
      targetId: u._id,
      targetLabel: u.name,
      detail: `Changed role: ${cap(before)} → ${cap(u.role)}`,
      universityId: u.universityId,
    });
    return res.json({ ok: true });
  }),
);

/* ---------------- Statistics & audit log ---------------- */
router.get(
  '/stats',
  validate(z.object({ days: z.coerce.number().int().min(1).max(365).default(30) }), 'query'),
  asyncHandler(async (req, res) => {
    const since = new Date(Date.now() - req.validQuery.days * 86400000);
    const dayAgo = new Date(Date.now() - 86400000);
    const weeksAgo = new Date(Date.now() - 8 * 7 * 86400000);
    const [students, newStudents, reviews, newReviews, resources, newResources, openReports, oldReports, perWeek] = await Promise.all([
      User.countDocuments({ isVerified: true }),
      User.countDocuments({ isVerified: true, createdAt: { $gte: since } }),
      Review.countDocuments({ status: 'published' }),
      Review.countDocuments({ status: 'published', createdAt: { $gte: since } }),
      Resource.countDocuments({ status: 'published' }),
      Resource.countDocuments({ status: 'published', createdAt: { $gte: since } }),
      Report.aggregate([{ $match: { status: 'open' } }, { $group: { _id: '$targetId' } }, { $count: 'n' }]),
      Report.aggregate([{ $match: { status: 'open', createdAt: { $lte: dayAgo } } }, { $group: { _id: '$targetId' } }, { $count: 'n' }]),
      Review.aggregate([
        { $match: { createdAt: { $gte: weeksAgo } } },
        { $group: { _id: { $floor: { $divide: [{ $subtract: ['$createdAt', weeksAgo] }, 7 * 86400000] } }, n: { $sum: 1 } } },
      ]),
    ]);
    const weeks = Array.from({ length: 8 }, (_, i) => ({ label: `W${i + 1}`, count: perWeek.find((w) => w._id === i)?.n || 0 }));
    res.json({
      students: { total: students, recent: newStudents },
      reviews: { total: reviews, recent: newReviews },
      resources: { total: resources, recent: newResources },
      openReports: { total: openReports[0]?.n || 0, waiting: oldReports[0]?.n || 0 },
      reviewsPerWeek: weeks,
    });
  }),
);

router.get(
  '/audit',
  validate(z.object({ page: z.coerce.number().int().min(1).max(500).default(1) }), 'query'),
  asyncHandler(async (req, res) => {
    const logs = await AuditLog.find()
      .sort({ createdAt: -1 })
      .skip((req.validQuery.page - 1) * 10)
      .limit(10)
      .lean();
    const total = await AuditLog.estimatedDocumentCount();
    res.json({
      total,
      entries: logs.map((l) => ({
        id: String(l._id),
        at: l.createdAt,
        user: l.actorLabel,
        action: l.detail || l.action,
        target: l.targetLabel,
      })),
    });
  }),
);

module.exports = router;
