import { prisma } from '../config/db.js';

export const writeAuditLog = async ({ actorId, entityType, entityId, action, beforeJson, afterJson }) => {
  await prisma.auditLog.create({
    data: {
      actor_id: actorId || null,
      entity_type: entityType,
      entity_id: entityId,
      action,
      before_json: beforeJson ?? undefined,
      after_json: afterJson ?? undefined
    }
  });
};
