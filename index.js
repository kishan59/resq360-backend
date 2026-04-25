import express from 'express';
import dotenv from 'dotenv';
import { prisma } from './src/config/db.js';

import userRoutes from './src/routes/userRoutes.js';
import authRoutes from './src/routes/authRoutes.js';
import encounterRoutes from './src/routes/encounterRoutes.js';
import patientRoutes from './src/routes/patientRoutes.js';
import medicalLogRoutes from './src/routes/medicalLogRoutes.js';
import vetTripRoutes from './src/routes/vetTripRoutes.js';
import inventoryRoutes from './src/routes/inventoryRoutes.js';
import settingsRoutes from './src/routes/settingsRoutes.js';
import uploadRoutes from './src/routes/uploadRoutes.js';
import { getJwtSecret } from './src/utils/auth.js';

dotenv.config();
getJwtSecret();

const app = express();
app.use(express.json());

app.use('/api/users', userRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/encounters', encounterRoutes);
app.use('/api/patients', patientRoutes);
app.use('/api/medical-logs', medicalLogRoutes);
app.use('/api/vet-trips', vetTripRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/upload', uploadRoutes);

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`🚀 ResQ360 Server V2 is running on http://localhost:${PORT}`);
});