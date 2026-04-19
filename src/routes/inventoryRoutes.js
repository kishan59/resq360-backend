import express from 'express';
import { logInventoryArrival, getInventoryArrivals } from '../controllers/inventoryController.js';
import { protect, restrictTo } from '../middlewares/authMiddleware.js';

const router = express.Router();
router.post('/', protect, restrictTo('OWNER'), logInventoryArrival);
router.get('/', protect, getInventoryArrivals);

export default router;