import express from 'express';
import { convertEncounterToPatient } from '../controllers/patientController.js';

const router = express.Router();

// Route: POST /api/patients -> Process shelter intake
router.post('/', convertEncounterToPatient);

export default router;