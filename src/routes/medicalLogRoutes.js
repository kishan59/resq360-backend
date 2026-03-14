import express from 'express';
import { createMedicalLog, getPatientLogs } from '../controllers/medicalLogController.js';

const router = express.Router();

// POST: Record a new audio log
router.post('/', createMedicalLog);

// GET: Pull a specific patient's history (e.g., /api/medical-logs/a52365d8...)
router.get('/:patient_id', getPatientLogs);

export default router;