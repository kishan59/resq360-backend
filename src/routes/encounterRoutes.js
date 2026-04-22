import express from 'express';
import { createEncounter, getEncounterById, updateEncounter, getReporterSummary } from '../controllers/encounterController.js';
import { protect } from "../middlewares/authMiddleware.js";

const router = express.Router();

router.post('/', protect, createEncounter);
router.get('/reporter-summary', protect, getReporterSummary);
router.get('/:id', protect, getEncounterById);
router.patch('/:id', protect, updateEncounter);

export default router;