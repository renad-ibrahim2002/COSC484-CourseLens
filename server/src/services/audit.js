const { AuditLog } = require('../models');

const actorLabel = (user) =>
  user.role === 'admin' ? 'Admin' : user.role === 'moderator' ? `Moderator ${user.name.split(' ')[0]}` : user.name;

function audit(user, { action, targetType, targetId, targetLabel, detail, note, universityId }) {
  return AuditLog.create({
    userId: user?._id,
    actorLabel: user ? actorLabel(user) : 'System',
    actorRole: user?.role,
    action,
    targetType,
    targetId,
    targetLabel,
    detail,
    note,
    universityId,
  });
}

module.exports = { audit, actorLabel };
