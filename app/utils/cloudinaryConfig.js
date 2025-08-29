const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const multer = require('multer');


cloudinary.config({
  cloud_name: process.env.CLOUD_NAME,
  api_key: process.env.CLOUD_API_KEY,
  api_secret: process.env.CLOUD_API_SECRET,
  secure: true,
});

const avatarStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: (req, file) => {
    return {
      folder: `app-name/users/${req.user.id}/avatar`,
      allowed_formats: ['jpg', 'jpeg', 'png', 'gif', 'webp'],
      transformation: [
        { width: 800, height: 800, crop: 'limit' },
        { quality: 'auto:good' },
      ],
      resource_type: 'image',
      public_id: `avatar-${Date.now()}-${Math.round(Math.random() * 1E9)}`,
    };
  },
});

// Configure storage for cover photos
const coverPhotoStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: (req, file) => {
    return {
      folder: `app-name/users/${req.user.id}/cover`,
      allowed_formats: ['jpg', 'jpeg', 'png', 'gif', 'webp'],
      transformation: [
        { width: 1600, height: 900, crop: 'limit' },
        { quality: 'auto:good' },
      ],
      resource_type: 'image',
      public_id: `cover-${Date.now()}-${Math.round(Math.random() * 1E9)}`,
    };
  },
});

// Configure multer for different upload types
const uploadAvatar = multer({
  storage: avatarStorage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed!'), false);
    }
  },
});

const uploadCoverPhoto = multer({
  storage: coverPhotoStorage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit for cover photos
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed!'), false);
    }
  },
});

// Enhanced upload function
const uploadToCloudinary = async (filePath, options = {}) => {
  try {
    const result = await cloudinary.uploader.upload(filePath.path, {
      folder: options.folder || 'app-name',
      transformation: options.transformation,
      resource_type: 'image',
      ...options,
    });
    
    return {
      public_id: result.public_id,
      url: result.secure_url,
      format: result.format,
      bytes: result.bytes,
      width: result.width,
      height: result.height,
      created_at: result.created_at,
    };
  } catch (error) {
    throw new Error('Cloudinary upload failed: ' + error.message);
  }
};

// Enhanced delete function
const deleteFromCloudinary = async (publicId) => {
  try {
    const result = await cloudinary.uploader.destroy(publicId, {
      resource_type: 'image',
    });
    return result;
  } catch (error) {
    throw new Error('Cloudinary delete failed: ' + error.message);
  }
};

// Get optimized URL with transformations
const getOptimizedUrl = (publicId, transformations = {}) => {
  return cloudinary.url(publicId, {
    width: transformations.width,
    height: transformations.height,
    crop: transformations.crop || 'fill',
    quality: 'auto:good',
    format: 'auto',
    ...transformations,
  });
};

// Extract public_id from Cloudinary URL
const extractPublicId = (url) => {
  if (!url) return null;
  
  const matches = url.match(/upload\/(?:v\d+\/)?(.+?)\.(?:jpg|jpeg|png|gif|webp)/);
  return matches ? matches[1] : null;
};

module.exports = {
  cloudinary,
  uploadAvatar,
  uploadCoverPhoto,
  uploadToCloudinary,
  deleteFromCloudinary,
  getOptimizedUrl,
  extractPublicId,
};