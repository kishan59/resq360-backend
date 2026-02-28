import express from 'express';
import { createEncounter, getAllEncounters } from '../controllers/encounterController.js';

const router = express.Router();

// When the mobile app sends a POST request here, log the rescue
router.post('/', createEncounter);

// GET request fetches all encounters for the Admin Dashboard
router.get('/', getAllEncounters);

export default router;