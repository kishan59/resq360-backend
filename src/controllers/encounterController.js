import { prisma } from '../config/db.js';

// POST: The absolute first action in the field (Snap Photo + Auto-GPS)
export const createEncounter = async (req, res) => {
  try {
    const {
      initial_media_url,
      initial_media_is_video,
      pickup_lat,
      pickup_lon
    } = req.body; 

    // THE MAGIC: We pull the user ID directly from the verified token! No one can fake this.
    const created_by_id = req.user.id;

    // 1. Strict Validation: We absolutely cannot proceed without the photo, GPS, or Employee ID.
    if (!initial_media_url || pickup_lat === undefined || pickup_lon === undefined) {
      return res.status(400).json({
        status: 'error',
        message: 'Missing required field data. Media URL and GPS coordinates are strictly required.'
      });
    }

    // 2. Save the rough data to the database
    const newEncounter = await prisma.encounter.create({
      data: {
        initial_media_url,
        initial_media_is_video: initial_media_is_video || false,
        pickup_lat,
        pickup_lon,
        created_by_id,
        status: 'PENDING_SHELTER_INTAKE' // It stays pending until the Command Center assigns a cage
      }
    });

    // 3. Send the success signal back to the mobile app
    res.status(201).json({
      status: 'success',
      message: 'Rescue initiated successfully! Drive safe.',
      data: newEncounter
    });

  } catch (error) {
    console.error("Error starting field encounter:", error);
    res.status(500).json({ status: 'error', message: 'Failed to secure field data.', error: error.message });
  }
};