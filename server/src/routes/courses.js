const express = require('express');
const { z } = require('zod');
const mongoose = require('mongoose');
const { Course, University, Major, Review, MidtermRating, Resource, Bookmark, Vote } = require('../models');
const { validate } = require('../middleware/validate');
const { requireAuth, isOwner } = require('../middleware/auth');
const { postLimiter } = require('../middleware/rateLimits');
const { asyncHandler, notFound, HttpError, forbidden } = require('../utils/http');
const { reviewOut, resourceOut, courseOut } = require('../services/serializers');
const { viewerFlags } = require('../services/viewer');
const { recalculateCourse, midtermSummary, combosFor } = require('../services/ratings');
const { checkText } = require('../services/contentCheck');
const { autoReport, closeReportsFor } = require('../services/moderation');
const { isValidSemester, termOf, recentSemesters, semesterIndex } = require('../utils/semesters');
const { authorLabelFor } = require('../utils/labels');

const router = express.Router();
const objectId = z.string().regex(/^[a-f\d]{24}$/i, 'Invalid id');
const rating = z.coerce.number().int('Ratings must be whole numbers from 1 to 5').min(1).max(5);
const semester = z.string().refine((s) => isValidSemester(s), 'Choose a valid semester');

async function loadCourse(id) {
  if (!mongoose.isValidObjectId(id)) throw notFound('Course');
  const course = await Course.findById(id).lean();
  if (!course) throw notFound('Course');
  return course;
}

async function courseCodeMap(reviews) {
  const ids = new Set();
  for (const r of reviews)
    for (const k of ['takeBefore', 'takeTogether', 'avoidTogether']) for (const id of r.recommendations?.[k] || []) ids.add(String(id));
  const courses = await Course.find({ _id: { $in: [...ids] } }, { code: 1, title: 1 }).lean();
  return new Map(courses.map((c) => [String(c._id), c]));
}

async function authorLabel(user) {
  const major = user.majorId ? await Major.findById(user.majorId, { name: 1 }).lean() : null;
  return authorLabelFor(major?.name);
}

/** Final ratings open near the end of term (week 15); mid-term ratings are open all term. */
function finalOpen(sem, now = new Date()) {
  const current = termOf(now);
  if (semesterIndex(sem) < semesterIndex(current)) return true;
  const m = now.getMonth();
  const d = now.getDate();
  const term = current.split(' ')[0];
  if (term === 'Fall') return m === 11 && d >= 1;
  if (term === 'Spring') return m === 4;
  return m === 7;
}

// UC-04: course page
router.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const course = await loadCourse(req.params.id);
    const university = await University.findById(course.universityId, { name: 1, shortName: 1 }).lean();
    const majors = await Major.find({ _id: { $in: course.majorIds } }, { name: 1, code: 1 }).lean();
    let major = majors[0] || null;
    if (req.user?.majorId) major = majors.find((m) => String(m._id) === String(req.user.majorId)) || major;

    const current = termOf();
    let pulse = await midtermSummary(course._id, current, 'midterm');
    let pulseSemester = current;
    if (!pulse.count) {
      const latest = await MidtermRating.findOne({ courseId: course._id, status: 'published', assessment: 'midterm' })
        .sort({ createdAt: -1 })
        .lean();
      if (latest) {
        pulseSemester = latest.semester;
        pulse = await midtermSummary(course._id, latest.semester, 'midterm');
      }
    }

    const [combos, topResources, topReviewDoc] = await Promise.all([
      combosFor(course._id),
      Resource.find({ courseId: course._id, status: 'published' }).sort({ helpfulCount: -1, createdAt: -1 }).limit(2).lean(),
      Review.findOne({ courseId: course._id, status: 'published' }).sort({ helpfulCount: -1, createdAt: -1 }).lean(),
    ]);

    let viewer = null;
    let topReview = null;
    if (topReviewDoc) {
      const flags = await viewerFlags(req.user, 'review', [topReviewDoc._id]);
      topReview = reviewOut(topReviewDoc, { viewer: req.user, flags, courseCodes: await courseCodeMap([topReviewDoc]) });
    }
    if (req.user) {
      const [bm, mine] = await Promise.all([
        Bookmark.exists({ userId: req.user._id, targetType: 'course', targetId: course._id }),
        Review.findOne({ userId: req.user._id, courseId: course._id }, { _id: 1, semester: 1 }).sort({ createdAt: -1 }).lean(),
      ]);
      viewer = {
        bookmarked: !!bm,
        myReview: mine ? { id: String(mine._id), semester: mine.semester } : null,
        canPost: String(req.user.universityId) === String(course.universityId),
      };
    }

    res.json({
      course: courseOut(course),
      university: { id: String(university._id), name: university.name, shortName: university.shortName },
      major: major ? { id: String(major._id), name: major.name, code: major.code } : null,
      midterm: { semester: pulseSemester, ...pulse },
      combos: {
        reviewCount: combos.reviewCount,
        takeBefore: combos.takeBefore.slice(0, 3),
        takeTogether: combos.takeTogether.slice(0, 3),
        avoidTogether: combos.avoidTogether.slice(0, 3),
      },
      topResources: topResources.map((r) => resourceOut(r)),
      topReview,
      viewer,
    });
  }),
);

// UC-04/FR-09: reviews of a course, filterable and sortable
router.get(
  '/:id/reviews',
  validate(
    z.object({
      semester: z.string().max(20).optional(),
      stars: z.coerce.number().int().min(1).max(5).optional(),
      sort: z.enum(['helpful', 'newest', 'highest', 'lowest']).optional(),
      q: z.string().max(80).optional(),
      page: z.coerce.number().int().min(1).max(500).optional(),
      limit: z.coerce.number().int().min(1).max(20).optional(),
    }),
    'query',
  ),
  asyncHandler(async (req, res) => {
    const course = await loadCourse(req.params.id);
    const { semester: sem, stars, sort = 'helpful', q, page = 1, limit = 3 } = req.validQuery;
    const filter = { courseId: course._id, status: 'published' };
    if (sem && sem !== 'all') filter.semester = sem;
    if (stars) filter['ratings.overall'] = stars;
    if (q) filter.$text = { $search: q };
    const order = {
      helpful: { helpfulCount: -1, createdAt: -1 },
      newest: { createdAt: -1 },
      highest: { 'ratings.overall': -1, createdAt: -1 },
      lowest: { 'ratings.overall': 1, createdAt: -1 },
    }[sort];
    const [total, docs, semesters] = await Promise.all([
      Review.countDocuments(filter),
      Review.find(filter)
        .sort(order)
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      Review.distinct('semester', { courseId: course._id, status: 'published' }),
    ]);
    const flags = await viewerFlags(
      req.user,
      'review',
      docs.map((d) => d._id),
    );
    const courseCodes = await courseCodeMap(docs);
    semesters.sort((a, b) => semesterIndex(b) - semesterIndex(a));
    res.json({
      reviews: docs.map((d) => reviewOut(d, { viewer: req.user, flags, courseCodes })),
      total,
      page,
      pages: Math.max(1, Math.ceil(total / limit)),
      semesters,
      summary: course.ratingSummary,
    });
  }),
);

const recommendationList = z.array(objectId).max(5).default([]);
const reviewBody = z
  .object({
    semester,
    ratings: z.object({ difficulty: rating, workload: rating, usefulness: rating, fairness: rating, overall: rating }),
    text: z.string().trim().max(2000, 'Reviews can be up to 2000 characters').default(''),
    recommendations: z
      .object({ takeBefore: recommendationList, takeTogether: recommendationList, avoidTogether: recommendationList })
      .default({ takeBefore: [], takeTogether: [], avoidTogether: [] }),
  })
  .refine((b) => !b.recommendations.takeTogether.some((id) => b.recommendations.avoidTogether.includes(id)), {
    message: 'A course cannot be both "pairs well" and "avoid together"',
    path: ['recommendations'],
  });

async function cleanRecommendations(course, recs) {
  const all = [...new Set([...recs.takeBefore, ...recs.takeTogether, ...recs.avoidTogether])].filter((id) => id !== String(course._id));
  const valid = await Course.find({ _id: { $in: all }, universityId: course.universityId }, { _id: 1 }).lean();
  const ok = new Set(valid.map((c) => String(c._id)));
  const pick = (list) => [...new Set(list)].filter((id) => ok.has(id));
  return { takeBefore: pick(recs.takeBefore), takeTogether: pick(recs.takeTogether), avoidTogether: pick(recs.avoidTogether) };
}

function assertSameUniversity(user, course) {
  if (String(user.universityId) !== String(course.universityId)) {
    throw forbidden('You can only rate courses at your own university');
  }
}

// UC-05 / FR-05 / FR-07: post an end-of-course review
router.post(
  '/:id/reviews',
  requireAuth,
  postLimiter,
  validate(reviewBody),
  asyncHandler(async (req, res) => {
    const course = await loadCourse(req.params.id);
    if (course.status !== 'active') throw new HttpError(400, 'This course is archived');
    assertSameUniversity(req.user, course);
    const exists = await Review.exists({ userId: req.user._id, courseId: course._id, semester: req.body.semester });
    if (exists) {
      throw new HttpError(409, `You already reviewed this course for ${req.body.semester}. Edit it from My reviews.`);
    }
    const check = checkText(req.body.text);
    const review = await Review.create({
      courseId: course._id,
      universityId: course.universityId,
      userId: req.user._id,
      authorLabel: await authorLabel(req.user),
      semester: req.body.semester,
      ratings: req.body.ratings,
      text: req.body.text,
      recommendations: await cleanRecommendations(course, req.body.recommendations),
      status: check.flagged ? 'held' : 'published',
      flagReason: check.flagged ? check.message : '',
    });
    if (check.flagged) await autoReport({ targetType: 'review', target: review, reason: check.reason });
    await recalculateCourse(course._id);
    res.status(201).json({ review: reviewOut(review.toObject(), { viewer: req.user }), held: check.flagged, message: check.message });
  }),
);

// Mid-semester ratings tab (3.3)
router.get(
  '/:id/midterms',
  validate(
    z.object({
      semester: z.string().max(20).optional(),
      section: z.string().max(20).optional(),
      page: z.coerce.number().int().min(1).max(100).optional(),
    }),
    'query',
  ),
  asyncHandler(async (req, res) => {
    const course = await loadCourse(req.params.id);
    const sem = req.validQuery.semester || termOf();
    const section = req.validQuery.section && req.validQuery.section !== 'all' ? req.validQuery.section : undefined;
    const page = req.validQuery.page || 1;
    const [midterm, final, sections, semesters] = await Promise.all([
      midtermSummary(course._id, sem, 'midterm', section),
      midtermSummary(course._id, sem, 'final', section),
      MidtermRating.distinct('section', { courseId: course._id, semester: sem, status: 'published' }),
      MidtermRating.distinct('semester', { courseId: course._id, status: 'published' }),
    ]);
    const filter = { courseId: course._id, semester: sem, status: 'published', comment: { $ne: '' } };
    if (section) filter.section = section;
    const comments = await MidtermRating.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * 10)
      .limit(10)
      .lean();
    if (!semesters.includes(termOf())) semesters.push(termOf());
    semesters.sort((a, b) => semesterIndex(b) - semesterIndex(a));
    res.json({
      semester: sem,
      current: termOf(),
      semesters,
      sections: sections.sort(),
      midterm,
      final: { ...final, open: finalOpen(sem) },
      comments: comments.map((c) => ({
        id: String(c._id),
        section: c.section,
        assessment: c.assessment,
        comment: c.comment,
        createdAt: c.createdAt,
      })),
    });
  }),
);

const midtermBody = z.object({
  assessment: z.enum(['midterm', 'final']),
  semester,
  section: z
    .string()
    .trim()
    .regex(/^Section \d{2}$/, 'Choose your section'),
  ratings: z.object({ pace: rating, workload: rating, clarity: rating, fairness: rating }),
  comment: z.string().trim().max(300, 'Comments can be up to 300 characters').default(''),
});

// UC-06 / FR-06: rate the mid-term or final
router.post(
  '/:id/midterms',
  requireAuth,
  postLimiter,
  validate(midtermBody),
  asyncHandler(async (req, res) => {
    const course = await loadCourse(req.params.id);
    assertSameUniversity(req.user, course);
    if (req.body.semester !== termOf()) throw new HttpError(400, 'Mid-semester ratings are only for the current semester');
    if (req.body.assessment === 'final' && !finalOpen(req.body.semester)) {
      throw new HttpError(400, 'Final ratings open after final exams (week 15)');
    }
    const check = checkText(req.body.comment);
    try {
      const doc = await MidtermRating.create({
        ...req.body,
        courseId: course._id,
        universityId: course.universityId,
        userId: req.user._id,
        authorLabel: await authorLabel(req.user),
        status: check.flagged ? 'held' : 'published',
        flagReason: check.flagged ? check.message : '',
      });
      if (check.flagged) await autoReport({ targetType: 'midterm', target: doc, reason: check.reason });
      res.status(201).json({ id: String(doc._id), held: check.flagged, message: check.message });
    } catch (e) {
      if (e.code === 11000) {
        throw new HttpError(409, `You already rated the ${req.body.assessment === 'final' ? 'final' : 'mid-term'} for this section`);
      }
      throw e;
    }
  }),
);

// Course combos tab (3.4)
router.get(
  '/:id/combos',
  asyncHandler(async (req, res) => {
    const course = await loadCourse(req.params.id);
    res.json(await combosFor(course._id));
  }),
);

/* ---------- Edit / delete own reviews and mid-term ratings (FR-13) ---------- */
const reviews = express.Router();

reviews.get(
  '/:id',
  requireAuth,
  asyncHandler(async (req, res) => {
    const r = await Review.findById(req.params.id).lean();
    if (!r) throw notFound('Review');
    if (!isOwner(req.user, r.userId)) throw forbidden();
    const course = await Course.findById(r.courseId, { code: 1, title: 1 }).lean();
    res.json({ review: reviewOut(r, { viewer: req.user, courseCodes: await courseCodeMap([r]), course }) });
  }),
);

reviews.patch(
  '/:id',
  requireAuth,
  validate(reviewBody),
  asyncHandler(async (req, res) => {
    const review = await Review.findById(req.params.id);
    if (!review) throw notFound('Review');
    if (!isOwner(req.user, review.userId)) throw forbidden('You can only edit your own reviews');
    const course = await Course.findById(review.courseId).lean();
    if (req.body.semester !== review.semester) {
      const clash = await Review.exists({
        userId: req.user._id,
        courseId: course._id,
        semester: req.body.semester,
        _id: { $ne: review._id },
      });
      if (clash) throw new HttpError(409, `You already reviewed this course for ${req.body.semester}`);
    }
    const check = checkText(req.body.text);
    Object.assign(review, {
      semester: req.body.semester,
      ratings: req.body.ratings,
      text: req.body.text,
      recommendations: await cleanRecommendations(course, req.body.recommendations),
    });
    if (review.status !== 'hidden') {
      review.status = check.flagged ? 'held' : 'published';
      review.flagReason = check.flagged ? check.message : '';
    }
    await review.save();
    if (check.flagged) await autoReport({ targetType: 'review', target: review, reason: check.reason });
    await recalculateCourse(course._id);
    res.json({ review: reviewOut(review.toObject(), { viewer: req.user }), held: check.flagged, message: check.message });
  }),
);

reviews.delete(
  '/:id',
  requireAuth,
  asyncHandler(async (req, res) => {
    const review = await Review.findById(req.params.id);
    if (!review) throw notFound('Review');
    if (!isOwner(req.user, review.userId)) throw forbidden('You can only delete your own reviews');
    await Promise.all([
      Review.deleteOne({ _id: review._id }),
      Vote.deleteMany({ targetType: 'review', targetId: review._id }),
      Bookmark.deleteMany({ targetType: 'review', targetId: review._id }),
      closeReportsFor('review', review._id),
    ]);
    await recalculateCourse(review.courseId);
    res.json({ ok: true });
  }),
);

const midterms = express.Router();

midterms.patch(
  '/:id',
  requireAuth,
  validate(midtermBody.pick({ ratings: true, comment: true })),
  asyncHandler(async (req, res) => {
    const doc = await MidtermRating.findById(req.params.id);
    if (!doc) throw notFound('Rating');
    if (!isOwner(req.user, doc.userId)) throw forbidden('You can only edit your own ratings');
    const check = checkText(req.body.comment);
    doc.ratings = req.body.ratings;
    doc.comment = req.body.comment;
    if (doc.status !== 'hidden') doc.status = check.flagged ? 'held' : 'published';
    await doc.save();
    if (check.flagged) await autoReport({ targetType: 'midterm', target: doc, reason: check.reason });
    res.json({ ok: true, held: check.flagged });
  }),
);

midterms.delete(
  '/:id',
  requireAuth,
  asyncHandler(async (req, res) => {
    const doc = await MidtermRating.findById(req.params.id);
    if (!doc) throw notFound('Rating');
    if (!isOwner(req.user, doc.userId)) throw forbidden('You can only delete your own ratings');
    await MidtermRating.deleteOne({ _id: doc._id });
    await closeReportsFor('midterm', doc._id);
    res.json({ ok: true });
  }),
);

// Semester choices for forms
const meta = express.Router();
meta.get('/semesters', (_req, res) => res.json({ current: termOf(), semesters: recentSemesters(9) }));

module.exports = { courses: router, reviews, midterms, meta, finalOpen };
