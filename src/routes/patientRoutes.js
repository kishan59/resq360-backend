import express from 'express';
import { convertEncounterToPatient } from '../controllers/patientController.js';
import { protect } from "../middlewares/authMiddleware.js";

const router = express.Router();

// Route: POST /api/patients -> Process shelter intake
router.post('/', protect, convertEncounterToPatient);

export default router;