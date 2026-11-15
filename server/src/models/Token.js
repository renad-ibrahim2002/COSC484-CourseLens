const { Schema, model } = require('mongoose');

// Email verification and password reset tokens. Only a SHA-256 hash is stored.
const tokenSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  type: { type: String, enum: ['verify', 'reset'], required: true },
  tokenHash: { type: String, required: true, index: true },
  expiresAt: { type: Date, required: true },
});
tokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = model('Token', tokenSchema);
