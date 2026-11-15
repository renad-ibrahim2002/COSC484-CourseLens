const { Schema, model } = require('mongoose');

const auditLogSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User' },
    actorLabel: String,
    actorRole: String,
    action: { type: String, required: true, index: true },
    targetType: String,
    targetId: Schema.Types.ObjectId,
    targetLabel: String,
    detail: String,
    note: String,
    universityId: { type: Schema.Types.ObjectId, ref: 'University', index: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);
auditLogSchema.index({ createdAt: -1 });

module.exports = model('AuditLog', auditLogSchema);
