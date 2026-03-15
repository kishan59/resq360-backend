import express from 'express';
import { createUser, loginUser } from '../controllers/userController.js';
import { protect, restrictTo } from '../middlewares/authMiddleware.js';

const router = express.Router();

// 2. ONLY logged-in OWNERS can register new staff
router.post('/register', protect, restrictTo('OWNER'), createUser); 

// Anyone can log in (as long as they have valid credentials)
router.post('/login', loginUser);     

export default router;