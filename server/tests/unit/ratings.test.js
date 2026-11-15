const { summarize, countCombos } = require('../../src/services/ratings');

const r = (overall, extra = {}) => ({
  ratings: { difficulty: 3, workload: 4, usefulness: 5, fairness: 4, overall, ...extra },
  semester: 'Fall 2025',
});

describe('summarize (FR-04)', () => {
  test('returns zeros for a course with no reviews', () => {
    expect(summarize([])).toEqual({
      count: 0,
      averages: { difficulty: 0, workload: 0, usefulness: 0, fairness: 0, overall: 0 },
      distribution: [0, 0, 0, 0, 0],
      recommendPct: 0,
      semesters: 0,
    });
  });

  test('averages each criterion to one decimal place', () => {
    const s = summarize([r(5, { difficulty: 4 }), r(4, { difficulty: 3 }), r(4, { difficulty: 4 })]);
    expect(s.count).toBe(3);
    expect(s.averages.difficulty).toBe(3.7);
    expect(s.averages.overall).toBe(4.3);
    expect(s.averages.usefulness).toBe(5);
  });

  test('builds a 1-5 star distribution and % who would recommend (4+)', () => {
    const s = summarize([r(1), r(3), r(4), r(5), r(5)]);
    expect(s.distribution).toEqual([1, 0, 1, 1, 2]);
    expect(s.recommendPct).toBe(60);
  });

  test('counts distinct semesters', () => {
    const s = summarize([r(4), { ...r(4), semester: 'Spring 2026' }, r(5)]);
    expect(s.semesters).toBe(2);
  });
});

describe('countCombos (FR-07)', () => {
  test('counts each recommended course once per review and sorts by count', () => {
    const reviews = [
      { recommendations: { takeBefore: ['a', 'b'], takeTogether: [], avoidTogether: ['c'] } },
      { recommendations: { takeBefore: ['a', 'a'], takeTogether: ['d'], avoidTogether: [] } },
      { recommendations: {} },
    ];
    const out = countCombos(reviews);
    expect(out.takeBefore).toEqual([
      { courseId: 'a', count: 2 },
      { courseId: 'b', count: 1 },
    ]);
    expect(out.takeTogether).toEqual([{ courseId: 'd', count: 1 }]);
    expect(out.avoidTogether).toEqual([{ courseId: 'c', count: 1 }]);
  });
});
