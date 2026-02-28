import express from 'express';
import { convertEncounterToPatient } from '../controllers/patientController.js';

const router = express.Router();

// POST request to convert an encounter into a patient
router.post('/convert', convertEncounterToPatient);

export default router;