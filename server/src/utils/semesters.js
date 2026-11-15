// Academic terms: Spring (Jan-May), Summer (Jun-Aug), Fall (Sep-Dec).
const TERMS = ['Spring', 'Summer', 'Fall'];
const SEMESTER_RE = /^(Spring|Summer|Fall) (20\d\d)$/;

function termOf(date = new Date()) {
  const m = date.getMonth();
  const term = m <= 4 ? 'Spring' : m <= 7 ? 'Summer' : 'Fall';
  return `${term} ${date.getFullYear()}`;
}

function semesterIndex(s) {
  const m = SEMESTER_RE.exec(s);
  if (!m) return -1;
  return Number(m[2]) * 3 + TERMS.indexOf(m[1]);
}

function isValidSemester(s, now = new Date()) {
  const idx = semesterIndex(s);
  return idx >= 0 && idx <= semesterIndex(termOf(now)) && Number(SEMESTER_RE.exec(s)[2]) >= 2015;
}

/** The current term plus the previous `count - 1` terms, newest first. */
function recentSemesters(count = 9, now = new Date()) {
  const out = [];
  let idx = semesterIndex(termOf(now));
  for (let i = 0; i < count; i += 1, idx -= 1) {
    out.push(`${TERMS[idx % 3]} ${Math.floor(idx / 3)}`);
  }
  return out;
}

module.exports = { termOf, semesterIndex, isValidSemester, recentSemesters, SEMESTER_RE };
