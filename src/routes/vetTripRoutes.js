import express from 'express';
import { requestVetTrip, updateVetTripStatus, getApprovedTrips } from '../controllers/vetTripController.js';
import { protect, restrictTo } from '../middlewares/authMiddleware.js';

const router = express.Router();

// Anyone logged in can see the board and request a trip
router.get('/approved', protect, getApprovedTrips); 
router.post('/', protect, requestVetTrip);

// 2. ONLY logged-in OWNERS can change the status (approve/complete)
router.patch('/:id/status', protect, restrictTo('OWNER'), updateVetTripStatus);

export default router;