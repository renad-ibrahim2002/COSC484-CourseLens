const { Vote, Bookmark } = require('../models');

/** For a logged-in viewer, which of these items have they marked helpful / bookmarked? */
async function viewerFlags(user, targetType, ids) {
  if (!user || !ids.length) return { helpful: new Set(), bookmarked: new Set() };
  const [votes, marks] = await Promise.all([
    targetType === 'course' ? [] : Vote.find({ userId: user._id, targetType, targetId: { $in: ids } }, { targetId: 1 }).lean(),
    Bookmark.find({ userId: user._id, targetType, targetId: { $in: ids } }, { targetId: 1 }).lean(),
  ]);
  return {
    helpful: new Set(votes.map((v) => String(v.targetId))),
    bookmarked: new Set(marks.map((m) => String(m.targetId))),
  };
}

module.exports = { viewerFlags };
