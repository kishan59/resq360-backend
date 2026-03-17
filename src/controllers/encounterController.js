import { prisma } from '../config/db.js';

// POST: The absolute first action in the field (Snap Photo + Auto-GPS)
export const createEncounter = async (req, res) => {
  try {
    const {
      initial_media_url,
      initial_media_is_video,
      pickup_lat,
      pickup_lon,
      reporter_name,  // NEW: John types this in the field
      reporter_phone  // NEW: John types this in the field
    } = req.body; 

    // The Bouncer verifies John is the one making the request
    const created_by_id = req.user.id; 

    if (!initial_media_url || pickup_lat === undefined || pickup_lon === undefined) {
      return res.status(400).json({
        status: 'error',
        message: 'Missing required field data. Media URL and GPS coordinates are strictly required.'
      });
    }

    // 🚀 Prisma Transaction: Handle the Reporter silently, then create the Encounter
    const newEncounter = await prisma.$transaction(async (tx) => {
      let finalReporterId = null;

      // 1. THE SILENT DIRECTORY: If John entered a phone number for the Good Samaritan
      if (reporter_phone) {
        // Check if we already have this caller in our database
        let reporterRecord = await tx.reporter.findFirst({
          where: { phone_number: reporter_phone }
        });

        // If not, silently add them to the directory
        if (!reporterRecord) {
          reporterRecord = await tx.reporter.create({
            data: {
              name: reporter_name || null, // Name is optional
              phone_number: reporter_phone,
              is_anonymous: false
            }
          });
        }
        finalReporterId = reporterRecord.id;
      } 
      // Edge case: John got a name but no phone number
      else if (reporter_name) {
         let reporterRecord = await tx.reporter.create({
            data: {
              name: reporter_name,
              is_anonymous: false
            }
          });
          finalReporterId = reporterRecord.id;
      }

      // 2. THE DISPATCH: Create the actual Encounter
      return await tx.encounter.create({
        data: {
          initial_media_url,
          initial_media_is_video: initial_media_is_video || false,
          pickup_lat,
          pickup_lon,
          created_by_id,               // Linked to John
          reporter_id: finalReporterId, // Linked to the Good Samaritan (if provided)
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