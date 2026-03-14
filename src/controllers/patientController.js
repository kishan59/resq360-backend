import { prisma } from '../config/db.js';

// POST: Convert an Encounter into a Shelter Patient
export const convertEncounterToPatient = async (req, res) => {
  try {
    const { encounter_id, qr_code_id, temperament, cage_zone } = req.body;

    // Strict Validation
    if (!encounter_id || !qr_code_id || !cage_zone) {
      return res.status(400).json({ 
        status: 'error', 
        message: 'Encounter ID, QR Code ID, and Cage Zone are required for intake.' 
      });
    }

    // 🚀 Prisma Transaction: Do all of this, or do none of it.
    const result = await prisma.$transaction(async (tx) => {
      
      // 1. Create the official Patient record
      const newPatient = await tx.patient.create({
        data: {
          encounter_id: encounter_id,
          qr_code_id: qr_code_id,
          temperament: temperament || 'CALM',
          cage_zone: cage_zone, // DANGER, MEDIUM, MINOR, or FREE_ROAMING
          status: 'IN_SHELTER'
        }
      });

      // 2. Update the original Encounter status so we know it's been processed
      await tx.encounter.update({
        where: { id: encounter_id },
        data: { status: 'MERGED_TO_PATIENT' }
      });

      return newPatient;
    });

    res.status(201).json({
      status: 'success',
      message: 'Animal successfully admitted to the shelter!',
      data: result
    });

  } catch (error) {
    console.error("Error during shelter intake:", error);
    res.status(500).json({ 
      status: 'error', 
      message: 'Failed to process shelter intake.',
      error: error.message
    });
  }
};