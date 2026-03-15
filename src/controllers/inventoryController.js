import { prisma } from '../config/db.js';

// 1. POST: Log a new shipment of supplies
export const logInventoryArrival = async (req, res) => {
  try {
    const { item_name, quantity, unit_type } = req.body;
    
    // MAGIC: Pull from token
    const logged_by_id = req.user.id; 

    if (!item_name || quantity === undefined) {
      return res.status(400).json({ status: 'error', message: 'Item name and quantity are required.' });
    }

    const newStock = await prisma.inventoryArrival.create({
      data: {
        item_name,
        // Ensure quantity is saved as an integer, just in case a string slips through
        quantity: parseInt(quantity, 10), 
        unit_type: unit_type || null,
        logged_by_id
      }
    });

    res.status(201).json({
      status: 'success',
      message: `${quantity} ${unit_type || 'units'} of ${item_name} logged successfully!`,
      data: newStock
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

// 2. GET: Pull the inventory ledger for the Command Center
export const getInventoryArrivals = async (req, res) => {
  try {
    const arrivals = await prisma.inventoryArrival.findMany({
      orderBy: { 
        arrived_at: 'desc' // Most recent shipments at the top
      },
      include: {
        user: {
          select: { name: true } // Who signed for the delivery?
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