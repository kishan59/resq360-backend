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

const ALLOWED_VET_TRANSITIONS = {
  PENDING_APPROVAL: new Set(['APPROVED']),
  APPROVED: new Set(['COMPLETED']),
  COMPLETED: new Set([])
};

export const requestVetTrip = async (req, res) => {
  try {
    const { patient_id } = req.body;
    const requested_by_id = req.user.id;

    const syncMeta = extractSyncMeta(req.body);
    const syncError = validateSyncMeta(syncMeta);
    if (syncError) {
      return res.status(400).json({ status: 'error', message: syncError });
    }

    const existingMutation = await getExistingSyncMutation(syncMeta.clientMutationId);
    if (existingMutation?.response_json) {
      return res.status(200).json(existingMutation.response_json);
    }

    if (!patient_id) {
      return res.status(400).json({ status: 'error', message: 'Patient ID is required.' });
    }

    const newTrip = await prisma.vetTrip.create({
      data: {
        patient_id,
        requested_by_id,
        status: 'PENDING_APPROVAL'
      }
    });

    const responsePayload = createSyncResponse({
      status: 'applied',
      entityId: newTrip.id,
      serverVersion: newTrip.updated_at.toISOString(),
      data: newTrip,
      message: 'Vet trip requested. Awaiting Command Center approval.'
    });

    await saveSyncMutation({
      clientMutationId: syncMeta.clientMutationId,
      deviceId: syncMeta.deviceId,
      entityType: 'VetTrip',
      entityId: newTrip.id,
      operation: 'create',
      status: 'applied',
      responseJson: responsePayload
    });

    res.status(201).json({
      status: 'success',
      ...responsePayload
    });

  } catch (error) {
    console.error("Error requesting vet trip:", error);
    res.status(500).json({ 
      status: 'error', 
      message: 'Failed to request vet trip.',
      error: error.message
    });
  }
};

export const updateVetTripStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, scheduled_date } = req.body;

    const syncMeta = extractSyncMeta(req.body);
    const syncError = validateSyncMeta(syncMeta);
    if (syncError) {
      return res.status(400).json({ status: 'error', message: syncError });
    }

    const existingMutation = await getExistingSyncMutation(syncMeta.clientMutationId);
    if (existingMutation?.response_json) {
      return res.status(200).json(existingMutation.response_json);
    }

    if (!['APPROVED', 'COMPLETED'].includes(status)) {
      return res.status(400).json({ 
        status: 'error', 
        message: 'Invalid status. Must be APPROVED or COMPLETED.' 
      });
    }

    const existingTrip = await prisma.vetTrip.findUnique({ where: { id } });
    if (!existingTrip) {
      return res.status(404).json({ status: 'error', message: 'Vet trip not found.' });
    }

    if (hasVersionConflict(existingTrip, syncMeta.baseVersion)) {
      return res.status(409).json({ status: 'error', ...buildConflictResponse({ entity: existingTrip, changedFields: syncMeta.changedFields }) });
    }

    const allowedNext = ALLOWED_VET_TRANSITIONS[existingTrip.status] || new Set();
    if (!allowedNext.has(status)) {
      return res.status(400).json({
        status: 'error',
        message: `Invalid status transition from ${existingTrip.status} to ${status}.`
      });
    }

    if (status === 'APPROVED' && !scheduled_date) {
      return res.status(400).json({
        status: 'error',
        message: 'scheduled_date is required when approving a vet trip.'
      });
    }

    const updatedTrip = await prisma.vetTrip.update({
      where: { id },
      data: { 
        status,
        scheduled_date: scheduled_date ? new Date(scheduled_date) : undefined
      }
    });

    await writeAuditLog({
      actorId: req.user.id,
      entityType: 'VetTrip',
      entityId: id,
      action: 'UPDATE_VET_TRIP_STATUS',
      beforeJson: existingTrip,
      afterJson: updatedTrip
    });

    const responsePayload = createSyncResponse({
      status: 'applied',
      entityId: updatedTrip.id,
      serverVersion: updatedTrip.updated_at.toISOString(),
      data: updatedTrip,
      message: `Vet trip marked as ${status}.`
    });

    await saveSyncMutation({
      clientMutationId: syncMeta.clientMutationId,
      deviceId: syncMeta.deviceId,
      entityType: 'VetTrip',
      entityId: updatedTrip.id,
      operation: 'update',
      status: 'applied',
      responseJson: responsePayload
    });

    res.status(200).json({
      status: 'success',
      ...responsePayload
    });

  } catch (error) {
    console.error("Error updating vet trip:", error);
    res.status(500).json({ 
      status: 'error', 
      message: 'Failed to update vet trip.',
      error: error.message
    });
  }
};

export const getApprovedTrips = async (req, res) => {
  try {
    const trips = await prisma.vetTrip.findMany({
      where: { 
        status: 'APPROVED' 
      },
      orderBy: { 
        scheduled_date: 'asc'
      },
      include: {
        patient: {
          select: { qr_code_id: true, cage_zone: true }
        },
        requester: {
          select: { name: true }
        }
      }
    });

    res.status(200).json({
      status: 'success',
      results: trips.length,
      data: trips
    });

  } catch (error) {
    console.error("Error fetching approved trips:", error);
    res.status(500).json({ 
      status: 'error', 
      message: 'Failed to fetch the Vet Trip Board.',
      error: error.message
    });
  }
};

export const approveVetTrip = async (req, res) => {
  req.body.status = 'APPROVED';
  return updateVetTripStatus(req, res);
};

export const completeVetTrip = async (req, res) => {
  req.body.status = 'COMPLETED';
  return updateVetTripStatus(req, res);
};