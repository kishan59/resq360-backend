// index.js
import express from 'express';
import dotenv from 'dotenv';

import userRoutes from './src/routes/userRoutes.js';
import encounterRoutes from './src/routes/encounterRoutes.js';
import patientRoutes from './src/routes/patientRoutes.js';

dotenv.config();

const app = express();
app.use(express.json());

// all the user-related routes will be here
app.use('/api/users', userRoutes);
app.use('/api/encounters', encounterRoutes);
app.use('/api/patients', patientRoutes);

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`🚀 ResQ360 Server is running on http://localhost:${PORT}`);
});