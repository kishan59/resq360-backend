import express from 'express';
import { createUser } from '../controllers/userController.js'; // Note the .js extension!

const router = express.Router();

// When a POST request hits this route, trigger the createUser controller
router.post('/', createUser);

export default router;