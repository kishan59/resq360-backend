import express from 'express';
import { uploadMedia } from '../controllers/uploadController.js';
import { upload } from '../config/cloudinary.js';
import { protect } from '../middlewares/authMiddleware.js';

const router = express.Router();

// The upload.single('media') tells Multer to look for an incoming file attached to the name "media"
router.post('/', protect, upload.single('media'), uploadMedia);

export default router;