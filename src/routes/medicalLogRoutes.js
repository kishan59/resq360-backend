import express from 'express';
import { createMedicalLog, getPatientLogs } from '../controllers/medicalLogController.js';
import { protect } from '../middlewares/authMiddleware.js';

const router = express.Router();
router.post('/', protect, createMedicalLog);
router.get('/:patient_id', protect, getPatientLogs);

export default router;