const { Schema, model } = require('mongoose');

const majorSchema = new Schema(
  {
    universityId: { type: Schema.Types.ObjectId, ref: 'University', required: true, index: true },
    name: { type: String, required: true, trim: true },
    code: { type: String, required: true, trim: true, uppercase: true },
    archived: { type: Boolean, default: false },
  },
  { timestamps: true },
);
majorSchema.index({ universityId: 1, code: 1 }, { unique: true });

module.exports = model('Major', majorSchema);
