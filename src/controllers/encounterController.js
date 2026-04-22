import { prisma } from '../config/db.js';
import { normalizePhoneNumber } from '../utils/phone.js';
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

const OWNER_ONLY_FIELDS = new Set(['pickup_lat', 'pickup_lon', 'pickup_accuracy_m', 'pickup_captured_at']);

export const createEncounter = async (req, res) => {
  try {
    const {
      initial_media_url,
      initial_media_is_video,
      initial_audio_url,
      pickup_lat,
      pickup_lon,
      pickup_accuracy_m,
      pickup_captured_at,
      reporter_name,  
      reporter_phone,
      reporter_is_anonymous,
      qr_code_id
    } = req.body; 

    const syncMeta = extractSyncMeta(req.body);
    const syncError = validateSyncMeta(syncMeta);

    if (syncError) {
      return res.status(400).json({ status: 'error', message: syncError });
    }

    const existingMutation = await getExistingSyncMutation(syncMeta.clientMutationId);
    if (existingMutation?.response_json) {
      return res.status(200).json(existingMutation.response_json);
    }

    const created_by_id = req.user.id;

    if (!initial_media_url || pickup_lat === undefined || pickup_lon === undefined) {
      return res.status(400).json({
        status: 'error',
        message: 'Missing required field data. Media URL and GPS coordinates are strictly required.'
      });
    }

    // Validate GPS coordinates are within valid ranges (latitude: -90 to 90, longitude: -180 to 180)
    if (typeof pickup_lat !== 'number' || pickup_lat < -90 || pickup_lat > 90) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid latitude. Must be between -90 and 90.'
      });
    }
    if (typeof pickup_lon !== 'number' || pickup_lon < -180 || pickup_lon > 180) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid longitude. Must be between -180 and 180.'
      });
    }

    // Validate pickup_captured_at is valid date and not in the future
    if (pickup_captured_at) {
      const capturedDate = new Date(pickup_captured_at);
      if (isNaN(capturedDate.getTime())) {
        return res.status(400).json({
          status: 'error',
          message: 'Invalid date format for pickup_captured_at.'
        });
      }
      if (capturedDate > new Date()) {
        return res.status(400).json({
          status: 'error',
          message: 'pickup_captured_at cannot be in the future.'
        });
      }
    }

    const normalizedReporterPhone = normalizePhoneNumber(reporter_phone);
    const isReporterAnonymous = reporter_is_anonymous !== false;

    if (!isReporterAnonymous && !normalizedReporterPhone) {
      return res.status(400).json({
        status: 'error',
        message: 'Reporter phone is required for non-anonymous good samaritan records.'
      });
    }

    if (reporter_phone && !normalizedReporterPhone) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid reporter phone number format.'
      });
    }

    const newEncounter = await prisma.$transaction(async (tx) => {
      let finalReporterId = null;

      if (!isReporterAnonymous && normalizedReporterPhone) {
        let reporterRecord = await tx.reporter.findUnique({
          where: { phone_e164: normalizedReporterPhone }
        });

        if (!reporterRecord) {
          reporterRecord = await tx.reporter.create({
            data: {
              name: reporter_name || null, 
              phone_number: normalizedReporterPhone,
              phone_e164: normalizedReporterPhone,
              is_anonymous: false
            }
          });
        } else if (!reporterRecord.name && reporter_name) {
          reporterRecord = await tx.reporter.update({
            where: { id: reporterRecord.id },
            data: { name: reporter_name }
          });
        }

        finalReporterId = reporterRecord.id;
      }

      return await tx.encounter.create({
        data: {
          initial_media_url,
          initial_media_is_video: initial_media_is_video || false,
          initial_audio_url: initial_audio_url || null,
          pickup_lat,
          pickup_lon,
          pickup_accuracy_m: pickup_accuracy_m ?? null,
          pickup_captured_at: pickup_captured_at ? new Date(pickup_captured_at) : null,
          qr_code_id: qr_code_id || null,
          created_by_id,         
          reporter_id: finalReporterId, 
          status: 'PENDING_SHELTER_INTAKE'
        }
      });
    });

    const responsePayload = createSyncResponse({
      status: 'applied',
      entityId: newEncounter.id,
      serverVersion: newEncounter.updated_at.toISOString(),
      data: newEncounter,
      message: 'Rescue initiated securely. Reporter linked.'
    });

    await saveSyncMutation({
      clientMutationId: syncMeta.clientMutationId,
      deviceId: syncMeta.deviceId,
      entityType: 'Encounter',
      entityId: newEncounter.id,
      operation: 'create',
      status: 'applied',
      responseJson: responsePayload
    });

    res.status(201).json({
      status: 'success',
      ...responsePayload
    });

  } catch (error) {
    console.error("Error starting field encounter:", error);
    res.status(500).json({ status: 'error', message: 'Failed to secure field data.', error: error.message });
  }
};

export const getReporterSummary = async (req, res) => {
  try {
    const rawPhone = req.query.phone || req.params.phone;
    const normalizedPhone = normalizePhoneNumber(rawPhone);

    if (!normalizedPhone) {
      return res.status(400).json({
        status: 'error',
        message: 'A valid reporter phone number is required.'
      });
    }

    const reporter = await prisma.reporter.findUnique({
      where: { phone_e164: normalizedPhone },
      include: {
        _count: {
          select: {
            encounters: true
          }
        }
      }
    });

    if (!reporter || reporter.deleted_at) {
      return res.status(404).json({
        status: 'error',
        message: 'Reporter not found.'
      });
    }

    return res.status(200).json({
      status: 'success',
      data: {
        id: reporter.id,
        name: reporter.name,
        phone_number: reporter.phone_number,
        total_report_count: reporter._count.encounters
      }
    });
  } catch (error) {
    console.error('Error fetching reporter summary:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Failed to fetch reporter summary.'
    });
  }
};

export const getEncounterById = async (req, res) => {
  try {
    const { id } = req.params;
    const encounter = await prisma.encounter.findUnique({
      where: { id },
      include: {
        reporter: true,
        patient: true,
        created_by: {
          select: { id: true, name: true, role: true }
        }
      }
    });

    if (!encounter || encounter.deleted_at) {
      return res.status(404).json({ status: 'error', message: 'Encounter not found.' });
    }

    res.status(200).json({ status: 'success', data: encounter });
  } catch (error) {
    console.error('Error fetching encounter:', error);
    res.status(500).json({ status: 'error', message: 'Failed to fetch encounter.' });
  }
};

export const updateEncounter = async (req, res) => {
  try {
    const { id } = req.params;
    const syncMeta = extractSyncMeta(req.body);
    const syncError = validateSyncMeta(syncMeta);
    if (syncError) return res.status(400).json({ status: 'error', message: syncError });

    const existingMutation = await getExistingSyncMutation(syncMeta.clientMutationId);
    if (existingMutation?.response_json) {
      return res.status(200).json(existingMutation.response_json);
    }

    const existing = await prisma.encounter.findUnique({ where: { id } });
    if (!existing || existing.deleted_at) {
      return res.status(404).json({ status: 'error', message: 'Encounter not found.' });
    }

    if (hasVersionConflict(existing, syncMeta.baseVersion)) {
      return res.status(409).json({ status: 'error', ...buildConflictResponse({ entity: existing, changedFields: syncMeta.changedFields }) });
    }

    const updates = {};
    const allowedFields = [
      'initial_media_url',
      'initial_media_is_video',
      'initial_audio_url',
      'pickup_lat',
      'pickup_lon',
      'pickup_accuracy_m',
      'pickup_captured_at',
      'qr_code_id'
    ];

    for (const field of allowedFields) {
      if (req.body[field] === undefined) continue;

      if (OWNER_ONLY_FIELDS.has(field) && req.user.role !== 'OWNER') {
        return res.status(403).json({
          status: 'error',
          message: `Only OWNER can modify ${field}.`
        });
      }

      updates[field] = field === 'pickup_captured_at' && req.body[field]
        ? new Date(req.body[field])
        : req.body[field];
    }

    const updated = await prisma.encounter.update({ where: { id }, data: updates });

    await writeAuditLog({
      actorId: req.user.id,
      entityType: 'Encounter',
      entityId: id,
      action: 'UPDATE_ENCOUNTER',
      beforeJson: existing,
      afterJson: updated
    });

    const responsePayload = createSyncResponse({
      status: 'applied',
      entityId: updated.id,
      serverVersion: updated.updated_at.toISOString(),
      data: updated,
      message: 'Encounter updated successfully.'
    });

    await saveSyncMutation({
      clientMutationId: syncMeta.clientMutationId,
      deviceId: syncMeta.deviceId,
      entityType: 'Encounter',
      entityId: updated.id,
      operation: 'update',
      status: 'applied',
      responseJson: responsePayload
    });

    res.status(200).json({ status: 'success', ...responsePayload });
  } catch (error) {
    console.error('Error updating encounter:', error);
    res.status(500).json({ status: 'error', message: 'Failed to update encounter.', error: error.message });
  }
};