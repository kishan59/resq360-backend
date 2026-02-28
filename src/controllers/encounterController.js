import { prisma } from '../config/db.js';

export const createEncounter = async (req, res) => {
  try {
    // 1. Grab the raw data, now including the optional reporter_id
    const { 
      gps_lat, 
      gps_lon, 
      voice_transcript, 
      raw_photo_url, 
      created_by_id, 
      reporter_id // <-- NEW
    } = req.body;

    // 2. Strict Validation: Location and Rescuer ID are mandatory
    if (!gps_lat || !gps_lon || !created_by_id) {
      return res.status(400).json({ 
        status: 'error', 
        message: 'GPS coordinates and a valid Rescuer ID are strictly required.' 
      });
    }

    // 3. Insert the new Encounter into the database
    const newEncounter = await prisma.encounter.create({
      data: {
        gps_lat: parseFloat(gps_lat), 
        gps_lon: parseFloat(gps_lon),
        voice_transcript: voice_transcript || null,
        raw_photo_url: raw_photo_url || null,
        created_by_id: created_by_id, 
        reporter_id: reporter_id || null // <-- NEW: Links the animal lover, or stays null for anonymous tips!
      }
    });

    // 4. Send success response back to the app
    res.status(201).json({
      status: 'success',
      message: 'Rescue encounter logged successfully!',
      data: newEncounter
    });

  } catch (error) {
    console.error("Error creating encounter:", error);
    res.status(500).json({ 
      status: 'error', 
      message: 'Failed to save encounter to the database.',
      error: error.message
    });
  }
};


export const getAllEncounters = async (req, res) => {
  try {
    // Tell Prisma to find all encounters
    const encounters = await prisma.encounter.findMany({
      orderBy: {
        created_at: 'desc' // Sort by newest first so the dashboard sees emergencies immediately
      },
      include: {
        // This is the relational magic! It joins the User table automatically.
        created_by: {
          select: {
            name: true,
            role: true
          }
        }
      }
    });

    res.status(200).json({
      status: 'success',
      results: encounters.length,
      data: encounters
    });

  } catch (error) {
    console.error("Error fetching encounters:", error);
    res.status(500).json({ 
      status: 'error', 
      message: 'Failed to fetch encounters from the database.',
      error: error.message
    });
  }
};