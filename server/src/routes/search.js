const express = require('express');
const { z } = require('zod');
const { Course, Resource, University } = require('../models');
const { validate } = require('../middleware/validate');
const { asyncHandler } = require('../utils/http');
const { escapeRegex } = require('../utils/labels');

const router = express.Router();

// Header search: course codes/titles and resources
router.get(
  '/',
  validate(z.object({ q: z.string().trim().min(1).max(80) }), 'query'),
  asyncHandler(async (req, res) => {
    const raw = req.validQuery.q;
    const re = new RegExp(escapeRegex(raw).replace(/\\? /g, '\\s*'), 'i');
    const [courses, resources] = await Promise.all([
      Course.find({ status: 'active', $or: [{ code: re }, { title: re }] })
        .sort({ 'ratingSummary.count': -1 })
        .limit(5)
        .lean(),
      Resource.find({ status: 'published', $or: [{ title: re }, { tags: raw.toLowerCase() }] })
        .sort({ helpfulCount: -1 })
        .limit(5)
        .populate('courseId', 'code')
        .lean(),
    ]);
    const unis = await University.find({ _id: { $in: courses.map((c) => c.universityId) } }, { shortName: 1 }).lean();
    const uni = new Map(unis.map((u) => [String(u._id), u.shortName]));
    res.json({
      courses: courses.map((c) => ({
        id: String(c._id),
        code: c.code,
        title: c.title,
        university: uni.get(String(c.universityId)),
        rating: c.ratingSummary.averages.overall,
      })),
      resources: resources.map((r) => ({ id: String(r._id), title: r.title, course: r.courseId?.code, type: r.type })),
    });
  }),
);

module.exports = router;
