const request = require('supertest');
const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const { createApp } = require('../src/app');
const M = require('../src/models');

let mongod;
const app = createApp();

async function startDb() {
  mongod = await MongoMemoryServer.create();
  // Jest's CommonJS sandbox cannot run the driver's dynamic import('os'), so pass it in.
  await mongoose.connect(mongod.getUri(), { runtimeAdapters: { os: require('os') } });
  await Promise.all(Object.values(M).map((m) => m.syncIndexes?.()));
}
async function stopDb() {
  await mongoose.disconnect();
  await mongod?.stop();
}
async function clearDb() {
  await Promise.all(Object.values(mongoose.connection.collections).map((c) => c.deleteMany({})));
}

const PASSWORD = 'Password123';

/** Two universities, majors, three courses and users with every role. */
async function fixtures() {
  const aubh = await M.University.create({ name: 'American University of Bahrain', shortName: 'AUBH', emailDomains: ['aubh.edu.bh'] });
  const other = await M.University.create({ name: 'Other University', shortName: 'OU', emailDomains: ['ou.edu.bh'] });
  const cs = await M.Major.create({ universityId: aubh._id, name: 'Computer Science', code: 'COSC' });
  const ouMajor = await M.Major.create({ universityId: other._id, name: 'Business', code: 'BUSI' });
  const web = await M.Course.create({ universityId: aubh._id, majorIds: [cs._id], code: 'COSC 484', title: 'Web Engineering' });
  const db = await M.Course.create({ universityId: aubh._id, majorIds: [cs._id], code: 'COSC 330', title: 'Database Systems' });
  const se = await M.Course.create({ universityId: aubh._id, majorIds: [cs._id], code: 'COSC 470', title: 'Software Engineering' });
  const ouCourse = await M.Course.create({ universityId: other._id, majorIds: [ouMajor._id], code: 'BUSI 101', title: 'Management' });
  const passwordHash = await bcrypt.hash(PASSWORD, 4);
  const mk = (email, role = 'student', uni = aubh, major = cs) =>
    M.User.create({ name: email.split('@')[0], email, passwordHash, role, universityId: uni._id, majorId: major._id, isVerified: true });
  const users = {
    student: await mk('student@aubh.edu.bh'),
    student2: await mk('student2@aubh.edu.bh'),
    moderator: await mk('mod@aubh.edu.bh', 'moderator'),
    otherMod: await mk('mod@ou.edu.bh', 'moderator', other, ouMajor),
    admin: await mk('admin@aubh.edu.bh', 'admin'),
  };
  return { aubh, other, cs, web, db, se, ouCourse, users };
}

/** Returns a supertest agent that keeps the session cookies. */
async function loginAs(email, password = PASSWORD) {
  const agent = request.agent(app);
  const res = await agent.post('/api/auth/login').send({ email, password });
  if (res.status !== 200) throw new Error(`login failed for ${email}: ${res.status} ${res.body.error}`);
  return agent;
}

const goodReview = (overrides = {}) => ({
  semester: 'Spring 2026',
  ratings: { difficulty: 4, workload: 5, usefulness: 5, fairness: 4, overall: 5 },
  text: 'The group project is the whole course, so start the backend early.',
  ...overrides,
});

module.exports = { app, request, startDb, stopDb, clearDb, fixtures, loginAs, goodReview, PASSWORD, M };
