import { prisma } from '../config/db.js';

// 1. Log a new medical treatment
export const createMedicalLog = async (req, res) => {
  try {
    const { action_type, notes, patient_id, administered_by } = req.body;

    // Strict Validation: We need to know WHAT was done, TO WHOM, and BY WHOM.
    if (!action_type || !patient_id || !administered_by) {
      return res.status(400).json({ 
        status: 'error', 
        message: 'Action type, patient ID, and the administering user ID are strictly required.' 
      });
    }

    const newLog = await prisma.medicalLog.create({
      data: {
        action_type: action_type, // Must match your Enum (MEDICATION, DIET, SURGERY, GENERAL_CARE)
        notes: notes || null,
        patient_id: patient_id,
        administered_by: administered_by
      }
    });

    res.status(201).json({
      status: 'success',
      message: 'Medical treatment logged successfully!',
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

// 2. Fetch the complete medical history for a specific patient
export const getPatientLogs = async (req, res) => {
  try {
    // We grab the patient ID from the URL itself (e.g., /api/medical-logs/12345)
    const { patient_id } = req.params;

    const logs = await prisma.medicalLog.findMany({
      where: { 
        patient_id: patient_id 
      },
      orderBy: { 
        timestamp: 'desc' // Newest treatments at the top
      },
      include: {
        // Pull in the details of the Vet/User who did the treatment
        user: {
          select: {
            name: true,
            role: true
          }
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