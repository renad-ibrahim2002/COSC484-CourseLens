const { Schema, model } = require('mongoose');

const REPORT_REASONS = ['names_instructor', 'not_allowed', 'offensive', 'wrong_course', 'spam', 'other'];

const reportSchema = new Schema(
  {
    number: { type: Number, index: true },
    reporterId: { type: Schema.Types.ObjectId, ref: 'User', default: null }, // null = automatic check
    targetType: { type: String, enum: ['review', 'midterm', 'resource'], required: true },
    targetId: { type: Schema.Types.ObjectId, required: true, index: true },
    universityId: { type: Schema.Types.ObjectId, ref: 'University', required: true, index: true },
    courseId: { type: Schema.Types.ObjectId, ref: 'Course' },
    reason: { type: String, enum: REPORT_REASONS, required: true },
    comment: { type: String, default: '', maxlength: 300 },
    status: { type: String, enum: ['open', 'hidden', 'dismissed', 'restored'], default: 'open', index: true },
    handledBy: { type: Schema.Types.ObjectId, ref: 'User' },
    handledAt: Date,
  },
  { timestamps: true },
);
reportSchema.index(
  { reporterId: 1, targetType: 1, targetId: 1 },
  { unique: true, partialFilterExpression: { reporterId: { $type: 'objectId' } } },
);

module.exports = model('Report', reportSchema);
module.exports.REPORT_REASONS = REPORT_REASONS;
