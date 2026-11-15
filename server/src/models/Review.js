const { Schema, model } = require('mongoose');

const ratingField = { type: Number, min: 1, max: 5, required: true };

const reviewSchema = new Schema(
  {
    courseId: { type: Schema.Types.ObjectId, ref: 'Course', required: true, index: true },
    universityId: { type: Schema.Types.ObjectId, ref: 'University', required: true },
    // Never returned by the public API (NFR-03). Null after the author deletes their account.
    userId: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    authorLabel: { type: String, required: true }, // e.g. "Computer Science student"
    semester: { type: String, required: true },
    ratings: {
      difficulty: ratingField,
      workload: ratingField,
      usefulness: ratingField,
      fairness: ratingField,
      overall: ratingField,
    },
    text: { type: String, default: '', maxlength: 2000 },
    recommendations: {
      takeBefore: [{ type: Schema.Types.ObjectId, ref: 'Course' }],
      takeTogether: [{ type: Schema.Types.ObjectId, ref: 'Course' }],
      avoidTogether: [{ type: Schema.Types.ObjectId, ref: 'Course' }],
    },
    helpfulCount: { type: Number, default: 0 },
    status: { type: String, enum: ['published', 'held', 'hidden'], default: 'published', index: true },
    flagReason: { type: String, default: '' },
  },
  { timestamps: true },
);
reviewSchema.index({ userId: 1, courseId: 1, semester: 1 }, { unique: true, partialFilterExpression: { userId: { $type: 'objectId' } } });
reviewSchema.index({ courseId: 1, status: 1, helpfulCount: -1 });
reviewSchema.index({ text: 'text' });

module.exports = model('Review', reviewSchema);
