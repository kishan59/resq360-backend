import express from 'express';
import { createEncounter } from '../controllers/encounterController.js';
import { protect } from "../middlewares/authMiddleware.js";

const router = express.Router();

// Route: POST /api/encounters -> Trigger the field intake
router.post('/', protect, createEncounter);

export default router;