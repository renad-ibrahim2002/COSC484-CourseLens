export const fmt1 = (n) => (n ? Number(n).toFixed(1) : '–');

export const initials = (name = '') =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0].toUpperCase())
    .join('') || '?';

export function bytes(n) {
  if (!n && n !== 0) return '';
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${Math.round(n / 1024)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}

export function timeAgo(date) {
  const d = new Date(date);
  const s = Math.max(1, Math.floor((Date.now() - d) / 1000));
  if (s < 60) return 'just now';
  const m = Math.floor(s / 60);
  if (m < 60) return `${m} min ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} h ago`;
  const days = Math.floor(h / 24);
  if (days === 1) return 'yesterday';
  if (days < 7) return `${days} days ago`;
  if (days < 14) return '1 week ago';
  if (days < 60) return `${Math.floor(days / 7)} weeks ago`;
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

/** "Today 10:42", "Yesterday", "3 Nov" — as in the moderation log. */
export function logTime(date) {
  const d = new Date(date);
  const now = new Date();
  const sameDay = (a, b) => a.toDateString() === b.toDateString();
  const y = new Date(now);
  y.setDate(now.getDate() - 1);
  if (sameDay(d, now)) return `Today ${d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}`;
  if (sameDay(d, y)) return 'Yesterday';
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

export const longDate = (date) => new Date(date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

export const TYPE_LABELS = { notes: 'Notes', study_guide: 'Study guide', tips: 'Tips', formula_sheet: 'Formula sheet', other: 'Other' };
export const TYPE_ORDER = ['notes', 'study_guide', 'tips', 'formula_sheet', 'other'];
export const REASONS = [
  ['names_instructor', 'Names an instructor'],
  ['offensive', 'Offensive language'],
  ['not_allowed', 'Not allowed to share'],
  ['wrong_course', 'Wrong course'],
  ['spam', 'Spam'],
  ['other', 'Other'],
];
export const plural = (n, word, pluralWord = `${word}s`) => `${n} ${n === 1 ? word : pluralWord}`;
