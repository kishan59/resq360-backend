import express from 'express';
import { getAppSettings, updateAppSettings } from '../controllers/settingsController.js';
import { protect, restrictTo } from '../middlewares/authMiddleware.js';

const router = express.Router();

// ANY logged-in field worker needs to read this so their app can configure itself
router.get('/', protect, getAppSettings);

// ONLY the Admin can change these settings (The Kill Switch)
router.patch('/', protect, restrictTo('OWNER'), updateAppSettings);

export default router;