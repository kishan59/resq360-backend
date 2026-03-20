import express from 'express';
import dotenv from 'dotenv';
import { prisma } from './src/config/db.js';

import userRoutes from './src/routes/userRoutes.js';
import encounterRoutes from './src/routes/encounterRoutes.js';
import patientRoutes from './src/routes/patientRoutes.js';
import medicalLogRoutes from './src/routes/medicalLogRoutes.js';
import vetTripRoutes from './src/routes/vetTripRoutes.js';
import inventoryRoutes from './src/routes/inventoryRoutes.js';
import settingsRoutes from './src/routes/settingsRoutes.js';
import uploadRoutes from './src/routes/uploadRoutes.js';

dotenv.config();

const app = express();
app.use(express.json());

// Simple Health Check
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'success', message: 'ResQ360 API V2 is online and ready!' });
});

app.use('/api/users', userRoutes);
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