export const uploadMedia = async (req, res) => {
  try {
    // If multer failed to catch a file, req.file will be empty
    if (!req.file) {
      return res.status(400).json({ 
        status: 'error', 
        message: 'No file detected. Please attach a file.' 
      });
    }

    // req.file.path contains the live, public Cloudinary URL!
    res.status(200).json({
      status: 'success',
      message: 'File uploaded to cloud successfully!',
      data: {
        media_url: req.file.path 
      }
    });

  } catch (error) {
    console.error("Upload error:", error);
    res.status(500).json({ status: 'error', message: 'Failed to upload media to cloud.' });
  }
};