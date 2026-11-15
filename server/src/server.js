const env = require('./config/env');
const { connect } = require('./db');
const { createApp } = require('./app');

async function main() {
  await connect();
  if (env.seedIfEmpty) {
    const { University } = require('./models');
    if ((await University.estimatedDocumentCount()) === 0) {
      console.log('Empty database: loading the demo catalog (SEED_IF_EMPTY=true)');
      await require('./seed/seed').seed({ keepConnection: true });
    }
  }
  const app = createApp();
  const server = app.listen(env.port, () => console.log(`CourseLens API listening on :${env.port}`));
  const shutdown = () => server.close(() => process.exit(0));
  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
