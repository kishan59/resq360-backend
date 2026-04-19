import { prisma } from '../config/db.js';
import {
  extractSyncMeta,
  validateSyncMeta,
  getExistingSyncMutation,
  createSyncResponse,
  saveSyncMutation
} from '../utils/sync.js';

export const createMedicalLog = async (req, res) => {
  try {
    const { audio_log_url, text_translation, is_vet_update } = req.body;
    const patient_id = req.body.patient_id || req.params.id;
    const logged_by_id = req.user.id;

    const syncMeta = extractSyncMeta(req.body);
    const syncError = validateSyncMeta(syncMeta);
    if (syncError) {
      return res.status(400).json({ status: 'error', message: syncError });
    }

    const existingMutation = await getExistingSyncMutation(syncMeta.clientMutationId);
    if (existingMutation?.response_json) {
      return res.status(200).json(existingMutation.response_json);
    }

    if (!patient_id || !audio_log_url) {
      return res.status(400).json({ status: 'error', message: 'Patient ID and Audio Log URL are required.' });
    }

    const newLog = await prisma.medicalLog.create({
      data: {
        patient_id,
        logged_by_id,
        audio_log_url,
        text_translation: text_translation || null,
        is_vet_update: is_vet_update || false
      }
    });

    const responsePayload = createSyncResponse({
      status: 'applied',
      entityId: newLog.id,
      serverVersion: newLog.updated_at.toISOString(),
      data: newLog,
      message: 'Audio treatment log saved successfully.'
    });

    await saveSyncMutation({
      clientMutationId: syncMeta.clientMutationId,
      deviceId: syncMeta.deviceId,
      entityType: 'MedicalLog',
      entityId: newLog.id,
      operation: 'create',
      status: 'applied',
      responseJson: responsePayload
    });

    res.status(201).json({
      status: 'success',
      ...responsePayload
    });

  } catch (error) {
    console.error("Error creating medical log:", error);
    res.status(500).json({ 
      status: 'error', 
      message: 'Failed to save medical log.',
      error: error.message
    });
  }
};

export const getPatientLogs = async (req, res) => {
  try {
    const patient_id = req.params.patient_id || req.params.id;

    const logs = await prisma.medicalLog.findMany({
      where: { patient_id, deleted_at: null },
      orderBy: { created_at: 'desc' },
      include: {
        user: {
          select: { name: true, role: true }
        }
      }
    });

    res.status(200).json({
      status: 'success',
      results: logs.length,
      data: logs
    });

  } catch (error) {
    console.error("Error fetching patient logs:", error);
    res.status(500).json({ 
      status: 'error', 
      message: 'Failed to fetch medical history.',
      error: error.message
    });
  }
};