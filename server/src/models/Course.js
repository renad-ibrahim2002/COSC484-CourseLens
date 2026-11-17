const { Schema, model } = require('mongoose');

const averagesSchema = new Schema(
  {
    difficulty: { type: Number, default: 0 },
    workload: { type: Number, default: 0 },
    usefulness: { type: Number, default: 0 },
    fairness: { type: Number, default: 0 },
    overall: { type: Number, default: 0 },
  },
  { _id: false },
);

const courseSchema = new Schema(
  {
    universityId: { type: Schema.Types.ObjectId, ref: 'University', required: true },
    majorIds: [{ type: Schema.Types.ObjectId, ref: 'Major', index: true }],
    code: { type: String, required: true, trim: true, uppercase: true },
    title: { type: String, required: true, trim: true },
    credits: { type: Number, min: 0, max: 30, default: 3 },
    description: { type: String, default: '', maxlength: 600 },
    level: { type: Number, default: 100 },
    status: { type: String, enum: ['active', 'archived'], default: 'active', index: true },
    // Denormalised so course pages and lists load fast; refreshed whenever a review changes.
    ratingSummary: {
      count: { type: Number, default: 0 },
      averages: { type: averagesSchema, default: () => ({}) },
      distribution: { type: [Number], default: () => [0, 0, 0, 0, 0] },
      recommendPct: { type: Number, default: 0 },
      semesters: { type: Number, default: 0 },
    },
    resourceCount: { type: Number, default: 0 },
  },
  { timestamps: true },
);
courseSchema.index({ universityId: 1, code: 1 }, { unique: true });
courseSchema.index({ code: 'text', title: 'text' });

courseSchema.pre('validate', function setLevel() {
  const m = /(\d)\d\d/.exec(this.code || '');
  this.level = m ? Number(m[1]) * 100 : 100;
});

module.exports = model('Course', courseSchema);
