import express from 'express';
import { createMedicalLog, getPatientLogs } from '../controllers/medicalLogController.js';

const router = express.Router();

// POST request to log a new treatment
router.post('/', createMedicalLog);

// GET request to pull a specific patient's digital medical card
router.get('/:patient_id', getPatientLogs);

export default router;