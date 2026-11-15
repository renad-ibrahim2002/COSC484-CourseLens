/**
 * Automatic checks run on every review, mid-term comment and resource description.
 * Matches are "held for moderation" rather than rejected, so a person makes the final call.
 */
const TITLES = ['dr', 'prof', 'professor', 'mr', 'mrs', 'ms', 'miss', 'doctor', 'instructor', 'lecturer', 'teacher'];
// Title (any case) followed by a capitalised name or a "[name]" placeholder.
const titleThenName = new RegExp(`\\b(?:${TITLES.map((t) => `[${t[0]}${t[0].toUpperCase()}]${t.slice(1)}`).join('|')})\\.?\\s+[A-Z[]`);

const INSTRUCTOR_PATTERNS = [titleThenName, /\b(dr|prof)\.\s*\S/i, /\b(his|her) (section|class|lectures?)\b/i];

// Deliberately short list; moderators handle anything subtler through reports.
const OFFENSIVE_WORDS = ['idiot', 'stupid', 'moron', 'trash', 'garbage', 'dumb', 'useless prof', 'hate him', 'hate her'];

function checkText(text = '') {
  const t = String(text);
  if (INSTRUCTOR_PATTERNS.some((re) => re.test(t))) {
    return {
      flagged: true,
      reason: 'names_instructor',
      message: 'A moderator is checking this review because it may mention an instructor.',
    };
  }
  const lower = t.toLowerCase();
  if (OFFENSIVE_WORDS.some((w) => new RegExp(`\\b${w}\\b`).test(lower))) {
    return { flagged: true, reason: 'offensive', message: 'A moderator is checking this because it may contain offensive language.' };
  }
  return { flagged: false };
}

module.exports = { checkText };
