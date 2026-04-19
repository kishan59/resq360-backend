import { prisma } from '../config/db.js';
import {
  extractSyncMeta,
  validateSyncMeta,
  getExistingSyncMutation,
  createSyncResponse,
  saveSyncMutation
} from '../utils/sync.js';

export const logInventoryArrival = async (req, res) => {
  try {
    const { item_name, quantity, unit_type } = req.body;
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

    if (!item_name || quantity === undefined) {
      return res.status(400).json({ status: 'error', message: 'Item name and quantity are required.' });
    }

    const parsedQuantity = Number.parseInt(quantity, 10);
    if (!Number.isInteger(parsedQuantity) || parsedQuantity <= 0) {
      return res.status(400).json({ status: 'error', message: 'Quantity must be a positive integer.' });
    }

    const newStock = await prisma.inventoryArrival.create({
      data: {
        item_name,
        quantity: parsedQuantity,
        unit_type: unit_type || null,
        logged_by_id
      }
    });

    const responsePayload = createSyncResponse({
      status: 'applied',
      entityId: newStock.id,
      serverVersion: newStock.updated_at.toISOString(),
      data: newStock,
      message: `${parsedQuantity} ${unit_type || 'units'} of ${item_name} logged successfully.`
    });

    await saveSyncMutation({
      clientMutationId: syncMeta.clientMutationId,
      deviceId: syncMeta.deviceId,
      entityType: 'InventoryArrival',
      entityId: newStock.id,
      operation: 'create',
      status: 'applied',
      responseJson: responsePayload
    });

    res.status(201).json({
      status: 'success',
      ...responsePayload
    });

  } catch (error) {
    console.error("Error logging inventory:", error);
    res.status(500).json({ 
      status: 'error', 
      message: 'Failed to log inventory arrival.',
      error: error.message
    });
  }
};

export const getInventoryArrivals = async (req, res) => {
  try {
    const arrivals = await prisma.inventoryArrival.findMany({
      orderBy: { 
        arrived_at: 'desc'
      },
      include: {
        user: {
          select: { name: true }
        }
      }
    });

    res.status(200).json({
      status: 'success',
      results: arrivals.length,
      data: arrivals
    });

  } catch (error) {
    console.error("Error fetching inventory ledger:", error);
    res.status(500).json({ 
      status: 'error', 
      message: 'Failed to fetch inventory data.',
      error: error.message
    });
  }
};