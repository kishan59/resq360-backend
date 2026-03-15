import express from 'express';
import { logInventoryArrival, getInventoryArrivals } from '../controllers/inventoryController.js';
import { protect } from '../middlewares/authMiddleware.js';

const router = express.Router();
router.post('/', protect, logInventoryArrival);
router.get('/', protect, getInventoryArrivals);

export default router;