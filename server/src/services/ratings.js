const mongoose = require('mongoose');
const { Review, Course, Resource, MidtermRating } = require('../models');

const CRITERIA = ['difficulty', 'workload', 'usefulness', 'fairness', 'overall'];
const round1 = (n) => Math.round(n * 10) / 10;

/** Pure calculation, unit-tested: averages per criterion, 1-5 star distribution, % recommend. */
function summarize(reviews) {
  const count = reviews.length;
  const sums = Object.fromEntries(CRITERIA.map((c) => [c, 0]));
  const distribution = [0, 0, 0, 0, 0];
  const semesters = new Set();
  let recommend = 0;
  for (const r of reviews) {
    for (const c of CRITERIA) sums[c] += r.ratings[c];
    distribution[Math.min(5, Math.max(1, Math.round(r.ratings.overall))) - 1] += 1;
    if (r.ratings.overall >= 4) recommend += 1;
    if (r.semester) semesters.add(r.semester);
  }
  const averages = Object.fromEntries(CRITERIA.map((c) => [c, count ? round1(sums[c] / count) : 0]));
  return {
    count,
    averages,
    distribution,
    recommendPct: count ? Math.round((recommend / count) * 100) : 0,
    semesters: semesters.size,
  };
}

async function recalculateCourse(courseId) {
  const reviews = await Review.find({ courseId, status: 'published' }, { ratings: 1, semester: 1 }).lean();
  const ratingSummary = summarize(reviews);
  const resourceCount = await Resource.countDocuments({ courseId, status: 'published' });
  await Course.updateOne({ _id: courseId }, { ratingSummary, resourceCount });
  await Resource.updateMany({ courseId }, { courseRating: ratingSummary.averages.overall });
  return ratingSummary;
}

/** Mid-semester summary for one semester and assessment (FR-06). */
async function midtermSummary(courseId, semester, assessment, section) {
  const match = { courseId: new mongoose.Types.ObjectId(String(courseId)), semester, assessment, status: 'published' };
  if (section) match.section = section;
  const [row] = await MidtermRating.aggregate([
    { $match: match },
    {
      $group: {
        _id: null,
        count: { $sum: 1 },
        pace: { $avg: '$ratings.pace' },
        workload: { $avg: '$ratings.workload' },
        clarity: { $avg: '$ratings.clarity' },
        fairness: { $avg: '$ratings.fairness' },
      },
    },
  ]);
  if (!row) return { count: 0, averages: null };
  return {
    count: row.count,
    averages: { pace: round1(row.pace), workload: round1(row.workload), clarity: round1(row.clarity), fairness: round1(row.fairness) },
  };
}

/** Pure: counts recommendation tags across reviews (FR-07). */
function countCombos(reviews) {
  const out = { takeBefore: new Map(), takeTogether: new Map(), avoidTogether: new Map() };
  for (const r of reviews) {
    for (const key of Object.keys(out)) {
      const seen = new Set();
      for (const id of r.recommendations?.[key] || []) {
        const k = String(id);
        if (seen.has(k)) continue; // one vote per review per course
        seen.add(k);
        out[key].set(k, (out[key].get(k) || 0) + 1);
      }
    }
  }
  return Object.fromEntries(
    Object.entries(out).map(([k, m]) => [
      k,
      [...m.entries()].map(([courseId, count]) => ({ courseId, count })).sort((a, b) => b.count - a.count),
    ]),
  );
}

async function combosFor(courseId) {
  const reviews = await Review.find({ courseId, status: 'published' }, { recommendations: 1 }).lean();
  const counts = countCombos(reviews);
  const ids = [
    ...new Set(
      Object.values(counts)
        .flat()
        .map((c) => c.courseId),
    ),
  ];
  const courses = await Course.find({ _id: { $in: ids } }, { code: 1, title: 1 }).lean();
  const byId = new Map(courses.map((c) => [String(c._id), c]));
  const attach = (list) =>
    list.filter((c) => byId.has(c.courseId)).map((c) => ({ ...c, code: byId.get(c.courseId).code, title: byId.get(c.courseId).title }));
  return {
    reviewCount: reviews.length,
    takeBefore: attach(counts.takeBefore),
    takeTogether: attach(counts.takeTogether),
    avoidTogether: attach(counts.avoidTogether),
  };
}

module.exports = { summarize, recalculateCourse, midtermSummary, countCombos, combosFor, CRITERIA };
