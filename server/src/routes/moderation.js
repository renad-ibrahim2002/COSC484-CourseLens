const express = require('express');
const { z } = require('zod');
const mongoose = require('mongoose');
const { Report, Review, Resource, MidtermRating, Course, User, AuditLog } = require('../models');
const { validate } = require('../middleware/validate');
const { requireAuth, requireRole, canModerate } = require('../middleware/auth');
const { asyncHandler, notFound, forbidden } = require('../utils/http');
const { recalculateCourse } = require('../services/ratings');
const { audit } = require('../services/audit');
const { REASON_LABELS } = require('../utils/labels');

const router = express.Router();
router.use(requireAuth, requireRole('moderator', 'admin'));

const MODELS = { review: Review, resource: Resource, midterm: MidtermRating };
const scope = (user) => (user.role === 'admin' ? {} : { universityId: user.universityId });

function preview(type, doc) {
  if (!doc) return '[deleted]';
  if (type === 'resource') return doc.title;
  const t = type === 'review' ? doc.text : doc.comment;
  return t ? `"${t.length > 42 ? `${t.slice(0, 42).trimEnd()}…` : t}"` : '(rating without text)';
}

// UC-11: report queue, grouped by reported item
router.get(
  '/queue',
  validate(
    z.object({
      status: z.enum(['open', 'hidden', 'dismissed']).default('open'),
      type: z.enum(['all', 'review', 'resource', 'midterm']).default('all'),
      reason: z.string().max(30).default('all'),
      sort: z.enum(['oldest', 'newest', 'most']).default('oldest'),
    }),
    'query',
  ),
  asyncHandler(async (req, res) => {
    const { status, type, reason, sort } = req.validQuery;
    const base = { ...scope(req.user) };
    if (base.universityId) base.universityId = new mongoose.Types.ObjectId(String(base.universityId));
    const match = { ...base, status };
    if (type !== 'all') match.targetType = type;
    if (reason !== 'all') match.reason = reason;

    const groups = await Report.aggregate([
      { $match: match },
      { $sort: { createdAt: 1 } },
      {
        $group: {
          _id: { t: '$targetType', id: '$targetId' },
          reportId: { $first: '$_id' },
          number: { $first: '$number' },
          reasons: { $push: { r: '$reason', auto: { $eq: ['$reporterId', null] } } },
          courseId: { $first: '$courseId' },
          count: { $sum: 1 },
          firstAt: { $min: '$createdAt' },
          lastAt: { $max: '$createdAt' },
        },
      },
      { $sort: sort === 'oldest' ? { firstAt: 1 } : sort === 'newest' ? { lastAt: -1 } : { count: -1, firstAt: 1 } },
      { $limit: 100 },
    ]);
    const counts = await Report.aggregate([
      { $match: base },
      { $group: { _id: { s: '$status', t: '$targetType', id: '$targetId' } } },
      { $group: { _id: '$_id.s', n: { $sum: 1 } } },
    ]);
    const courses = await Course.find({ _id: { $in: groups.map((g) => g.courseId) } }, { code: 1 }).lean();
    const courseCode = new Map(courses.map((c) => [String(c._id), c.code]));
    const items = await Promise.all(
      groups.map(async (g) => {
        const doc = await MODELS[g._id.t].findById(g._id.id).lean();
        // Most common reason among student reports (falls back to the automatic check's reason).
        const human = g.reasons.filter((x) => !x.auto);
        const tally = new Map();
        for (const x of human.length ? human : g.reasons) tally.set(x.r, (tally.get(x.r) || 0) + 1);
        const reason = [...tally.entries()].sort((a, b) => b[1] - a[1])[0][0];
        return {
          reportId: String(g.reportId),
          number: g.number,
          targetType: g._id.t,
          preview: preview(g._id.t, doc),
          course: courseCode.get(String(g.courseId)) || '',
          reason,
          reasonLabel: REASON_LABELS[reason],
          reports: human.length,
          autoFlagged: human.length !== g.reasons.length,
          firstAt: g.firstAt,
          lastAt: g.lastAt,
        };
      }),
    );
    const n = (s) => counts.find((c) => c._id === s)?.n || 0;
    res.json({ items, counts: { open: n('open'), hidden: n('hidden'), dismissed: n('dismissed') + n('restored') } });
  }),
);

async function loadCase(req) {
  if (!mongoose.isValidObjectId(req.params.reportId)) throw notFound('Report');
  const report = await Report.findById(req.params.reportId).lean();
  if (!report) throw notFound('Report');
  if (!canModerate(req.user, report.universityId)) throw forbidden('You can only moderate content from your university');
  return report;
}

router.get(
  '/cases/:reportId',
  asyncHandler(async (req, res) => {
    const report = await loadCase(req);
    const { targetType, targetId } = report;
    const [target, reports] = await Promise.all([
      MODELS[targetType].findById(targetId).lean(),
      Report.find({ targetType, targetId }).sort({ createdAt: -1 }).lean(),
    ]);
    const course = await Course.findById(report.courseId, { code: 1, title: 1 }).lean();
    let author = null;
    const authorId = target?.userId || target?.uploaderId;
    if (authorId) {
      const u = await User.findById(authorId, { email: 1 }).lean();
      const myItems = await Promise.all(
        Object.entries(MODELS).map(([t, M]) =>
          M.find(t === 'resource' ? { uploaderId: authorId } : { userId: authorId }, { _id: 1 }).lean(),
        ),
      );
      const ids = myItems.flat().map((d) => d._id);
      const earlier = await Report.countDocuments({ targetId: { $in: ids, $ne: targetId }, status: 'hidden' });
      author = { email: u?.email || '[deleted account]', earlierReports: earlier };
    }
    const open = reports.some((r) => r.status === 'open');
    res.json({
      case: {
        reportId: String(report._id),
        number: report.number,
        targetType,
        status: open ? 'open' : reports[0]?.status || 'dismissed',
        course: course ? { code: course.code, title: course.title } : null,
        target: target
          ? {
              id: String(target._id),
              status: target.status,
              authorLabel: target.authorLabel || target.uploaderLabel,
              semester: target.semester,
              createdAt: target.createdAt,
              text: target.text || target.comment || target.description || '',
              title: target.title,
              rating: target.ratings?.overall,
              autoFlag: (() => {
                const auto = reports.find((r) => !r.reporterId);
                if (!auto) return '';
                const what = targetType === 'resource' ? 'resource' : 'review';
                return auto.reason === 'names_instructor'
                  ? `Automatic check: this ${what} may name an instructor.`
                  : `Automatic check: this ${what} may contain offensive language.`;
              })(),
              section: target.section,
              assessment: target.assessment,
            }
          : null,
        reports: reports
          .filter((r) => r.reporterId)
          .map((r) => ({
            id: String(r._id),
            reason: r.reason,
            reasonLabel: REASON_LABELS[r.reason],
            comment: r.comment,
            status: r.status,
            createdAt: r.createdAt,
          })),
        author,
      },
    });
  }),
);

// FR-11: hide, dismiss or restore — every decision is written to the audit log.
router.post(
  '/cases/:reportId/decision',
  validate(z.object({ action: z.enum(['hide', 'dismiss', 'restore']), note: z.string().trim().min(3, 'Add a note for the log').max(300) })),
  asyncHandler(async (req, res) => {
    const report = await loadCase(req);
    const { targetType, targetId } = report;
    const Model = MODELS[targetType];
    const target = await Model.findById(targetId);
    const { action, note } = req.body;
    const now = { handledBy: req.user._id, handledAt: new Date() };

    if (action === 'hide') {
      if (target) await Model.updateOne({ _id: targetId }, { status: 'hidden' });
      await Report.updateMany({ targetType, targetId, status: 'open' }, { status: 'hidden', ...now });
    } else if (action === 'dismiss') {
      // Dismissing means the content is fine: held content gets published.
      if (target && target.status === 'held') await Model.updateOne({ _id: targetId }, { status: 'published', flagReason: '' });
      await Report.updateMany({ targetType, targetId, status: 'open' }, { status: 'dismissed', ...now });
    } else {
      if (target) await Model.updateOne({ _id: targetId }, { status: 'published', flagReason: '' });
      await Report.updateMany({ targetType, targetId, status: { $in: ['open', 'hidden'] } }, { status: 'restored', ...now });
    }
    if (target?.courseId) await recalculateCourse(target.courseId);
    const course = await Course.findById(report.courseId, { code: 1 }).lean();
    const label = `${targetType === 'resource' ? 'Resource' : targetType === 'midterm' ? 'Mid-term rating' : 'Review'} on ${course?.code || 'course'}`;
    await audit(req.user, {
      action: { hide: 'hidden', dismiss: 'dismissed', restore: 'restored' }[action],
      targetType,
      targetId,
      targetLabel: label,
      detail:
        { hide: 'Hid a', dismiss: 'Dismissed reports on a', restore: 'Restored a' }[action] +
        (targetType === 'resource' ? ' resource' : ' review'),
      note,
      universityId: report.universityId,
    });
    res.json({ ok: true });
  }),
);

const logQuery = z.object({
  action: z.enum(['all', 'hidden', 'dismissed', 'restored']).default('all'),
  moderator: z.string().max(30).default('all'),
  days: z.coerce.number().int().min(1).max(365).default(30),
});

async function findLog(req) {
  const { action, moderator, days } = req.validQuery;
  const filter = {
    action: { $in: ['hidden', 'dismissed', 'restored'] },
    createdAt: { $gte: new Date(Date.now() - days * 86400000) },
    ...scope(req.user),
  };
  if (action !== 'all') filter.action = action;
  if (moderator !== 'all' && mongoose.isValidObjectId(moderator)) filter.userId = moderator;
  return AuditLog.find(filter).sort({ createdAt: -1 }).limit(500).lean();
}

router.get(
  '/log',
  validate(logQuery, 'query'),
  asyncHandler(async (req, res) => {
    const logs = await findLog(req);
    const mods = await AuditLog.aggregate([
      {
        $match: {
          action: { $in: ['hidden', 'dismissed', 'restored'] },
          ...(req.user.role === 'admin' ? {} : { universityId: req.user.universityId }),
        },
      },
      { $group: { _id: '$userId', label: { $first: '$actorLabel' } } },
    ]);
    res.json({
      entries: logs.map((l) => ({
        id: String(l._id),
        at: l.createdAt,
        action: l.action,
        item: l.targetLabel,
        note: l.note,
        moderator: l.actorLabel,
      })),
      moderators: mods.map((m) => ({ id: String(m._id), label: m.label })),
    });
  }),
);

router.get(
  '/log.csv',
  validate(logQuery, 'query'),
  asyncHandler(async (req, res) => {
    const logs = await findLog(req);
    const esc = (v) =>
      `"${String(v ?? '')
        .replace(/"/g, '""')
        .replace(/^[=+\-@]/, "'$&")}"`;
    const rows = [
      ['When', 'Action', 'Item', 'Note', 'Moderator'],
      ...logs.map((l) => [l.createdAt.toISOString(), l.action, l.targetLabel, l.note, l.actorLabel]),
    ];
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="moderation-log.csv"');
    res.send(rows.map((r) => r.map(esc).join(',')).join('\n'));
  }),
);

module.exports = router;
