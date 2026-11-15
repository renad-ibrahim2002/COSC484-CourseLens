const { Report, Counter } = require('../models');

/** Files an automatic report so held content shows up in the moderation queue. */
async function autoReport({ targetType, target, reason, comment }) {
  const existing = await Report.findOne({ targetType, targetId: target._id, reporterId: null, status: 'open' });
  if (existing) return existing;
  return Report.create({
    number: await Counter.next('report'),
    reporterId: null,
    targetType,
    targetId: target._id,
    universityId: target.universityId,
    courseId: target.courseId,
    reason,
    comment: comment || 'Automatic check',
  });
}

/** Closes open reports when the content itself is deleted by its author. */
function closeReportsFor(targetType, targetId) {
  return Report.updateMany({ targetType, targetId, status: 'open' }, { status: 'dismissed', handledAt: new Date() });
}

module.exports = { autoReport, closeReportsFor };
