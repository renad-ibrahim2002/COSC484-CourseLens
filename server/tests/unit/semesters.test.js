const { termOf, isValidSemester, recentSemesters } = require('../../src/utils/semesters');

describe('semesters', () => {
  const nov = new Date('2026-11-15T12:00:00Z');
  test('maps months to terms', () => {
    expect(termOf(new Date('2026-02-01'))).toBe('Spring 2026');
    expect(termOf(new Date('2026-07-01'))).toBe('Summer 2026');
    expect(termOf(nov)).toBe('Fall 2026');
  });
  test('rejects future and malformed semesters', () => {
    expect(isValidSemester('Fall 2026', nov)).toBe(true);
    expect(isValidSemester('Spring 2027', nov)).toBe(false);
    expect(isValidSemester('Autumn 2025', nov)).toBe(false);
    expect(isValidSemester('Fall 2025; drop', nov)).toBe(false);
  });
  test('lists recent semesters newest first', () => {
    expect(recentSemesters(4, nov)).toEqual(['Fall 2026', 'Summer 2026', 'Spring 2026', 'Fall 2025']);
  });
});
