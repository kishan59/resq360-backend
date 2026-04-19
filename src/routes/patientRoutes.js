import express from 'express';
import {
	convertEncounterToPatient,
	getPatientById,
	updatePatient,
	updatePatientStatus
} from '../controllers/patientController.js';
import { createMedicalLog, getPatientLogs } from '../controllers/medicalLogController.js';
import { protect } from "../middlewares/authMiddleware.js";

const router = express.Router();

router.post('/', protect, convertEncounterToPatient);
router.get('/:id', protect, getPatientById);
router.patch('/:id', protect, updatePatient);
router.patch('/:id/status', protect, updatePatientStatus);
router.post('/:id/medical-logs', protect, createMedicalLog);
router.get('/:id/medical-logs', protect, getPatientLogs);

export default router;