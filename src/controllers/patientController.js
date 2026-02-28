import { prisma } from '../config/db.js';

export const convertEncounterToPatient = async (req, res) => {
  try {
    // 1. Grab the data from the Admin Dashboard form
    const { 
      encounter_id, 
      qr_code_id, 
      species, 
      breed, 
      color, 
      triage_color, 
      assigned_cage_id 
    } = req.body;

    // 2. Strict Validation: We absolutely need the Encounter ID to link them
    if (!encounter_id) {
      return res.status(400).json({ 
        status: 'error', 
        message: 'You must provide an encounter_id to convert into a patient.' 
      });
    }

    // 3. Create the official Patient record
    const newPatient = await prisma.patient.create({
      data: {
        qr_code_id: qr_code_id || null,
        species: species || 'Unknown',
        breed: breed || 'Unknown',
        color: color || 'Unknown',
        triage_color: triage_color || 'GREEN', // Default to routine care
        assigned_cage_id: assigned_cage_id || null,
        status: 'ACTIVE' // Setting the lifecycle status we added earlier!
      }
    });

    // 4. Update the original Encounter to link it to this new Patient
    await prisma.encounter.update({
      where: { id: encounter_id },
      data: {
        temp_status: 'MERGED_TO_PATIENT',
        patient_id: newPatient.id // Drawing the permanent relational line
      }
    });

    // 5. Send success response back to the Admin Dashboard
    res.status(201).json({
      status: 'success',
      message: 'Animal successfully checked into the shelter as a Patient!',
      data: newPatient
    });

  } catch (error) {
    console.error("Error converting to patient:", error);
    res.status(500).json({ 
      status: 'error', 
      message: 'Failed to create patient profile.',
      error: error.message
    });
  }
};