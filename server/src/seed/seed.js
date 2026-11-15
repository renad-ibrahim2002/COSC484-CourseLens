/**
 * Seeds the catalog and sample content shown in the wireframes:
 *   npm run seed            (uses MONGODB_URI)
 * Demo accounts (password "CourseLens1"):
 *   student@aubh.edu.bh   Renad Ibrahim   moderator (AUBH)
 *   student2@aubh.edu.bh  Talal AlHamer   student
 *   admin@aubh.edu.bh     Platform administrator   admin
 */
const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');
const env = require('../config/env');
const { connect } = require('../db');
const M = require('../models');
const storage = require('../services/storage');
const { recalculateCourse } = require('../services/ratings');
const { termOf } = require('../utils/semesters');
const { makePdf, makeDocx, makePng } = require('./files');

const DEMO_PASSWORD = 'CourseLens1';
const DAY = 86400000;
const ago = (days, hours = 0) => new Date(Date.now() - days * DAY - hours * 3600000);

// Deterministic pseudo-random numbers so every seed produces the same data.
let state = 484;
const rand = () => {
  state = (state * 1103515245 + 12345) % 2147483648;
  return state / 2147483648;
};
const shuffle = (arr) => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};
/** n whole-number ratings whose average is (close to) `mean`. */
const spread = (n, mean) => {
  const base = Math.floor(mean);
  const ups = Math.round((mean - base) * n);
  return shuffle(Array.from({ length: n }, (_, i) => Math.min(5, Math.max(1, i < ups ? base + 1 : base))));
};

const WEEK_WEIGHTS = [2, 3, 2.5, 4, 8, 5, 3.5, 4];
const pickWeek = () => {
  let r = rand() * WEEK_WEIGHTS.reduce((a, b) => a + b, 0);
  for (let w = 0; w < WEEK_WEIGHTS.length; w += 1) {
    r -= WEEK_WEIGHTS[w];
    if (r <= 0) return w;
  }
  return 7;
};
const PAST = ['Spring 2026', 'Fall 2025', 'Spring 2025', 'Fall 2024'];
const CURRENT = termOf();

const GENERIC_TEXTS = [
  'Start the assignments early; the last two weeks get busy.',
  'Lectures are recorded, but the labs are where you actually learn it.',
  'Fair exams if you do the weekly practice problems.',
  'Heavier than the credits suggest, but worth it.',
  'Group work is a big part of the grade, so choose your team carefully.',
  'Good pace overall. The project ties everything together.',
  'Quizzes every week keep you on track. Do not skip the readings.',
  'Useful for internships; recruiters asked about the project.',
  'The final covers everything, so keep summary notes as you go.',
  '',
  '',
  '',
];

async function seed() {
  await connect();
  console.log(`Seeding ${env.mongoUri.replace(/\/\/.*@/, '//***@')}`);
  await mongoose.connection.dropDatabase();
  await Promise.all(Object.values(M).map((Model) => Model.syncIndexes?.()));

  /* ---------- Universities & majors ---------- */
  const aubh = await M.University.create({
    name: 'American University of Bahrain',
    shortName: 'AUBH',
    location: 'Riffa, Bahrain',
    emailDomains: ['aubh.edu.bh'],
    status: 'active',
  });
  await M.University.create([
    {
      name: 'University of Bahrain',
      shortName: 'UOB',
      location: 'Sakhir, Bahrain',
      emailDomains: ['uob.edu.bh', 'stu.uob.edu.bh'],
      status: 'coming_soon',
    },
    {
      name: 'Bahrain Polytechnic',
      shortName: 'BP',
      location: 'Isa Town, Bahrain',
      emailDomains: ['polytechnic.bh'],
      status: 'coming_soon',
    },
  ]);
  const majorDefs = [
    ['COSC', 'Computer Science'],
    ['COEN', 'Computer Engineering'],
    ['BUSI', 'Business Administration'],
    ['INTD', 'Interior Design'],
    ['GRDS', 'Graphic Design'],
    ['ACCT', 'Accounting & Finance'],
  ];
  const majors = {};
  for (const [code, name] of majorDefs) majors[code] = await M.Major.create({ universityId: aubh._id, code, name });

  /* ---------- Courses ---------- */
  const courseDefs = [
    [
      'COSC 101',
      'Introduction to Programming',
      ['COSC', 'COEN'],
      'Problem solving and programming fundamentals in Python: variables, control flow, functions and simple data structures.',
    ],
    ['COSC 220', 'Data Structures', ['COSC', 'COEN'], 'Lists, stacks, queues, trees, hash tables and graphs, with complexity analysis.'],
    [
      'COSC 230',
      'Computer Organization',
      ['COSC', 'COEN'],
      'How computers execute programs: data representation, assembly, memory and the CPU.',
    ],
    ['COSC 310', 'Algorithms', ['COSC'], 'Design and analysis of algorithms: divide and conquer, greedy methods and dynamic programming.'],
    ['COSC 330', 'Database Systems', ['COSC', 'COEN'], 'Relational modelling, SQL, normalisation, indexing and transactions.'],
    ['COSC 350', 'Operating Systems', ['COSC', 'COEN'], 'Processes, threads, scheduling, memory management and file systems.'],
    ['COSC 360', 'Computer Networks', ['COSC', 'COEN'], 'Network layers, TCP/IP, routing, HTTP and network security basics.'],
    ['COSC 380', 'Artificial Intelligence', ['COSC'], 'Search, knowledge representation, machine learning basics and ethics of AI.'],
    ['COSC 420', 'Cybersecurity', ['COSC'], 'Threats, cryptography, secure coding and incident response.'],
    ['COSC 450', 'Capstone Project I', ['COSC'], 'First half of the senior project: requirements, design and a working prototype.'],
    ['COSC 451', 'Capstone Project II', ['COSC'], 'Second half of the senior project: implementation, testing and final presentation.'],
    ['COSC 470', 'Software Engineering', ['COSC', 'COEN'], 'Agile processes, requirements, design patterns, testing and team projects.'],
    [
      'COSC 484',
      'Web Engineering',
      ['COSC'],
      'Full-stack web application development: front-end frameworks, REST APIs, databases, authentication, testing and deployment.',
    ],
    ['MATH 201', 'Discrete Mathematics', ['COSC', 'COEN'], 'Logic, proofs, sets, relations, combinatorics and graphs.'],
    ['COEN 210', 'Digital Logic Design', ['COEN'], 'Boolean algebra, combinational and sequential circuits.'],
    ['COEN 320', 'Embedded Systems', ['COEN'], 'Microcontrollers, interfacing and real-time programming.'],
    ['COEN 330', 'Signals and Systems', ['COEN'], 'Continuous and discrete signals, Fourier analysis and filters.'],
    ['BUSI 101', 'Principles of Management', ['BUSI'], 'Planning, organising, leading and controlling in organisations.'],
    ['BUSI 210', 'Business Communication', ['BUSI'], 'Professional writing, presentations and workplace communication.'],
    ['BUSI 250', 'Marketing Fundamentals', ['BUSI'], 'Markets, consumers and the marketing mix.'],
    ['BUSI 310', 'Organisational Behaviour', ['BUSI'], 'Motivation, teams, leadership and culture at work.'],
    ['BUSI 330', 'Operations Management', ['BUSI'], 'Processes, quality, supply chains and capacity planning.'],
    ['BUSI 360', 'Business Law', ['BUSI'], 'Contracts, companies and commercial law in Bahrain and the GCC.'],
    ['BUSI 420', 'Strategic Management', ['BUSI'], 'Competitive strategy and the capstone business case.'],
    ['ACCT 201', 'Financial Accounting', ['ACCT', 'BUSI'], 'Recording transactions and preparing financial statements.'],
    ['ACCT 202', 'Managerial Accounting', ['ACCT', 'BUSI'], 'Costing, budgeting and decision making.'],
    ['ACCT 310', 'Intermediate Accounting', ['ACCT'], 'IFRS reporting for assets, liabilities and equity.'],
    ['ACCT 320', 'Corporate Finance', ['ACCT'], 'Time value of money, valuation and capital budgeting.'],
    ['ACCT 340', 'Auditing', ['ACCT'], 'Audit planning, evidence and reporting.'],
    ['ACCT 410', 'Islamic Finance', ['ACCT'], 'Principles and instruments of Islamic banking and finance.'],
    ['INTD 101', 'Design Studio I', ['INTD', 'GRDS'], 'Foundations of two- and three-dimensional design.'],
    ['INTD 210', 'Interior Materials', ['INTD'], 'Finishes, furniture and sustainable materials.'],
    ['INTD 220', 'Space Planning', ['INTD'], 'Planning residential and commercial interiors.'],
    ['INTD 310', 'Interior Studio III', ['INTD'], 'Hospitality and retail design projects.'],
    ['INTD 320', 'Building Codes', ['INTD'], 'Safety, accessibility and code compliance for interiors.'],
    ['GRDS 110', 'Typography I', ['GRDS'], 'Letterforms, hierarchy and layout.'],
    ['GRDS 210', 'Visual Identity', ['GRDS'], 'Logos, identity systems and brand guidelines.'],
    ['GRDS 230', 'Digital Illustration', ['GRDS'], 'Vector and raster illustration techniques.'],
    ['GRDS 320', 'UX/UI Design', ['GRDS'], 'User research, wireframes, prototyping and usability testing.'],
    ['GRDS 330', 'Motion Graphics', ['GRDS'], 'Animation principles and motion design tools.'],
    ['GRDS 410', 'Portfolio Studio', ['GRDS'], 'Preparing a professional design portfolio.'],
    ['ENGL 101', 'Academic Writing', ['BUSI', 'INTD', 'GRDS', 'ACCT'], 'Academic reading, argument and research writing.'],
  ];
  const courses = {};
  for (const [code, title, majorCodes, description] of courseDefs) {
    courses[code] = await M.Course.create({
      universityId: aubh._id,
      majorIds: majorCodes.map((c) => majors[c]._id),
      code,
      title,
      description,
      credits: 3,
    });
  }
  courses['COSC 290'] = await M.Course.create({
    universityId: aubh._id,
    majorIds: [majors.COSC._id],
    code: 'COSC 290',
    title: 'Visual Basic (old catalog)',
    credits: 3,
    status: 'archived',
  });

  /* ---------- Users ---------- */
  const hash = await bcrypt.hash(DEMO_PASSWORD, 10);
  const mk = (name, email, majorCode, role = 'student', extra = {}) =>
    M.User.create({
      name,
      email,
      passwordHash: hash,
      role,
      universityId: aubh._id,
      majorId: majorCode ? majors[majorCode]._id : undefined,
      isVerified: true,
      createdAt: extra.createdAt || ago(120),
      ...extra,
    });
  const renad = await mk('Renad Ibrahim', 'student@aubh.edu.bh', 'COSC', 'moderator');
  const talal = await mk('Talal AlHamer', 'student2@aubh.edu.bh', 'COSC');
  const admin = await mk('Platform administrator', 'admin@aubh.edu.bh', null, 'admin');
  const modB = await mk('Maryam Hasan', 'moderator2@aubh.edu.bh', 'BUSI', 'moderator');
  await M.User.create({
    name: 'Yusuf Ali',
    email: 'yusuf.ali@aubh.edu.bh',
    passwordHash: hash,
    universityId: aubh._id,
    majorId: majors.COEN._id,
    isVerified: false,
  });

  const majorCycle = ['COSC', 'COSC', 'COSC', 'COEN', 'COSC', 'COEN', 'BUSI', 'ACCT', 'GRDS', 'INTD'];
  const reviewers = [];
  for (let i = 1; i <= 80; i += 1) {
    reviewers.push(
      await mk(`Student ${i}`, `s${String(i).padStart(3, '0')}@aubh.edu.bh`, majorCycle[i % majorCycle.length], 'student', {
        createdAt: ago(Math.floor(rand() * 200)),
      }),
    );
  }
  const majorName = new Map(Object.values(majors).map((m) => [String(m._id), m.name]));
  const labelOf = (u) => `${majorName.get(String(u.majorId)) || 'Verified'} student`;

  /* ---------- Reviews ---------- */
  // Replaces any generated review with the same (user, course, semester) key.
  const placeReview = async (doc) => {
    await M.Review.deleteOne({ courseId: doc.courseId, userId: doc.userId, semester: doc.semester });
    return M.Review.create(doc);
  };
  const votesFor = async (targetType, targetId, count, excludeId) => {
    const voters = shuffle([talal, ...reviewers])
      .filter((u) => String(u._id) !== String(excludeId))
      .slice(0, count);
    await M.Vote.insertMany(voters.map((u) => ({ userId: u._id, targetType, targetId })));
  };

  async function seedCourseReviews(code, n, means, opts = {}) {
    const course = courses[code];
    const overall = opts.overall || spread(n, means.overall);
    const crit = {
      difficulty: spread(n, means.difficulty),
      workload: spread(n, means.workload),
      usefulness: spread(n, means.usefulness),
      fairness: spread(n, means.fairness),
    };
    const recPlan = opts.recs || {};
    const recIdx = (key, i) =>
      Object.entries(recPlan[key] || {})
        .filter(([, count]) => i < count)
        .map(([c]) => courses[c]._id);
    const pool = shuffle(reviewers);
    const docs = [];
    for (let i = 0; i < n; i += 1) {
      const semester = PAST[i % PAST.length];
      const author = pool[i % pool.length];
      docs.push({
        courseId: course._id,
        universityId: aubh._id,
        userId: author._id,
        authorLabel: labelOf(author),
        semester,
        ratings: {
          difficulty: crit.difficulty[i],
          workload: crit.workload[i],
          usefulness: crit.usefulness[i],
          fairness: crit.fairness[i],
          overall: overall[i],
        },
        text: GENERIC_TEXTS[i % GENERIC_TEXTS.length],
        recommendations: {
          takeBefore: recIdx('takeBefore', i),
          takeTogether: recIdx('takeTogether', i),
          avoidTogether: recIdx('avoidTogether', i),
        },
        helpfulCount: 0,
        // About a third land in the last 8 weeks, peaking around mid-terms (week 5).
        createdAt: rand() < 0.35 ? ago(7 * (7 - pickWeek()) + Math.floor(rand() * 7)) : ago(60 + Math.floor(rand() * 400)),
      });
    }
    const created = await M.Review.insertMany(docs);
    for (const r of created.slice(0, 6)) {
      const c = Math.floor(rand() * 6);
      if (c) {
        await votesFor('review', r._id, c, r.userId);
        await M.Review.updateOne({ _id: r._id }, { helpfulCount: c });
      }
    }
    return created;
  }

  // COSC 484 (matches the course page wireframes)
  const c484 = await seedCourseReviews(
    'COSC 484',
    34,
    { difficulty: 3.7, workload: 4.0, usefulness: 4.6, fairness: 4.0 },
    {
      overall: shuffle([1, 2, 2, 3, 3, 3, 3, ...Array(12).fill(4), ...Array(15).fill(5)]),
      recs: {
        takeBefore: { 'COSC 330': 20, 'COSC 220': 13, 'COSC 101': 6 },
        takeTogether: { 'MATH 201': 9, 'COSC 360': 5 },
        avoidTogether: { 'COSC 470': 16, 'COSC 450': 8 },
      },
    },
  );
  void c484;
  const featured = [
    {
      user: renad,
      semester: 'Spring 2026',
      ratings: { difficulty: 4, workload: 5, usefulness: 5, fairness: 4, overall: 5 },
      text: 'The group project is the whole course, so pick your partner early and start the backend in week 9. Weekly labs map straight onto the project. Easily the most useful course for internships.',
      recs: { takeBefore: ['COSC 330'], takeTogether: [], avoidTogether: ['COSC 470'] },
      helpful: 24,
      at: ago(150),
    },
    {
      user: reviewers.find((u) => majorName.get(String(u.majorId)) === 'Computer Engineering'),
      semester: 'Fall 2025',
      ratings: { difficulty: 4, workload: 5, usefulness: 4, fairness: 3, overall: 3 },
      text: 'Heavy in the last four weeks when testing, audits and deployment all land at once. Doable, but not alongside two other project courses.',
      recs: { takeBefore: [], takeTogether: [], avoidTogether: [] },
      helpful: 11,
      at: ago(300),
    },
    {
      user: talal,
      semester: 'Fall 2025',
      ratings: { difficulty: 3, workload: 4, usefulness: 5, fairness: 4, overall: 4 },
      text: 'Labs are graded generously if you show progress every week. The final demo matters more than the written report, so practise it.',
      recs: { takeBefore: [], takeTogether: [], avoidTogether: [] },
      helpful: 7,
      at: ago(290),
    },
  ];
  for (const f of featured) {
    await M.Review.deleteOne({ courseId: courses['COSC 484']._id, userId: f.user._id, semester: f.semester });
    const r = await placeReview({
      courseId: courses['COSC 484']._id,
      universityId: aubh._id,
      userId: f.user._id,
      authorLabel: labelOf(f.user),
      semester: f.semester,
      ratings: f.ratings,
      text: f.text,
      recommendations: {
        takeBefore: f.recs.takeBefore.map((c) => courses[c]._id),
        takeTogether: f.recs.takeTogether.map((c) => courses[c]._id),
        avoidTogether: f.recs.avoidTogether.map((c) => courses[c]._id),
      },
      helpfulCount: f.helpful,
      createdAt: f.at,
    });
    await votesFor('review', r._id, f.helpful, f.user._id);
  }

  await seedCourseReviews(
    'COSC 101',
    61,
    { difficulty: 2.2, workload: 2.8, usefulness: 4.3, fairness: 4.4, overall: 4.4 },
    { recs: { takeTogether: { 'MATH 201': 12 } } },
  );
  await seedCourseReviews(
    'COSC 220',
    51,
    { difficulty: 4.3, workload: 4.1, usefulness: 4.5, fairness: 3.8, overall: 3.8 },
    { recs: { takeBefore: { 'COSC 101': 30, 'MATH 201': 18 }, avoidTogether: { 'COSC 310': 9 } } },
  );
  await seedCourseReviews(
    'COSC 330',
    30,
    { difficulty: 3.4, workload: 3.3, usefulness: 4.4, fairness: 4.0, overall: 4.0 },
    { recs: { takeBefore: { 'COSC 220': 14 }, takeTogether: { 'COSC 484': 6 } } },
  );
  await seedCourseReviews(
    'COSC 470',
    26,
    { difficulty: 3.8, workload: 4.9, usefulness: 4.3, fairness: 3.7, overall: 3.9 },
    { recs: { avoidTogether: { 'COSC 450': 11, 'COSC 484': 7 } } },
  );
  await seedCourseReviews('MATH 201', 43, { difficulty: 4.0, workload: 3.4, usefulness: 3.6, fairness: 3.5, overall: 3.5 });
  await seedCourseReviews('COSC 360', 19, { difficulty: 3.4, workload: 3.2, usefulness: 4.2, fairness: 4.1, overall: 4.1 });
  await seedCourseReviews('COSC 310', 22, { difficulty: 4.5, workload: 4.0, usefulness: 4.4, fairness: 3.6, overall: 3.7 });
  await seedCourseReviews('COSC 350', 14, { difficulty: 3.9, workload: 3.8, usefulness: 4.0, fairness: 3.9, overall: 3.8 });
  await seedCourseReviews('COSC 230', 12, { difficulty: 3.6, workload: 3.1, usefulness: 3.4, fairness: 4.0, overall: 3.6 });
  await seedCourseReviews('COSC 380', 10, { difficulty: 3.7, workload: 3.6, usefulness: 4.6, fairness: 4.1, overall: 4.3 });
  await seedCourseReviews('COSC 420', 9, { difficulty: 3.5, workload: 3.4, usefulness: 4.5, fairness: 4.2, overall: 4.2 });
  await seedCourseReviews('COSC 450', 8, { difficulty: 3.3, workload: 4.6, usefulness: 4.4, fairness: 3.8, overall: 4.0 });
  await seedCourseReviews('COEN 210', 18, { difficulty: 3.6, workload: 3.3, usefulness: 4.0, fairness: 4.1, overall: 4.0 });
  await seedCourseReviews('BUSI 101', 40, { difficulty: 2.1, workload: 2.6, usefulness: 3.8, fairness: 4.2, overall: 4.0 });
  await seedCourseReviews('BUSI 250', 25, { difficulty: 2.5, workload: 2.9, usefulness: 4.0, fairness: 4.0, overall: 4.1 });
  await seedCourseReviews('ACCT 201', 34, { difficulty: 3.6, workload: 3.5, usefulness: 4.3, fairness: 3.9, overall: 3.9 });
  await seedCourseReviews('GRDS 320', 20, { difficulty: 3.0, workload: 3.9, usefulness: 4.7, fairness: 4.2, overall: 4.5 });
  await seedCourseReviews('INTD 220', 15, { difficulty: 3.4, workload: 4.4, usefulness: 4.1, fairness: 3.9, overall: 3.9 });

  // Renad's other reviews (My reviews wireframe)
  await M.Review.deleteMany({
    userId: renad._id,
    courseId: { $in: [courses['COSC 330']._id, courses['MATH 201']._id] },
    semester: 'Fall 2025',
  });
  const r330 = await placeReview({
    courseId: courses['COSC 330']._id,
    universityId: aubh._id,
    userId: renad._id,
    authorLabel: labelOf(renad),
    semester: 'Fall 2025',
    ratings: { difficulty: 3, workload: 3, usefulness: 5, fairness: 4, overall: 4 },
    text: 'Normalisation is the hard part; the weekly SQL quizzes are the best practice for the final.',
    helpfulCount: 9,
    createdAt: ago(260),
  });
  await votesFor('review', r330._id, 9, renad._id);
  const rMath = await placeReview({
    courseId: courses['MATH 201']._id,
    universityId: aubh._id,
    userId: renad._id,
    authorLabel: labelOf(renad),
    semester: 'Fall 2025',
    ratings: { difficulty: 4, workload: 3, usefulness: 3, fairness: 3, overall: 3 },
    text: 'Proofs take time; budget the weekends before each quiz.',
    status: 'held',
    flagReason: 'A moderator is checking this review because it may mention an instructor.',
    createdAt: ago(255),
  });

  // Bookmarked COSC 470 review (Bookmarks wireframe)
  const ceStudent = reviewers.filter((u) => majorName.get(String(u.majorId)) === 'Computer Engineering')[1];
  await M.Review.deleteOne({ courseId: courses['COSC 470']._id, userId: ceStudent._id, semester: 'Spring 2026' });
  const r470 = await placeReview({
    courseId: courses['COSC 470']._id,
    universityId: aubh._id,
    userId: ceStudent._id,
    authorLabel: labelOf(ceStudent),
    semester: 'Spring 2026',
    ratings: { difficulty: 4, workload: 5, usefulness: 4, fairness: 4, overall: 4 },
    text: 'Do not take this with the capstone. The sprint reviews every two weeks are where most of the grade comes from.',
    recommendations: { avoidTogether: [courses['COSC 450']._id] },
    createdAt: ago(140),
  });

  /* ---------- Reported content (Moderation wireframes) ---------- */
  const mathReporter = reviewers.filter((u) => majorName.get(String(u.majorId)) === 'Computer Science')[7];
  const reportedMath = await placeReview({
    courseId: courses['MATH 201']._id,
    universityId: aubh._id,
    userId: mathReporter._id,
    authorLabel: labelOf(mathReporter),
    semester: 'Fall 2025',
    ratings: { difficulty: 5, workload: 4, usefulness: 2, fairness: 1, overall: 1 },
    text: 'Dr. [name] marks harshly and never answers emails. Avoid his section if you can; the rest of the course is fine.',
    status: 'held',
    flagReason: 'Automatic check: this review may name an instructor.',
    createdAt: ago(0, 2),
  });
  const busiAuthor = reviewers.find((u) => majorName.get(String(u.majorId)) === 'Business Administration');
  const reportedBusi = await placeReview({
    courseId: courses['BUSI 210']._id,
    universityId: aubh._id,
    userId: busiAuthor._id,
    authorLabel: labelOf(busiAuthor),
    semester: 'Spring 2026',
    ratings: { difficulty: 1, workload: 1, usefulness: 1, fairness: 2, overall: 1 },
    text: 'This course is a total joke and a waste of a semester. Nothing in it is new.',
    createdAt: ago(1, 3),
  });
  const spamAuthor = reviewers[11];
  await M.Review.deleteOne({ courseId: courses['COSC 484']._id, userId: spamAuthor._id, semester: 'Spring 2026' });
  const reportedSpam = await placeReview({
    courseId: courses['COSC 484']._id,
    universityId: aubh._id,
    userId: spamAuthor._id,
    authorLabel: labelOf(spamAuthor),
    semester: 'Spring 2026',
    ratings: { difficulty: 3, workload: 3, usefulness: 3, fairness: 3, overall: 3 },
    text: 'Buy my notes on WhatsApp, all assignments solved, message me for the number.',
    createdAt: ago(2, 5),
  });

  /* ---------- Resources ---------- */
  const fileCache = {};
  async function fileFor(kind, title, pages) {
    let buffer;
    if (kind === 'pdf') buffer = makePdf(title, pages, title.includes('JWT') ? JWT_LINES : DEFAULT_LINES);
    else if (kind === 'docx') buffer = makeDocx(title, DEFAULT_LINES);
    else buffer = fileCache.png || (fileCache.png = makePng());
    const saved = await storage.save({ buffer, format: kind === 'img' ? 'png' : kind });
    return {
      ...saved,
      format: kind === 'img' ? 'png' : kind,
      sizeBytes: buffer.length,
      pages: kind === 'pdf' ? pages : undefined,
      originalName: `${title}.${kind === 'img' ? 'png' : kind}`,
    };
  }
  const JWT_LINES = [
    'router.post("/login", rateLimit, async (req, res) => {',
    '  const token = jwt.sign({ id: user.id }, SECRET);',
    '  res.cookie("token", token, { httpOnly: true });',
    '});',
    '',
    '1. Hash passwords with bcrypt (12 rounds).',
    '2. Sign a short-lived JWT and store it in an httpOnly cookie.',
    '3. Check the role in Express middleware on every protected route.',
  ];
  const DEFAULT_LINES = ['Summary notes shared by a student.', 'Key definitions, worked examples and exam tips.'];

  const uploaders = [talal, ...reviewers.slice(0, 30)];
  async function addResource(code, def) {
    const course = courses[code];
    const uploader = def.uploader || uploaders[Math.floor(rand() * uploaders.length)];
    const file = def.kind && def.kind !== 'tip' ? await fileFor(def.kind, def.title, def.pages || 1 + Math.floor(rand() * 4)) : undefined;
    const r = await M.Resource.create({
      courseId: course._id,
      universityId: aubh._id,
      majorIds: course.majorIds,
      uploaderId: uploader._id,
      uploaderLabel: labelOf(uploader),
      type: def.type,
      title: def.title,
      description: def.description || '',
      semester: def.semester || PAST[Math.floor(rand() * PAST.length)],
      tags: def.tags || [],
      file,
      text: def.kind === 'tip' ? def.text : '',
      helpfulCount: def.helpful || 0,
      downloadCount: def.downloads ?? Math.floor(rand() * 60),
      status: def.status || 'published',
      createdAt: def.at || ago(30 + Math.floor(rand() * 300)),
    });
    if (def.helpful) await votesFor('resource', r._id, def.helpful, uploader._id);
    return r;
  }

  const expressCheat = await addResource('COSC 484', {
    uploader: renad,
    kind: 'pdf',
    pages: 4,
    type: 'formula_sheet',
    title: 'Express + JWT auth cheat sheet',
    description:
      'One-page summary of the login flow we built for the project: hashing with bcrypt, signing a JWT, storing it in an httpOnly cookie, and checking roles in Express middleware.',
    semester: 'Spring 2026',
    tags: ['jwt', 'express', 'final'],
    helpful: 41,
    downloads: 188,
    at: new Date('2026-04-12T10:00:00Z'),
  });
  const week9 = await addResource('COSC 484', {
    kind: 'pdf',
    pages: 6,
    type: 'notes',
    title: 'Week 9 notes: sessions, cookies and tokens',
    semester: 'Fall 2025',
    tags: ['cookies', 'security'],
    helpful: 18,
  });
  await addResource('COSC 484', {
    kind: 'tip',
    type: 'tips',
    title: 'Test your auth middleware before the frontend',
    semester: 'Spring 2026',
    text: 'Write Supertest cases for every protected route first; it saved our group a week in Sprint 3.',
    description: 'Write Supertest cases for every protected route first; it saved our group a week in Sprint 3.',
    tags: ['testing', 'auth'],
    helpful: 12,
  });
  const owasp = await addResource('COSC 484', {
    kind: 'docx',
    type: 'study_guide',
    title: 'OWASP Top 10 summary for the security plan',
    semester: 'Fall 2025',
    tags: ['owasp', 'report'],
    helpful: 9,
  });
  const midGuide = await addResource('COSC 484', {
    uploader: renad,
    kind: 'docx',
    type: 'study_guide',
    title: 'Mid-term study guide',
    semester: 'Fall 2025',
    tags: ['midterm'],
    helpful: 29,
    downloads: 96,
  });
  const extra484 = [
    ['notes', 'pdf', 'React hooks lecture notes', ['react', 'hooks']],
    ['notes', 'pdf', 'REST API design notes', ['rest', 'api']],
    ['notes', 'docx', 'MongoDB and Mongoose basics', ['mongodb']],
    ['notes', 'pdf', 'Week 3 notes: HTML and accessibility', ['html', 'a11y']],
    ['notes', 'pdf', 'Week 5 notes: CSS layout with flexbox and grid', ['css']],
    ['notes', 'img', 'Whiteboard photo: MVC diagram', ['mvc']],
    ['notes', 'pdf', 'Deployment walkthrough (Vercel + Render)', ['deployment']],
    ['study_guide', 'pdf', 'Final exam study guide', ['final']],
    ['study_guide', 'docx', 'Lab 6 checklist', ['labs']],
    ['study_guide', 'pdf', 'Testing with Jest and Playwright', ['testing']],
    ['formula_sheet', 'pdf', 'HTTP status codes one-pager', ['http']],
    ['formula_sheet', 'img', 'Git commands cheat sheet', ['git']],
    ['tips', 'tip', 'Use feature branches from day one', ['git']],
    ['tips', 'tip', 'Run Lighthouse before every demo', ['lighthouse']],
    ['tips', 'tip', 'Seed your database for the demo', ['demo']],
    ['tips', 'tip', 'Write the README as you go', ['docs']],
    ['other', 'pdf', 'Sample project proposal outline', ['proposal']],
    ['other', 'docx', 'Poster template notes', ['poster']],
    ['notes', 'pdf', 'Authentication vs authorization notes', ['auth']],
  ];
  for (const [type, kind, title, tags] of extra484) {
    await addResource('COSC 484', {
      type,
      kind,
      title,
      tags,
      helpful: Math.floor(rand() * 8),
      text: kind === 'tip' ? `${title}. It makes the final weeks much calmer.` : undefined,
    });
  }
  const normalise = await addResource('COSC 330', {
    uploader: renad,
    kind: 'tip',
    type: 'tips',
    title: 'Normalise before you index',
    semester: 'Fall 2025',
    text: 'Get the schema to 3NF first, then add indexes for the queries you actually run.',
    tags: ['sql', 'normalisation'],
    helpful: 10,
    downloads: 0,
  });
  const truth = await addResource('MATH 201', {
    uploader: renad,
    kind: 'img',
    type: 'formula_sheet',
    title: 'Truth tables, one page',
    semester: 'Fall 2025',
    tags: ['logic'],
    status: 'hidden',
    downloads: 28,
  });
  const examAnswers = await addResource('COSC 220', {
    kind: 'pdf',
    type: 'other',
    title: 'Final exam answers (scanned)',
    tags: ['final'],
    at: ago(0, 5),
  });
  const week3 = await addResource('COSC 101', { kind: 'pdf', type: 'notes', title: 'Week 3 notes', tags: ['week3'], at: ago(1, 4) });
  for (const [code, list] of Object.entries({
    'COSC 101': ['Python basics cheat sheet', 'Loops and functions practice', 'Mid-term past paper notes'],
    'COSC 220': ['Big-O cheat sheet', 'Tree traversal notes', 'Graph algorithms summary'],
    'COSC 330': ['SQL joins one-pager', 'ER diagram examples'],
    'MATH 201': ['Proof techniques guide', 'Combinatorics formulas'],
    'COSC 470': ['Scrum roles summary', 'UML diagrams cheat sheet'],
    'BUSI 101': ['Management theories summary'],
    'ACCT 201': ['Journal entries practice'],
    'GRDS 320': ['Usability testing checklist'],
  })) {
    for (const title of list) {
      await addResource(code, {
        kind: rand() > 0.3 ? 'pdf' : 'docx',
        type: rand() > 0.5 ? 'notes' : 'study_guide',
        title,
        tags: [],
        helpful: Math.floor(rand() * 15),
      });
    }
  }

  /* ---------- Mid-semester ratings (current term) ---------- */
  const midMeans = { pace: spread(12, 3.5), workload: spread(12, 4.2), clarity: spread(12, 3.8), fairness: spread(12, 3.6) };
  const midComments = {
    0: ['Section 01', 'Lab instructions are clear; lectures move fast.'],
    1: ['Section 02', 'The mid-term matched the practice questions closely.'],
    2: ['Section 01', 'Pace picked up a lot after week 5. Start the project before the mid-term.'],
  };
  const midPool = shuffle(reviewers).slice(0, 12);
  for (let i = 0; i < 12; i += 1) {
    await M.MidtermRating.create({
      courseId: courses['COSC 484']._id,
      universityId: aubh._id,
      userId: midPool[i]._id,
      authorLabel: labelOf(midPool[i]),
      semester: CURRENT,
      section: midComments[i]?.[0] || (i % 2 ? 'Section 02' : 'Section 01'),
      assessment: 'midterm',
      ratings: { pace: midMeans.pace[i], workload: midMeans.workload[i], clarity: midMeans.clarity[i], fairness: midMeans.fairness[i] },
      comment: midComments[i]?.[1] || '',
      createdAt: ago(i < 3 ? 3 - i : 10 + i),
    });
  }
  for (const code of ['COSC 470', 'COSC 360']) {
    await M.MidtermRating.create({
      courseId: courses[code]._id,
      universityId: aubh._id,
      userId: renad._id,
      authorLabel: labelOf(renad),
      semester: CURRENT,
      section: 'Section 01',
      assessment: 'midterm',
      ratings: { pace: 4, workload: 4, clarity: 3, fairness: 4 },
      comment: code === 'COSC 470' ? 'Sprint 2 is the busiest week; plan around it.' : '',
      createdAt: ago(6),
    });
  }
  for (const code of ['COSC 220', 'COSC 330', 'MATH 201']) {
    const pool = shuffle(reviewers).slice(0, 6);
    for (const u of pool) {
      await M.MidtermRating.create({
        courseId: courses[code]._id,
        universityId: aubh._id,
        userId: u._id,
        authorLabel: labelOf(u),
        semester: CURRENT,
        section: 'Section 01',
        assessment: 'midterm',
        ratings: {
          pace: 3 + Math.floor(rand() * 2),
          workload: 3 + Math.floor(rand() * 3),
          clarity: 3 + Math.floor(rand() * 2),
          fairness: 3 + Math.floor(rand() * 3),
        },
        createdAt: ago(5),
      });
    }
  }

  /* ---------- Reports ---------- */
  let n = 130;
  const report = (targetType, target, reason, comment, reporter, at, status = 'open', extra = {}) =>
    M.Report.create({
      number: (n += 1),
      reporterId: reporter?._id ?? null,
      targetType,
      targetId: target._id,
      universityId: aubh._id,
      courseId: target.courseId,
      reason,
      comment,
      status,
      createdAt: at,
      ...extra,
    });
  await report('review', reportedMath, 'names_instructor', 'Automatic check', null, ago(0, 2));
  n = 141;
  await report('review', reportedMath, 'names_instructor', 'It is about a person, not the course.', reviewers[20], ago(0, 2));
  await report('review', reportedMath, 'names_instructor', '', reviewers[21], ago(0, 3));
  await report('review', reportedMath, 'offensive', 'Rude about a staff member.', reviewers[22], ago(0, 4));
  await report('resource', examAnswers, 'not_allowed', 'These are the real exam answers.', reviewers[23], ago(0, 5));
  await report('resource', examAnswers, 'not_allowed', '', reviewers[24], ago(0, 4));
  await report('review', reportedBusi, 'offensive', 'Not constructive.', reviewers[25], ago(1, 2));
  await report('resource', week3, 'wrong_course', 'These are COSC 220 notes.', reviewers[26], ago(1, 1));
  for (let i = 0; i < 4; i += 1)
    await report('review', reportedSpam, 'spam', i === 0 ? 'Selling notes.' : '', reviewers[27 + i], ago(2, 5 - i));
  await M.Counter.create({ _id: 'report', seq: 200 });

  // Moderation history + audit log (Moderation log and Statistics wireframes)
  const handled = [];
  for (let i = 0; i < 12; i += 1) {
    const t = await addResource(i % 2 ? 'COSC 220' : 'COSC 101', {
      kind: 'pdf',
      type: 'other',
      title: `Removed upload ${i + 1}`,
      status: 'hidden',
      at: ago(10 + i),
    });
    handled.push(
      report('resource', t, i % 3 ? 'not_allowed' : 'spam', '', reviewers[40 + i], ago(10 + i), 'hidden', {
        handledBy: renad._id,
        handledAt: ago(9 + i),
      }),
    );
  }
  for (let i = 0; i < 31; i += 1) {
    const target = (
      await M.Review.find({ courseId: courses[['COSC 484', 'COSC 220', 'BUSI 101'][i % 3]]._id })
        .skip(i)
        .limit(1)
    )[0];
    if (target)
      handled.push(
        report('review', target, 'other', '', reviewers[50 + (i % 25)], ago(5 + i), 'dismissed', {
          handledBy: i % 2 ? renad._id : modB._id,
          handledAt: ago(4 + i),
        }),
      );
  }
  await Promise.all(handled);

  const log = (user, action, targetLabel, note, at, detail, targetType = 'review') =>
    M.AuditLog.create({
      userId: user._id,
      actorLabel: user.role === 'admin' ? 'Admin' : user === renad ? 'Moderator A' : 'Moderator B',
      actorRole: user.role,
      action,
      targetType,
      targetLabel,
      note,
      detail,
      universityId: aubh._id,
      createdAt: at,
    });
  const today = (h, m) => {
    const d = new Date();
    d.setHours(h, m, 0, 0);
    return d > new Date() ? ago(0, 1) : d;
  };
  await log(admin, 'major_added', 'Accounting & Finance', '', ago(13), 'Added major', 'major');
  await log(renad, 'dismissed', 'Resource on COSC 101', 'Correct course', ago(12), 'Dismissed reports on a resource', 'resource');
  await log(modB, 'restored', 'Review on BUSI 210', 'Hidden by mistake', ago(1, 2), 'Restored a review');
  await log(renad, 'hidden', 'Resource on COSC 220', 'Exam answers', ago(1, 4), 'Hid a resource', 'resource');
  await log(admin, 'course_archived', 'COSC 290', '', ago(1, 5), 'Archived course', 'course');
  await log(admin, 'role_changed', 'Renad Ibrahim', '', ago(1, 6), 'Changed role: Student → Moderator', 'user');
  await log(modB, 'dismissed', 'Review on COSC 484', 'Opinion, not abuse', today(9, 15), 'Dismissed reports on a review');
  await log(renad, 'hidden', 'Review on MATH 201', 'Names an instructor', today(10, 42), 'Hid a review');
  await log(admin, 'suggestion_approved', 'COSC 499', '', today(11, 2), 'Approved course suggestion', 'course');

  /* ---------- Course suggestions ---------- */
  await M.CourseSuggestion.create([
    {
      universityId: aubh._id,
      majorId: majors.COSC._id,
      code: 'COSC 499',
      title: 'Special Topics in Computing',
      requestedBy: reviewers.slice(0, 5).map((u) => u._id),
      createdAt: ago(2),
    },
    {
      universityId: aubh._id,
      majorId: majors.INTD._id,
      code: 'INTD 330',
      title: 'Lighting Design',
      requestedBy: reviewers.slice(5, 7).map((u) => u._id),
      createdAt: ago(4),
    },
    {
      universityId: aubh._id,
      majorId: majors.BUSI._id,
      code: 'BUSI 415',
      title: 'Entrepreneurship Lab',
      requestedBy: [reviewers[8]._id],
      createdAt: ago(7),
    },
  ]);
  for (let i = 0; i < 18; i += 1) {
    await M.CourseSuggestion.create({
      universityId: aubh._id,
      majorId: majors.COSC._id,
      code: `COSC ${500 + i}`,
      title: `Approved course ${i + 1}`,
      status: 'approved',
      requestedBy: [reviewers[i]._id],
      createdAt: ago(30 + i),
    });
  }
  for (let i = 0; i < 4; i += 1) {
    await M.CourseSuggestion.create({
      universityId: aubh._id,
      majorId: majors.BUSI._id,
      code: `BUSI ${490 + i}`,
      title: `Duplicate request ${i + 1}`,
      status: 'rejected',
      requestedBy: [reviewers[i]._id],
      createdAt: ago(40 + i),
    });
  }

  /* ---------- Bookmarks ---------- */
  await M.Bookmark.insertMany([
    { userId: renad._id, targetType: 'course', targetId: courses['COSC 470']._id },
    { userId: renad._id, targetType: 'course', targetId: courses['COSC 360']._id },
    { userId: renad._id, targetType: 'resource', targetId: expressCheat._id },
    { userId: renad._id, targetType: 'resource', targetId: midGuide._id },
    { userId: renad._id, targetType: 'resource', targetId: week9._id },
    { userId: renad._id, targetType: 'resource', targetId: owasp._id },
    { userId: renad._id, targetType: 'review', targetId: r470._id },
  ]);
  void rMath;
  void normalise;
  void truth;

  /* ---------- Summaries ---------- */
  for (const c of Object.values(courses)) await recalculateCourse(c._id);

  const counts = await Promise.all([
    M.User.countDocuments(),
    M.Course.countDocuments(),
    M.Review.countDocuments(),
    M.Resource.countDocuments(),
  ]);
  console.log(`Done: ${counts[0]} users, ${counts[1]} courses, ${counts[2]} reviews, ${counts[3]} resources.`);
  console.log(
    `Demo log-ins (password "${DEMO_PASSWORD}"): student@aubh.edu.bh (moderator), student2@aubh.edu.bh (student), admin@aubh.edu.bh (admin)`,
  );
}

if (require.main === module) {
  seed()
    .then(() => mongoose.disconnect())
    .catch(async (err) => {
      console.error(err);
      await mongoose.disconnect();
      process.exit(1);
    });
}

module.exports = { seed, DEMO_PASSWORD };
