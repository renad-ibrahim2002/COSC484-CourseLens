const { TYPE_LABELS } = require('../utils/labels');

const GUEST_PREVIEW_CHARS = 140;

/** Public shape of a review. The author's account is never included (NFR-03). */
function reviewOut(r, { viewer, flags, courseCodes = new Map(), course } = {}) {
  const id = String(r._id);
  const isGuest = !viewer;
  let text = r.text || '';
  let truncated = false;
  if (isGuest && text.length > GUEST_PREVIEW_CHARS) {
    text = `${text.slice(0, GUEST_PREVIEW_CHARS).trimEnd()}…`;
    truncated = true;
  }
  const recs = (key) =>
    (r.recommendations?.[key] || [])
      .map((cid) => courseCodes.get(String(cid)))
      .filter(Boolean)
      .map((c) => ({ id: String(c._id), code: c.code, title: c.title }));
  return {
    id,
    courseId: String(r.courseId?._id || r.courseId),
    course: course ? { id: String(course._id), code: course.code, title: course.title } : undefined,
    authorLabel: r.authorLabel,
    semester: r.semester,
    ratings: r.ratings,
    text,
    truncated,
    recommendations: { takeBefore: recs('takeBefore'), takeTogether: recs('takeTogether'), avoidTogether: recs('avoidTogether') },
    helpfulCount: r.helpfulCount,
    status: r.status,
    createdAt: r.createdAt,
    viewer: viewer
      ? {
          helpful: flags?.helpful.has(id) || false,
          bookmarked: flags?.bookmarked.has(id) || false,
          isMine: !!r.userId && String(r.userId) === String(viewer._id),
        }
      : null,
  };
}

const kindOf = (r) => {
  const f = r.file?.format;
  if (!f) return 'tip';
  return f === 'png' || f === 'jpg' ? 'img' : f;
};

function resourceOut(r, { viewer, flags, course } = {}) {
  const id = String(r._id);
  const c = course || (r.courseId && r.courseId.code ? r.courseId : null);
  return {
    id,
    courseId: String(r.courseId?._id || r.courseId),
    course: c ? { id: String(c._id), code: c.code, title: c.title } : undefined,
    type: r.type,
    typeLabel: TYPE_LABELS[r.type],
    kind: kindOf(r),
    title: r.title,
    description: r.description,
    text: r.file?.format ? '' : r.text,
    semester: r.semester,
    tags: r.tags,
    file: r.file?.format ? { format: r.file.format, sizeBytes: r.file.sizeBytes, pages: r.file.pages } : null,
    uploaderLabel: r.uploaderLabel,
    helpfulCount: r.helpfulCount,
    downloadCount: r.downloadCount,
    status: r.status,
    createdAt: r.createdAt,
    viewer: viewer
      ? {
          helpful: flags?.helpful.has(id) || false,
          bookmarked: flags?.bookmarked.has(id) || false,
          isMine: !!r.uploaderId && String(r.uploaderId) === String(viewer._id),
        }
      : null,
  };
}

function courseOut(c) {
  return {
    id: String(c._id),
    code: c.code,
    title: c.title,
    credits: c.credits,
    description: c.description,
    level: c.level,
    status: c.status,
    universityId: String(c.universityId),
    majorIds: (c.majorIds || []).map(String),
    ratingSummary: c.ratingSummary,
    resourceCount: c.resourceCount,
  };
}

module.exports = { reviewOut, resourceOut, courseOut, kindOf };
