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

const ALLOWED_TEMPERAMENTS = new Set(['CALM', 'VIOLENT']);
const ALLOWED_CAGE_ZONES = new Set(['DANGER', 'MEDIUM', 'MINOR', 'FREE_ROAMING']);

const STATUS_TRANSITIONS = {
  IN_SHELTER: new Set(['AT_EXTERNAL_VET', 'RELEASED', 'DECEASED']),
  AT_EXTERNAL_VET: new Set(['IN_SHELTER', 'RELEASED', 'DECEASED']),
  RELEASED: new Set([]),
  DECEASED: new Set([])
};

export const convertEncounterToPatient = async (req, res) => {
  try {
    const { encounter_id, qr_code_id, temperament, cage_zone } = req.body;
    const syncMeta = extractSyncMeta(req.body);
    const syncError = validateSyncMeta(syncMeta);

    if (syncError) {
      return res.status(400).json({ status: 'error', message: syncError });
    }

    const existingMutation = await getExistingSyncMutation(syncMeta.clientMutationId);
    if (existingMutation?.response_json) {
      return res.status(200).json(existingMutation.response_json);
    }

    if (!encounter_id || !cage_zone) {
      return res.status(400).json({ 
        status: 'error', 
        message: 'Encounter ID and Cage Zone are required for intake.' 
      });
    }

    if (!ALLOWED_CAGE_ZONES.has(cage_zone)) {
      return res.status(400).json({ status: 'error', message: 'Invalid cage zone value.' });
    }

    if (temperament && !ALLOWED_TEMPERAMENTS.has(temperament)) {
      return res.status(400).json({ status: 'error', message: 'Invalid temperament value.' });
    }

    const result = await prisma.$transaction(async (tx) => {
      const newPatient = await tx.patient.create({
        data: {
          encounter_id: encounter_id,
          qr_code_id: qr_code_id || null,
          temperament: temperament || 'CALM',
          cage_zone,
          status: 'IN_SHELTER'
        }
      });

      await tx.encounter.update({
        where: { id: encounter_id },
        data: { status: 'MERGED_TO_PATIENT' }
      });

      return newPatient;
    });

    const responsePayload = createSyncResponse({
      status: 'applied',
      entityId: result.id,
      serverVersion: result.updated_at.toISOString(),
      data: result,
      message: 'Animal successfully admitted to the shelter.'
    });

    await saveSyncMutation({
      clientMutationId: syncMeta.clientMutationId,
      deviceId: syncMeta.deviceId,
      entityType: 'Patient',
      entityId: result.id,
      operation: 'create',
      status: 'applied',
      responseJson: responsePayload
    });

    res.status(201).json({
      status: 'success',
      ...responsePayload
    });

  } catch (error) {
    console.error("Error during shelter intake:", error);
    res.status(500).json({ 
      status: 'error', 
      message: 'Failed to process shelter intake.',
      error: error.message
    });
  }
};

export const getPatientById = async (req, res) => {
  try {
    const { id } = req.params;
    const patient = await prisma.patient.findUnique({
      where: { id },
      include: {
        encounter: true,
        media: true,
        vet_trips: true
      }
    });

    if (!patient || patient.deleted_at) {
      return res.status(404).json({ status: 'error', message: 'Patient not found.' });
    }

    res.status(200).json({ status: 'success', data: patient });
  } catch (error) {
    console.error('Error fetching patient:', error);
    res.status(500).json({ status: 'error', message: 'Failed to fetch patient.' });
  }
};

export const updatePatient = async (req, res) => {
  try {
    const { id } = req.params;
    const { temperament, cage_zone, qr_code_id } = req.body;

    const syncMeta = extractSyncMeta(req.body);
    const syncError = validateSyncMeta(syncMeta);
    if (syncError) return res.status(400).json({ status: 'error', message: syncError });

    const existingMutation = await getExistingSyncMutation(syncMeta.clientMutationId);
    if (existingMutation?.response_json) {
      return res.status(200).json(existingMutation.response_json);
    }

    if (temperament && !ALLOWED_TEMPERAMENTS.has(temperament)) {
      return res.status(400).json({ status: 'error', message: 'Invalid temperament value.' });
    }

    if (cage_zone && !ALLOWED_CAGE_ZONES.has(cage_zone)) {
      return res.status(400).json({ status: 'error', message: 'Invalid cage zone value.' });
    }

    const existing = await prisma.patient.findUnique({ where: { id } });
    if (!existing || existing.deleted_at) {
      return res.status(404).json({ status: 'error', message: 'Patient not found.' });
    }

    if (hasVersionConflict(existing, syncMeta.baseVersion)) {
      return res.status(409).json({ status: 'error', ...buildConflictResponse({ entity: existing, changedFields: syncMeta.changedFields }) });
    }

    const updated = await prisma.patient.update({
      where: { id },
      data: {
        temperament: temperament ?? undefined,
        cage_zone: cage_zone ?? undefined,
        qr_code_id: qr_code_id ?? undefined
      }
    });

    await writeAuditLog({
      actorId: req.user.id,
      entityType: 'Patient',
      entityId: id,
      action: 'UPDATE_PATIENT',
      beforeJson: existing,
      afterJson: updated
    });

    const responsePayload = createSyncResponse({
      status: 'applied',
      entityId: updated.id,
      serverVersion: updated.updated_at.toISOString(),
      data: updated,
      message: 'Patient updated successfully.'
    });

    await saveSyncMutation({
      clientMutationId: syncMeta.clientMutationId,
      deviceId: syncMeta.deviceId,
      entityType: 'Patient',
      entityId: updated.id,
      operation: 'update',
      status: 'applied',
      responseJson: responsePayload
    });

    res.status(200).json({ status: 'success', ...responsePayload });
  } catch (error) {
    console.error('Error updating patient:', error);
    res.status(500).json({ status: 'error', message: 'Failed to update patient.', error: error.message });
  }
};

export const updatePatientStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const syncMeta = extractSyncMeta(req.body);
    const syncError = validateSyncMeta(syncMeta);
    if (syncError) return res.status(400).json({ status: 'error', message: syncError });

    const existingMutation = await getExistingSyncMutation(syncMeta.clientMutationId);
    if (existingMutation?.response_json) {
      return res.status(200).json(existingMutation.response_json);
    }

    if (!status || !STATUS_TRANSITIONS[status]) {
      return res.status(400).json({ status: 'error', message: 'Invalid patient status value.' });
    }

    const existing = await prisma.patient.findUnique({ where: { id } });
    if (!existing || existing.deleted_at) {
      return res.status(404).json({ status: 'error', message: 'Patient not found.' });
    }

    if (hasVersionConflict(existing, syncMeta.baseVersion)) {
      return res.status(409).json({ status: 'error', ...buildConflictResponse({ entity: existing, changedFields: syncMeta.changedFields }) });
    }

    const allowedNext = STATUS_TRANSITIONS[existing.status] || new Set();
    if (!allowedNext.has(status)) {
      return res.status(400).json({
        status: 'error',
        message: `Invalid status transition from ${existing.status} to ${status}.`
      });
    }

    // Terminal states are owner-only in MVP.
    if ((status === 'RELEASED' || status === 'DECEASED') && req.user.role !== 'OWNER') {
      return res.status(403).json({
        status: 'error',
        message: 'Only OWNER can mark a patient as RELEASED or DECEASED.'
      });
    }

    const updated = await prisma.patient.update({ where: { id }, data: { status } });

    await writeAuditLog({
      actorId: req.user.id,
      entityType: 'Patient',
      entityId: id,
      action: 'UPDATE_PATIENT_STATUS',
      beforeJson: existing,
      afterJson: updated
    });

    const responsePayload = createSyncResponse({
      status: 'applied',
      entityId: updated.id,
      serverVersion: updated.updated_at.toISOString(),
      data: updated,
      message: `Patient status updated to ${status}.`
    });

    await saveSyncMutation({
      clientMutationId: syncMeta.clientMutationId,
      deviceId: syncMeta.deviceId,
      entityType: 'Patient',
      entityId: updated.id,
      operation: 'update',
      status: 'applied',
      responseJson: responsePayload
    });

    res.status(200).json({ status: 'success', ...responsePayload });
  } catch (error) {
    console.error('Error updating patient status:', error);
    res.status(500).json({ status: 'error', message: 'Failed to update patient status.', error: error.message });
  }
};