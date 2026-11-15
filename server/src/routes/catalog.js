const express = require('express');
const { z } = require('zod');
const { University, Major, Course, Review, MidtermRating, CourseSuggestion, UniversitySuggestion } = require('../models');
const { combosFor } = require('../services/ratings');
const { termOf } = require('../utils/semesters');
const { validate } = require('../middleware/validate');
const { requireAuth } = require('../middleware/auth');
const { postLimiter } = require('../middleware/rateLimits');
const { asyncHandler, notFound, HttpError } = require('../utils/http');
const { courseOut } = require('../services/serializers');
const { escapeRegex } = require('../utils/labels');

const router = express.Router();
const objectId = z.string().regex(/^[a-f\d]{24}$/i, 'Invalid id');

async function universityStats(ids) {
  const [majors, courses, reviews] = await Promise.all([
    Major.aggregate([{ $match: { universityId: { $in: ids }, archived: false } }, { $group: { _id: '$universityId', n: { $sum: 1 } } }]),
    Course.aggregate([{ $match: { universityId: { $in: ids }, status: 'active' } }, { $group: { _id: '$universityId', n: { $sum: 1 } } }]),
    Review.aggregate([
      { $match: { universityId: { $in: ids }, status: 'published' } },
      { $group: { _id: '$universityId', n: { $sum: 1 } } },
    ]),
  ]);
  const toMap = (rows) => new Map(rows.map((r) => [String(r._id), r.n]));
  return { majors: toMap(majors), courses: toMap(courses), reviews: toMap(reviews) };
}

// FR-03: list universities
router.get(
  '/universities',
  validate(z.object({ q: z.string().max(80).optional() }), 'query'),
  asyncHandler(async (req, res) => {
    const filter = { status: { $ne: 'archived' } };
    if (req.validQuery.q) filter.name = new RegExp(escapeRegex(req.validQuery.q), 'i');
    const unis = await University.find(filter).sort({ status: 1, name: 1 }).lean();
    const stats = await universityStats(unis.map((u) => u._id));
    res.json({
      universities: unis.map((u) => ({
        id: String(u._id),
        name: u.name,
        shortName: u.shortName,
        location: u.location,
        status: u.status,
        majorCount: stats.majors.get(String(u._id)) || 0,
        courseCount: stats.courses.get(String(u._id)) || 0,
        reviewCount: stats.reviews.get(String(u._id)) || 0,
        notifying: !!req.user && (u.notifyUserIds || []).some((id) => String(id) === String(req.user._id)),
      })),
    });
  }),
);

router.get(
  '/universities/:id',
  asyncHandler(async (req, res) => {
    const u = await University.findById(req.params.id).lean();
    if (!u || u.status === 'archived') throw notFound('University');
    const stats = await universityStats([u._id]);
    res.json({
      university: {
        id: String(u._id),
        name: u.name,
        shortName: u.shortName,
        location: u.location,
        status: u.status,
        majorCount: stats.majors.get(String(u._id)) || 0,
        courseCount: stats.courses.get(String(u._id)) || 0,
        reviewCount: stats.reviews.get(String(u._id)) || 0,
      },
    });
  }),
);

router.post(
  '/universities/:id/notify',
  requireAuth,
  asyncHandler(async (req, res) => {
    const u = await University.findByIdAndUpdate(req.params.id, { $addToSet: { notifyUserIds: req.user._id } });
    if (!u) throw notFound('University');
    res.json({ ok: true });
  }),
);

router.post(
  '/suggestions/university',
  requireAuth,
  postLimiter,
  validate(z.object({ name: z.string().trim().min(3, 'Enter the university name').max(120) })),
  asyncHandler(async (req, res) => {
    await UniversitySuggestion.create({ name: req.body.name, userId: req.user._id });
    res.status(201).json({ ok: true });
  }),
);

// FR-03: majors of a university, with course and review counts
router.get(
  '/universities/:id/majors',
  validate(z.object({ q: z.string().max(80).optional(), sort: z.enum(['reviews', 'name', 'courses']).optional() }), 'query'),
  asyncHandler(async (req, res) => {
    const university = await University.findById(req.params.id).lean();
    if (!university) throw notFound('University');
    const filter = { universityId: university._id, archived: false };
    if (req.validQuery.q) {
      const re = new RegExp(escapeRegex(req.validQuery.q), 'i');
      filter.$or = [{ name: re }, { code: re }];
    }
    const majors = await Major.find(filter).lean();
    const counts = await Course.aggregate([
      { $match: { universityId: university._id, status: 'active' } },
      { $unwind: '$majorIds' },
      { $group: { _id: '$majorIds', courses: { $sum: 1 }, reviews: { $sum: '$ratingSummary.count' } } },
    ]);
    const byId = new Map(counts.map((c) => [String(c._id), c]));
    const list = majors.map((m) => ({
      id: String(m._id),
      name: m.name,
      code: m.code,
      courseCount: byId.get(String(m._id))?.courses || 0,
      reviewCount: byId.get(String(m._id))?.reviews || 0,
    }));
    const sort = req.validQuery.sort || 'reviews';
    list.sort((a, b) =>
      sort === 'name' ? a.name.localeCompare(b.name) : sort === 'courses' ? b.courseCount - a.courseCount : b.reviewCount - a.reviewCount,
    );
    res.json({ majors: list });
  }),
);

// All active courses of a university (or one major), for form and filter dropdowns
router.get(
  '/universities/:id/courses',
  validate(z.object({ majorId: objectId.optional() }), 'query'),
  asyncHandler(async (req, res) => {
    const filter = { universityId: req.params.id, status: 'active' };
    if (req.validQuery.majorId) filter.majorIds = req.validQuery.majorId;
    const courses = await Course.find(filter, { code: 1, title: 1, majorIds: 1 }).sort({ code: 1 }).lean();
    res.json({ courses: courses.map((c) => ({ id: String(c._id), code: c.code, title: c.title, majorIds: c.majorIds.map(String) })) });
  }),
);

router.get(
  '/majors/:id',
  asyncHandler(async (req, res) => {
    const major = await Major.findById(req.params.id).lean();
    if (!major) throw notFound('Major');
    const university = await University.findById(major.universityId, { name: 1, shortName: 1 }).lean();
    res.json({
      major: { id: String(major._id), name: major.name, code: major.code },
      university: { id: String(university._id), name: university.name, shortName: university.shortName },
    });
  }),
);

const SORTS = {
  code: { code: 1 },
  rating: { 'ratingSummary.averages.overall': -1, code: 1 },
  reviews: { 'ratingSummary.count': -1, code: 1 },
  difficulty: { 'ratingSummary.averages.difficulty': 1, code: 1 },
};

// Courses of a major (2.4)
router.get(
  '/majors/:id/courses',
  validate(
    z.object({
      q: z.string().max(80).optional(),
      level: z.enum(['100', '200', '300', '400', 'all']).optional(),
      sort: z.enum(['code', 'rating', 'reviews', 'difficulty']).optional(),
      page: z.coerce.number().int().min(1).max(500).optional(),
      limit: z.coerce.number().int().min(1).max(50).optional(),
    }),
    'query',
  ),
  asyncHandler(async (req, res) => {
    const { q, level, sort = 'code', page = 1, limit = 6 } = req.validQuery;
    const major = await Major.findById(req.params.id).lean();
    if (!major) throw notFound('Major');
    const filter = { majorIds: major._id, status: 'active' };
    if (q) {
      const re = new RegExp(escapeRegex(q), 'i');
      filter.$or = [{ code: re }, { title: re }];
    }
    if (level && level !== 'all') filter.level = Number(level);
    const [total, courses] = await Promise.all([
      Course.countDocuments(filter),
      Course.find(filter)
        .sort(SORTS[sort])
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
    ]);
    res.json({ courses: courses.map(courseOut), total, page, pages: Math.max(1, Math.ceil(total / limit)) });
  }),
);

// Most reviewed courses at a university (home page)
router.get(
  '/courses/top',
  validate(z.object({ universityId: objectId.optional(), limit: z.coerce.number().int().min(1).max(12).optional() }), 'query'),
  asyncHandler(async (req, res) => {
    let { universityId } = req.validQuery;
    if (!universityId) universityId = (await University.findOne({ status: 'active' }).sort({ createdAt: 1 }).lean())?._id;
    const university = universityId ? await University.findById(universityId, { name: 1, shortName: 1 }).lean() : null;
    const courses = university
      ? await Course.find({ universityId: university._id, status: 'active' })
          .sort({ 'ratingSummary.count': -1, code: 1 })
          .limit(req.validQuery.limit || 4)
          .lean()
      : [];
    // Featured on the home page: the course with the most mid-semester ratings this term.
    let featured = null;
    if (university) {
      const [top] = await MidtermRating.aggregate([
        { $match: { universityId: university._id, semester: termOf(), status: 'published' } },
        { $group: { _id: '$courseId', n: { $sum: 1 } } },
        { $sort: { n: -1 } },
        { $limit: 1 },
      ]);
      const course = top ? await Course.findById(top._id).lean() : courses[0];
      if (course) {
        const combos = await combosFor(course._id);
        featured = { ...courseOut(course), takeBefore: combos.takeBefore[0] || null, avoidTogether: combos.avoidTogether[0] || null };
      }
    }
    res.json({ university, courses: courses.map(courseOut), featured });
  }),
);

// Course code autocomplete, used by the "Help others plan" inputs and admin forms
router.get(
  '/courses/lookup',
  validate(z.object({ universityId: objectId, q: z.string().max(40).default('') }), 'query'),
  asyncHandler(async (req, res) => {
    const re = new RegExp(escapeRegex(req.validQuery.q.replace(/\s+/g, ' ')), 'i');
    const courses = await Course.find({ universityId: req.validQuery.universityId, status: 'active', $or: [{ code: re }, { title: re }] })
      .sort({ code: 1 })
      .limit(8)
      .lean();
    res.json({ courses: courses.map((c) => ({ id: String(c._id), code: c.code, title: c.title })) });
  }),
);

// Students suggest a missing course (FR-12 approval flow)
router.post(
  '/suggestions/course',
  requireAuth,
  postLimiter,
  validate(
    z.object({
      majorId: objectId,
      code: z
        .string()
        .trim()
        .toUpperCase()
        .regex(/^[A-Z]{2,5} ?\d{3}[A-Z]?$/, 'Use a code like COSC 499'),
      title: z.string().trim().min(3, 'Enter the course title').max(120),
      credits: z.coerce.number().int().min(0).max(12).default(3),
    }),
  ),
  asyncHandler(async (req, res) => {
    const major = await Major.findById(req.body.majorId).lean();
    if (!major) throw notFound('Major');
    const code = req.body.code.replace(/^([A-Z]+)\s?(\d)/, '$1 $2');
    if (await Course.exists({ universityId: major.universityId, code })) {
      throw new HttpError(409, `${code} is already in the catalog`);
    }
    const existing = await CourseSuggestion.findOneAndUpdate(
      { universityId: major.universityId, code, status: 'pending' },
      { $addToSet: { requestedBy: req.user._id } },
      { new: true },
    );
    if (!existing) {
      await CourseSuggestion.create({
        universityId: major.universityId,
        majorId: major._id,
        code,
        title: req.body.title,
        credits: req.body.credits,
        requestedBy: [req.user._id],
      });
    }
    res.status(201).json({ ok: true });
  }),
);

module.exports = router;
