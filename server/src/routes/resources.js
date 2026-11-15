const express = require('express');
const fs = require('fs');
const { z } = require('zod');
const mongoose = require('mongoose');
const { Resource, Course, Major, Vote, Bookmark } = require('../models');
const { RESOURCE_TYPES } = require('../models/Resource');
const { validate } = require('../middleware/validate');
const { requireAuth, isOwner } = require('../middleware/auth');
const { postLimiter } = require('../middleware/rateLimits');
const { upload, checkFile } = require('../middleware/upload');
const { asyncHandler, notFound, HttpError, forbidden } = require('../utils/http');
const { resourceOut } = require('../services/serializers');
const { viewerFlags } = require('../services/viewer');
const { recalculateCourse } = require('../services/ratings');
const { checkText } = require('../services/contentCheck');
const { autoReport, closeReportsFor } = require('../services/moderation');
const storage = require('../services/storage');
const { isValidSemester } = require('../utils/semesters');
const { authorLabelFor, escapeRegex } = require('../utils/labels');

const router = express.Router();
const objectId = z.string().regex(/^[a-f\d]{24}$/i, 'Invalid id');
const csv = (inner) =>
  z.preprocess(
    (v) => (v === undefined || v === '' ? undefined : Array.isArray(v) ? v : String(v).split(',')),
    z.array(inner).max(10).optional(),
  );

const FORMAT_GROUPS = { pdf: ['pdf'], docx: ['docx'], image: ['png', 'jpg'], text: [] };

const listQuery = z.object({
  q: z.string().trim().max(100).optional(),
  university: objectId.optional(),
  major: objectId.optional(),
  course: objectId.optional(),
  types: csv(z.enum(RESOURCE_TYPES)),
  semester: z.string().max(20).optional(),
  formats: csv(z.enum(['pdf', 'docx', 'image', 'text'])),
  tags: csv(z.string().trim().toLowerCase().max(30)),
  minRating: z.coerce.number().min(0).max(5).optional(),
  sort: z.enum(['helpful', 'newest']).optional(),
  page: z.coerce.number().int().min(1).max(500).optional(),
  limit: z.coerce.number().int().min(1).max(30).optional(),
});

function buildFilter(q) {
  const filter = { status: 'published' };
  if (q.university) filter.universityId = new mongoose.Types.ObjectId(q.university);
  if (q.major) filter.majorIds = new mongoose.Types.ObjectId(q.major);
  if (q.course) filter.courseId = new mongoose.Types.ObjectId(q.course);
  if (q.semester && q.semester !== 'any') filter.semester = q.semester;
  if (q.tags?.length) filter.tags = { $all: q.tags };
  if (q.minRating) filter.courseRating = { $gte: q.minRating };
  if (q.formats?.length) {
    const fmts = q.formats.flatMap((f) => FORMAT_GROUPS[f]);
    const ors = [];
    if (fmts.length) ors.push({ 'file.format': { $in: fmts } });
    if (q.formats.includes('text')) ors.push({ 'file.format': { $exists: false } });
    filter.$or = ors;
  }
  if (q.q) {
    // Text index for words; a regex fallback catches partial words like "auth".
    const re = new RegExp(escapeRegex(q.q), 'i');
    filter.$and = [{ $or: [{ title: re }, { description: re }, { tags: q.q.toLowerCase() }, { text: re }] }];
  }
  return filter;
}

// UC-09 / FR-09: search and filter resources
router.get(
  '/',
  validate(listQuery, 'query'),
  asyncHandler(async (req, res) => {
    const q = req.validQuery;
    const page = q.page || 1;
    const limit = q.limit || 8;
    const base = buildFilter({ ...q, types: undefined });
    const filter = { ...base };
    if (q.types?.length) filter.type = { $in: q.types };
    const order = q.sort === 'newest' ? { createdAt: -1 } : { helpfulCount: -1, createdAt: -1 };
    const [total, docs, typeCounts] = await Promise.all([
      Resource.countDocuments(filter),
      Resource.find(filter)
        .sort(order)
        .skip((page - 1) * limit)
        .limit(limit)
        .populate('courseId', 'code title')
        .lean(),
      Resource.aggregate([{ $match: base }, { $group: { _id: '$type', n: { $sum: 1 } } }]),
    ]);
    const flags = await viewerFlags(
      req.user,
      'resource',
      docs.map((d) => d._id),
    );
    res.json({
      resources: docs.map((d) => resourceOut(d, { viewer: req.user, flags })),
      total,
      page,
      pages: Math.max(1, Math.ceil(total / limit)),
      typeCounts: Object.fromEntries(RESOURCE_TYPES.map((t) => [t, typeCounts.find((c) => c._id === t)?.n || 0])),
    });
  }),
);

router.get(
  '/:id',
  asyncHandler(async (req, res) => {
    if (!mongoose.isValidObjectId(req.params.id)) throw notFound('Resource');
    const r = await Resource.findById(req.params.id).populate('courseId', 'code title universityId majorIds').lean();
    const isMine = r && isOwner(req.user, r.uploaderId);
    const isMod = req.user && ['moderator', 'admin'].includes(req.user.role);
    if (!r || (r.status !== 'published' && !isMine && !isMod)) throw notFound('Resource');
    const flags = await viewerFlags(req.user, 'resource', [r._id]);
    const more = await Resource.find({ courseId: r.courseId._id, status: 'published', _id: { $ne: r._id } })
      .sort({ helpfulCount: -1 })
      .limit(3)
      .lean();
    res.json({
      resource: resourceOut(r, { viewer: req.user, flags }),
      more: more.map((m) => resourceOut(m)),
    });
  }),
);

const META_FIELDS = {
  courseId: objectId,
  type: z.enum(RESOURCE_TYPES, { message: 'Choose what you are sharing' }),
  title: z.string().trim().min(3, 'Add a title').max(120),
  description: z.string().trim().max(1000).default(''),
  semester: z.string().refine((s) => isValidSemester(s), 'Choose a valid semester'),
  tags: z
    .preprocess(
      (v) => (Array.isArray(v) ? v : typeof v === 'string' && v ? v.split(',') : []),
      z
        .array(
          z
            .string()
            .trim()
            .toLowerCase()
            .regex(/^[a-z0-9][a-z0-9 +#.-]{0,29}$/, 'Tags use letters and numbers'),
        )
        .max(8),
    )
    .default([]),
};

const createBody = z.object({
  ...META_FIELDS,
  text: z.string().trim().max(4000).default(''),
  confirmOwnership: z.preprocess(
    (v) => v === true || v === 'true',
    z.literal(true, { message: 'Confirm you wrote this or have permission to share it' }),
  ),
});

// UC-08 / FR-08: upload a resource (file or text tip)
router.post(
  '/',
  requireAuth,
  postLimiter,
  upload.single('file'),
  checkFile,
  validate(createBody),
  asyncHandler(async (req, res) => {
    const course = await Course.findById(req.body.courseId).lean();
    if (!course || course.status !== 'active') throw notFound('Course');
    if (String(course.universityId) !== String(req.user.universityId)) throw forbidden('You can only share resources for your university');
    if (!req.file && !req.body.text) throw new HttpError(400, 'Attach a file or write a text tip');

    const check = checkText(`${req.body.title}\n${req.body.description}\n${req.body.text}`);
    let file;
    if (req.file) {
      const saved = await storage.save(req.file);
      file = {
        ...saved,
        format: req.file.format,
        sizeBytes: req.file.size,
        pages: req.file.pages,
        originalName: req.file.originalname.slice(0, 120),
      };
    }
    const major = req.user.majorId ? await Major.findById(req.user.majorId, { name: 1 }).lean() : null;
    const resource = await Resource.create({
      courseId: course._id,
      universityId: course.universityId,
      majorIds: course.majorIds,
      uploaderId: req.user._id,
      uploaderLabel: authorLabelFor(major?.name),
      type: req.body.type,
      title: req.body.title,
      description: req.body.description,
      semester: req.body.semester,
      tags: [...new Set(req.body.tags)],
      file,
      text: file ? '' : req.body.text,
      courseRating: course.ratingSummary?.averages?.overall || 0,
      status: check.flagged ? 'hidden' : 'published',
    });
    if (check.flagged) await autoReport({ targetType: 'resource', target: resource, reason: check.reason });
    await recalculateCourse(course._id);
    res.status(201).json({ resource: resourceOut(resource.toObject(), { viewer: req.user }), held: check.flagged });
  }),
);

router.patch(
  '/:id',
  requireAuth,
  validate(z.object({ ...META_FIELDS, courseId: META_FIELDS.courseId.optional(), text: z.string().trim().max(4000).optional() })),
  asyncHandler(async (req, res) => {
    const r = await Resource.findById(req.params.id);
    if (!r) throw notFound('Resource');
    if (!isOwner(req.user, r.uploaderId)) throw forbidden('You can only edit your own uploads');
    Object.assign(r, {
      type: req.body.type,
      title: req.body.title,
      description: req.body.description,
      semester: req.body.semester,
      tags: [...new Set(req.body.tags)],
    });
    if (!r.file?.format && req.body.text !== undefined) r.text = req.body.text;
    await r.save();
    res.json({ resource: resourceOut(r.toObject(), { viewer: req.user }) });
  }),
);

router.delete(
  '/:id',
  requireAuth,
  asyncHandler(async (req, res) => {
    const r = await Resource.findById(req.params.id);
    if (!r) throw notFound('Resource');
    if (!isOwner(req.user, r.uploaderId)) throw forbidden('You can only delete your own uploads');
    await storage.remove(r.file);
    await Promise.all([
      Resource.deleteOne({ _id: r._id }),
      Vote.deleteMany({ targetType: 'resource', targetId: r._id }),
      Bookmark.deleteMany({ targetType: 'resource', targetId: r._id }),
      closeReportsFor('resource', r._id),
    ]);
    await recalculateCourse(r.courseId);
    res.json({ ok: true });
  }),
);

/**
 * Downloads and previews need a verified account. The API checks access and returns a
 * short-lived signed link instead of a permanent public URL.
 */
router.get(
  '/:id/file',
  requireAuth,
  validate(z.object({ disposition: z.enum(['attachment', 'inline']).default('attachment') }), 'query'),
  asyncHandler(async (req, res) => {
    const r = await Resource.findById(req.params.id).lean();
    const allowed = r && (r.status === 'published' || isOwner(req.user, r.uploaderId) || ['moderator', 'admin'].includes(req.user.role));
    if (!allowed || !r.file?.format) throw notFound('File');
    const { disposition } = req.validQuery;
    if (disposition === 'attachment') await Resource.updateOne({ _id: r._id }, { $inc: { downloadCount: 1 } });
    const safeTitle =
      r.title
        .replace(/[^\w .-]+/g, '')
        .trim()
        .slice(0, 60) || 'resource';
    res.json({ url: storage.signedUrl(r.file, { filename: `${safeTitle}.${r.file.format}`, disposition }) });
  }),
);

// Serves local files for signed links (development and self-hosting without Cloudinary).
const files = express.Router();
const MIME = {
  pdf: 'application/pdf',
  png: 'image/png',
  jpg: 'image/jpeg',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
};
files.get('/:token', (req, res, next) => {
  let payload;
  try {
    payload = storage.verifyLocalToken(req.params.token);
  } catch {
    return next(new HttpError(410, 'This link has expired. Go back and try again.'));
  }
  const filePath = storage.localPath(payload.k);
  if (!fs.existsSync(filePath)) return next(notFound('File'));
  res.setHeader('Content-Type', MIME[payload.f] || 'application/octet-stream');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Cache-Control', 'private, max-age=300');
  // Files are served as downloads or inside a sandbox so they cannot run scripts on our origin.
  res.setHeader('Content-Security-Policy', "default-src 'none'; img-src 'self'; style-src 'unsafe-inline'; sandbox");
  res.setHeader('Cross-Origin-Resource-Policy', 'same-site');
  const disp = payload.d === 'inline' && payload.f !== 'docx' ? 'inline' : 'attachment';
  res.setHeader('Content-Disposition', `${disp}; filename="${String(payload.n).replace(/"/g, '')}"`);
  return fs.createReadStream(filePath).pipe(res);
});

module.exports = { resources: router, files };
