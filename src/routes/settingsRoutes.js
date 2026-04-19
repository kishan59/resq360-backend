import express from 'express';
import { getAppSettings, updateAppSettings } from '../controllers/settingsController.js';
import { protect, restrictTo } from '../middlewares/authMiddleware.js';

const router = express.Router();

// Read current runtime feature settings.
router.get('/', protect, getAppSettings);

// Only OWNER can change global settings.
router.patch('/', protect, restrictTo('OWNER'), updateAppSettings);

export default router;