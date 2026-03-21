import { prisma } from '../config/db.js';

// POST: The absolute first action in the field (Snap Photo + Auto-GPS)
export const createEncounter = async (req, res) => {
  try {
    const {
      initial_media_url,
      initial_media_is_video,
      audio_url,        // 🚨 1. DESTRUCTURE THE NEW AUDIO URL
      pickup_lat,
      pickup_lon,
      reporter_name,  
      reporter_phone  
    } = req.body; 

    const created_by_id = req.user.id; 

    // We still only strictly require the photo and GPS to start
    if (!initial_media_url || pickup_lat === undefined || pickup_lon === undefined) {
      return res.status(400).json({
        status: 'error',
        message: 'Missing required field data. Media URL and GPS coordinates are strictly required.'
      });
    }

    const newEncounter = await prisma.$transaction(async (tx) => {
      let finalReporterId = null;

      if (reporter_phone) {
        let reporterRecord = await tx.reporter.findFirst({
          where: { phone_number: reporter_phone }
        });
        if (!reporterRecord) {
          reporterRecord = await tx.reporter.create({
            data: {
              name: reporter_name || null, 
              phone_number: reporter_phone,
              is_anonymous: false
            }
          });
        }
        finalReporterId = reporterRecord.id;
      } else if (reporter_name) {
         let reporterRecord = await tx.reporter.create({
            data: {
              name: reporter_name,
              is_anonymous: false
            }
          });
          finalReporterId = reporterRecord.id;
      }

      return await tx.encounter.create({
        data: {
          initial_media_url,
          initial_media_is_video: initial_media_is_video || false,
          audio_url,             // 🚨 2. SAVE IT TO THE DATABASE
          pickup_lat,
          pickup_lon,
          created_by_id,         
          reporter_id: finalReporterId, 
          status: 'PENDING_SHELTER_INTAKE'
        }
      });
    });

    res.status(201).json({
      status: 'success',
      message: 'Rescue initiated securely! Reporter linked.',
      data: newEncounter
    });

  } catch (error) {
    console.error("Error starting field encounter:", error);
    res.status(500).json({ status: 'error', message: 'Failed to secure field data.', error: error.message });
  }
};