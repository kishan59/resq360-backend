import express from 'express';
import {
	requestVetTrip,
	updateVetTripStatus,
	getApprovedTrips,
	approveVetTrip,
	completeVetTrip
} from '../controllers/vetTripController.js';
import { protect, restrictTo } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.get('/approved', protect, getApprovedTrips); 
router.post('/', protect, requestVetTrip);
router.patch('/:id/approve', protect, restrictTo('OWNER'), approveVetTrip);
router.patch('/:id/complete', protect, completeVetTrip);

router.patch('/:id/status', protect, restrictTo('OWNER'), updateVetTripStatus);

export default router;