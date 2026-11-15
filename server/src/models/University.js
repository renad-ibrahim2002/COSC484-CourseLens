const { Schema, model } = require('mongoose');

const universitySchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    shortName: { type: String, required: true, trim: true, uppercase: true },
    location: { type: String, default: 'Bahrain', trim: true },
    // Used to check that a student registers with this university's email (FR-01).
    emailDomains: [{ type: String, lowercase: true, trim: true }],
    status: { type: String, enum: ['active', 'coming_soon', 'archived'], default: 'active' },
    notifyUserIds: [{ type: Schema.Types.ObjectId, ref: 'User' }],
  },
  { timestamps: true },
);
universitySchema.index({ emailDomains: 1 });

module.exports = model('University', universitySchema);
