import express from 'express';
import { createEncounter } from '../controllers/encounterController.js';

const router = express.Router();

// Route: POST /api/encounters -> Trigger the field intake
router.post('/', createEncounter);

export default router;