import { v2 as cloudinary } from 'cloudinary';
import { CloudinaryStorage } from 'multer-storage-cloudinary';
import multer from 'multer';
import dotenv from 'dotenv';

dotenv.config();

// 1. Log into Cloudinary using your .env keys
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// 2. Configure the storage engine
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'resq360_field_ops', // Creates a clean folder in your Cloudinary dashboard
    resource_type: 'auto',       // MAGIC: Tells Cloudinary to accept images, video, AND raw audio (.m4a)
    allowed_formats: ['jpg', 'png', 'jpeg', 'mp4', 'm4a', 'wav', 'mp3']
  },
});

// 3. Export the upload middleware
export const upload = multer({ storage });