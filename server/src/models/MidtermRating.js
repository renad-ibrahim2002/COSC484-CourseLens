const { Schema, model } = require('mongoose');

const r = { type: Number, min: 1, max: 5, required: true };

const midtermSchema = new Schema(
  {
    courseId: { type: Schema.Types.ObjectId, ref: 'Course', required: true, index: true },
    universityId: { type: Schema.Types.ObjectId, ref: 'University', required: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    authorLabel: { type: String, required: true },
    semester: { type: String, required: true },
    section: { type: String, required: true, trim: true },
    assessment: { type: String, enum: ['midterm', 'final'], required: true },
    ratings: { pace: r, workload: r, clarity: r, fairness: r },
    comment: { type: String, default: '', maxlength: 300 },
    status: { type: String, enum: ['published', 'held', 'hidden'], default: 'published' },
    flagReason: { type: String, default: '' },
  },
  { timestamps: true },
);
midtermSchema.index(
  { userId: 1, courseId: 1, semester: 1, section: 1, assessment: 1 },
  { unique: true, partialFilterExpression: { userId: { $type: 'objectId' } } },
);

module.exports = model('MidtermRating', midtermSchema);
