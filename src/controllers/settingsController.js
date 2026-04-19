import { prisma } from '../config/db.js';
import { writeAuditLog } from '../utils/audit.js';
import {
  extractSyncMeta,
  validateSyncMeta,
  getExistingSyncMutation,
  createSyncResponse,
  saveSyncMutation,
  hasVersionConflict,
  buildConflictResponse
} from '../utils/sync.js';

export const getAppSettings = async (req, res) => {
  try {
    const settings = await prisma.appSettings.findUnique({
      where: { id: 1 }
    });

    if (!settings) {
      return res.status(200).json({
        status: 'success',
        data: { input_level: 1, allow_video_uploads: false }
      });
    }

    res.status(200).json({
      status: 'success',
      data: settings
    });

  } catch (error) {
    console.error("Error fetching settings:", error);
    res.status(500).json({ status: 'error', message: 'Failed to fetch app settings.' });
  }
};

export const updateAppSettings = async (req, res) => {
  try {
    const { input_level, allow_video_uploads } = req.body;

    const syncMeta = extractSyncMeta(req.body);
    const syncError = validateSyncMeta(syncMeta);
    if (syncError) {
      return res.status(400).json({ status: 'error', message: syncError });
    }

    const existingMutation = await getExistingSyncMutation(syncMeta.clientMutationId);
    if (existingMutation?.response_json) {
      return res.status(200).json(existingMutation.response_json);
    }

    const previousSettings = await prisma.appSettings.findUnique({ where: { id: 1 } });
    if (previousSettings && hasVersionConflict(previousSettings, syncMeta.baseVersion)) {
      return res.status(409).json({ status: 'error', ...buildConflictResponse({ entity: previousSettings, changedFields: syncMeta.changedFields }) });
    }

    const updatedSettings = await prisma.appSettings.upsert({
      where: { id: 1 },
      update: {
        input_level: input_level !== undefined ? input_level : undefined,
        allow_video_uploads: allow_video_uploads !== undefined ? allow_video_uploads : undefined
      },
      create: {
        id: 1,
        input_level: input_level || 1,
        allow_video_uploads: allow_video_uploads || false
      }
    });

    await writeAuditLog({
      actorId: req.user.id,
      entityType: 'AppSettings',
      entityId: '1',
      action: 'UPDATE_APP_SETTINGS',
      beforeJson: previousSettings,
      afterJson: updatedSettings
    });

    const responsePayload = createSyncResponse({
      status: 'applied',
      entityId: '1',
      serverVersion: updatedSettings.updated_at.toISOString(),
      data: updatedSettings,
      message: 'App settings updated successfully.'
    });

    await saveSyncMutation({
      clientMutationId: syncMeta.clientMutationId,
      deviceId: syncMeta.deviceId,
      entityType: 'AppSettings',
      entityId: '1',
      operation: 'update',
      status: 'applied',
      responseJson: responsePayload
    });

    res.status(200).json({
      status: 'success',
      ...responsePayload
    });

  } catch (error) {
    console.error("Error updating settings:", error);
    res.status(500).json({ status: 'error', message: 'Failed to update settings.' });
  }
};