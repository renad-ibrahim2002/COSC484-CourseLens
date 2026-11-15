const TYPE_LABELS = {
  notes: 'Notes',
  study_guide: 'Study guide',
  tips: 'Tips',
  formula_sheet: 'Formula sheet',
  other: 'Other',
};
const REASON_LABELS = {
  names_instructor: 'Names an instructor',
  not_allowed: 'Not allowed to share',
  offensive: 'Offensive language',
  wrong_course: 'Wrong course',
  spam: 'Spam',
  other: 'Other',
};
const authorLabelFor = (majorName) => `${majorName || 'Verified'} student`;

const escapeRegex = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

module.exports = { TYPE_LABELS, REASON_LABELS, authorLabelFor, escapeRegex };
