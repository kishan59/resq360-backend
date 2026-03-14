import express from 'express';
import { createUser } from '../controllers/userController.js';

const router = express.Router();

// Route: POST /api/users -> Hire a new team member
router.post('/', createUser);

export default router;