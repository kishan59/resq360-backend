import { prisma } from '../config/db.js';

// GET: Mobile App fetches settings on boot to know what features to show
export const getAppSettings = async (req, res) => {
  try {
    // We always pull row ID 1, because there is only ever one global settings configuration
    const settings = await prisma.appSettings.findUnique({
      where: { id: 1 }
    });

    // If it doesn't exist yet (first time booting), send the defaults
    if (!settings) {
      return res.status(200).json({
        status: 'success',
        data: { input_level: 1, allow_video_uploads: false }
      });
    }

    res.status(200).json({
      status: 'success',
      data: settings
    });

  } catch (error) {
    console.error("Error fetching settings:", error);
    res.status(500).json({ status: 'error', message: 'Failed to fetch app settings.' });
  }
};

// PATCH: Command Center Admin changes the settings
export const updateAppSettings = async (req, res) => {
  try {
    const { input_level, allow_video_uploads } = req.body;

    // Upsert: Update if exists, Create if it doesn't
    const updatedSettings = await prisma.appSettings.upsert({
      where: { id: 1 },
      update: {
        // Only update the fields they actually sent in the request
        input_level: input_level !== undefined ? input_level : undefined,
        allow_video_uploads: allow_video_uploads !== undefined ? allow_video_uploads : undefined
      },
      create: {
        id: 1,
        input_level: input_level || 1,
        allow_video_uploads: allow_video_uploads || false
      }
    });

    res.status(200).json({
      status: 'success',
      message: 'App settings updated successfully.',
      data: updatedSettings
    });

  } catch (error) {
    console.error("Error updating settings:", error);
    res.status(500).json({ status: 'error', message: 'Failed to update settings.' });
  }
};