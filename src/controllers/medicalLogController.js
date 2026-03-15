import { prisma } from '../config/db.js';

// 1. POST: Save a new daily audio log
export const createMedicalLog = async (req, res) => {
  try {
    const { patient_id, audio_log_url, text_translation, is_vet_update } = req.body;
    
    // MAGIC: Pull from token
    const logged_by_id = req.user.id; 

    if (!patient_id || !audio_log_url) {
      return res.status(400).json({ status: 'error', message: 'Patient ID and Audio Log URL are required.' });
    }

    const newLog = await prisma.medicalLog.create({
      data: {
        patient_id,
        logged_by_id,
        audio_log_url,
        text_translation: text_translation || null, // For when the AI background job kicks in
        is_vet_update: is_vet_update || false
      }
    });

    res.status(201).json({
      status: 'success',
      message: 'Audio treatment log saved successfully!',
      data: newLog
    });

  } catch (error) {
    console.error("Error creating medical log:", error);
    res.status(500).json({ 
      status: 'error', 
      message: 'Failed to save medical log.',
      error: error.message
    });
  }
};

// 2. GET: Fetch the complete history for the Digital Patient Card
export const getPatientLogs = async (req, res) => {
  try {
    const { patient_id } = req.params;

    const logs = await prisma.medicalLog.findMany({
      where: { patient_id },
      orderBy: { created_at: 'desc' }, // Newest audio logs at the top
      include: {
        // Automatically attach the name of the team member who recorded it
        user: {
          select: { name: true, role: true }
        }
      }
    });

    res.status(200).json({
      status: 'success',
      results: logs.length,
      data: logs
    });

  } catch (error) {
    console.error("Error fetching patient logs:", error);
    res.status(500).json({ 
      status: 'error', 
      message: 'Failed to fetch medical history.',
      error: error.message
    });
  }
};