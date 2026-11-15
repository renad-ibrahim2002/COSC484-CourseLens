const { Schema, model } = require('mongoose');

const voteSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    targetType: { type: String, enum: ['review', 'resource'], required: true },
    targetId: { type: Schema.Types.ObjectId, required: true },
  },
  { timestamps: true },
);
// One helpful vote per user per item.
voteSchema.index({ userId: 1, targetType: 1, targetId: 1 }, { unique: true });

module.exports = model('Vote', voteSchema);
