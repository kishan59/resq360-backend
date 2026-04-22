import { prisma } from '../config/db.js';

export const extractSyncMeta = (body = {}) => ({
  clientMutationId: body.clientMutationId,
  deviceId: body.deviceId,
  baseVersion: body.baseVersion,
  changedFields: Array.isArray(body.changedFields) ? body.changedFields : [],
  changedAtClientTs: body.changedAtClientTs
});

export const validateSyncMeta = ({ clientMutationId, deviceId }) => {
  if (!clientMutationId || !deviceId) {
    return 'clientMutationId and deviceId are required for write operations.';
  }

  return null;
};

export const getExistingSyncMutation = async (clientMutationId) => {
  return prisma.syncMutation.findUnique({ where: { client_mutation_id: clientMutationId } });
};

export const createSyncResponse = ({
  status,
  entityId,
  serverVersion,
  conflictFields = [],
  resolution = null,
  data = null,
  message = null
}) => ({
  sync: {
    status,
    entityId,
    serverVersion,
    conflictFields,
    resolution
  },
  message,
  data
});

export const saveSyncMutation = async ({
  clientMutationId,
  deviceId,
  entityType,
  entityId,
  operation,
  status,
  resolution,
  conflictFields,
  responseJson
}) => {
  await prisma.syncMutation.create({
    data: {
      client_mutation_id: clientMutationId,
      device_id: deviceId,
      entity_type: entityType,
      entity_id: entityId || null,
      operation,
      status,
      resolution: resolution || null,
      conflict_fields: conflictFields?.length ? conflictFields : undefined,
      response_json: responseJson ?? undefined
    }
  });
};

export const buildConflictResponse = ({ entity, changedFields = [] }) => {
  const serverVersion = entity?.updated_at ? entity.updated_at.toISOString() : null;

  return createSyncResponse({
    status: 'conflict',
    entityId: entity?.id,
    serverVersion,
    conflictFields: changedFields,
    resolution: 'server_wins',
    message: 'Conflict detected. Pull latest server state and retry with updated baseVersion.',
    data: entity
  });
};

export const hasVersionConflict = (entity, baseVersion) => {
  if (!baseVersion || !entity?.updated_at) return false;
  
  // Compare timestamps in milliseconds for timezone-safe comparison
  const serverTs = new Date(entity.updated_at).getTime();
  const clientTs = new Date(baseVersion).getTime();
  
  return serverTs !== clientTs;
};
