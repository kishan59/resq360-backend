import express from 'express';
import { createUser } from '../controllers/userController.js';
import { protect, restrictTo } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.post('/register', protect, restrictTo('OWNER'), createUser); 

export default router;