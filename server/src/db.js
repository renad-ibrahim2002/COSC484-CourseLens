const mongoose = require('mongoose');
const env = require('./config/env');

mongoose.set('strictQuery', true);

async function connect(uri = env.mongoUri) {
  await mongoose.connect(uri, { autoIndex: true, serverSelectionTimeoutMS: 10000 });
  return mongoose.connection;
}

module.exports = { connect, mongoose };
