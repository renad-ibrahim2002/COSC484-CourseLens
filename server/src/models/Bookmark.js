const { Schema, model } = require('mongoose');

const bookmarkSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    targetType: { type: String, enum: ['course', 'review', 'resource'], required: true },
    targetId: { type: Schema.Types.ObjectId, required: true },
  },
  { timestamps: true },
);
bookmarkSchema.index({ userId: 1, targetType: 1, targetId: 1 }, { unique: true });

module.exports = model('Bookmark', bookmarkSchema);
