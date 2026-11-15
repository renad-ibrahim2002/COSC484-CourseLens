process.env.NODE_ENV = 'test';
process.env.UPLOAD_DIR = require('path').join(require('os').tmpdir(), `courselens-test-uploads-${process.pid}`);
// Local runs can point at an installed mongod; CI downloads one automatically.
if (!process.env.MONGOMS_SYSTEM_BINARY && require('fs').existsSync('/opt/mongo/bin/mongod')) {
  process.env.MONGOMS_SYSTEM_BINARY = '/opt/mongo/bin/mongod';
}
