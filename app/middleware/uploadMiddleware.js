const { uploadAvatar, uploadCoverPhoto } = require('../utils/cloudinary');

// Single image upload with validation
const handleAvatarUpload = (req, res, next) => {
  uploadAvatar.single('avatar')(req, res, (err) => {
    if (err) {
      return res.status(400).json({
        success: false,
        message: err.message,
      });
    }
    next();
  });
};

const handleCoverPhotoUpload = (req, res, next) => {
  uploadCoverPhoto.single('coverPhoto')(req, res, (err) => {
    if (err) {
      return res.status(400).json({
        success: false,
        message: err.message,
      });
    }
    next();
  });
};

// Additional validation for uploads
const validateImageUpload = (req, res, next) => {
  if (!req.file) {
    return res.status(400).json({
      success: false,
      message: 'No image file was uploaded',
    });
  }

  // Check file type
  const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
  if (!allowedMimeTypes.includes(req.file.mimetype)) {
    return res.status(400).json({
      success: false,
      message: 'Only JPEG, PNG, GIF, and WebP images are allowed',
    });
  }

  next();
};

module.exports = {
  handleAvatarUpload,
  handleCoverPhotoUpload,
  validateImageUpload,
};