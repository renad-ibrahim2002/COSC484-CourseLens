const { Schema, model } = require('mongoose');

const suggestionSchema = new Schema(
  {
    universityId: { type: Schema.Types.ObjectId, ref: 'University', required: true },
    majorId: { type: Schema.Types.ObjectId, ref: 'Major', required: true },
    code: { type: String, required: true, uppercase: true, trim: true },
    title: { type: String, required: true, trim: true },
    credits: { type: Number, default: 3 },
    requestedBy: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending', index: true },
    handledBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true },
);

module.exports = model('CourseSuggestion', suggestionSchema);
