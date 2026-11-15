const { Schema, model } = require('mongoose');

const RESOURCE_TYPES = ['notes', 'study_guide', 'tips', 'formula_sheet', 'other'];

const resourceSchema = new Schema(
  {
    courseId: { type: Schema.Types.ObjectId, ref: 'Course', required: true },
    universityId: { type: Schema.Types.ObjectId, ref: 'University', required: true },
    majorIds: [{ type: Schema.Types.ObjectId, ref: 'Major' }],
    uploaderId: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    uploaderLabel: { type: String, required: true },
    type: { type: String, enum: RESOURCE_TYPES, required: true },
    title: { type: String, required: true, trim: true, maxlength: 120 },
    description: { type: String, default: '', maxlength: 1000 },
    semester: { type: String, required: true },
    tags: [{ type: String, lowercase: true, trim: true }],
    // Either a file or a written text tip.
    file: {
      key: String, // storage key (local file name or Cloudinary public id)
      provider: { type: String, enum: ['local', 'cloudinary'] },
      format: { type: String, enum: ['pdf', 'docx', 'png', 'jpg'] },
      sizeBytes: Number,
      pages: Number,
      originalName: String,
    },
    text: { type: String, default: '', maxlength: 4000 },
    helpfulCount: { type: Number, default: 0 },
    downloadCount: { type: Number, default: 0 },
    courseRating: { type: Number, default: 0 }, // copy of the course's overall rating, for the rating filter
    status: { type: String, enum: ['published', 'hidden'], default: 'published', index: true },
  },
  { timestamps: true },
);
resourceSchema.index({ title: 'text', description: 'text', tags: 'text' });
resourceSchema.index({ courseId: 1, type: 1, semester: 1 });
resourceSchema.index({ universityId: 1, status: 1, helpfulCount: -1 });

resourceSchema.virtual('kind').get(function kind() {
  if (this.file && this.file.format) return this.file.format === 'jpg' || this.file.format === 'png' ? 'img' : this.file.format;
  return 'tip';
});

module.exports = model('Resource', resourceSchema);
module.exports.RESOURCE_TYPES = RESOURCE_TYPES;
