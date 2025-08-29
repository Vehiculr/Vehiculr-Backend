const multer = require('multer');
const User = require('../models/userModel');
const factory = require('./handlerFactory');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');
const filterObj = require('../utils/filterObject');
const Topic = require('../models/topicsModel');
const { deleteFromCloudinary, getOptimizedUrl } = require('../utils/cloudinaryConfig');
const { uploadToCloudinary } = require('../utils/cloudinaryConfig');
const cloudinary = require("cloudinary").v2;


exports.setUserId = (req, res, next) => {
  req.params.id = req.user.id;
  next();
};

exports.getAllUsers = factory.getAll(User);
exports.createUser = factory.createOne(User);

exports.getUserAddress = catchAsync(async (req, res, next) => {
  const user = await User.findById(req.user.id);
  if (!user.address) {
    return next(new AppError('No address found', 404));
  }
  req.params.id = user.address._id;
  next();
});

exports.saveUserAddress = catchAsync(async (req, res, next) => {
  const address = req.body.address;
  const house = await User.findByIdAndUpdate(req.user.id, { address: address._id });

  res.status(201).json({
    status: 'success',
    data: { address },
  });
});

const multerStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'public/img/users');
  },
  filename: (req, file, cb) => {
    const ext = file.mimetype.split('/')[1];
    cb(null, `user-${req.user.id}-${Date.now()}.${ext}`);
  },
});

const multerFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image')) {
    cb(null, true);
  } else {
    cb(new AppError('Please upload only images.', 400), false);
  }
};

exports.uploadUserPhoto = multer({
  storage: multerStorage,
  fileFilter: multerFilter,
}).single('photo');

exports.getUser = catchAsync(async (req, res, next) => {
  const user = await User.findById(req.params.id);

  if (!user) {
    return next(new AppError('No user found with that ID', 404));
  }

  res.status(200).json({
    status: 'success',
    data: {
      data: {
        _id: user.id,
        name: user.name,
        photo: user.photo,
        address: user.address,
        role: user.role,
      },
    },
  });
});

exports.getMe = () => {
  return factory.getOne(User);
};

exports.updateMe = catchAsync(async (req, res, next) => {
  // 1) Create error if user POSTs password data
  if (req.body.password || req.body.passwordConfirm) {
    return next(new AppError('Please use Password Update page / Forgot Password to update your password.', 400));
  }

  // 2) Filtered out unwanted fields names that are not allowed to be updated
  const filteredBody = filterObj(req.body, 'id', 'email', 'role');
  if (req.file) filteredBody.photo = req.file.filename;
// console.log('==filteredBody===', filteredBody)
  // 3) Update user document
  const updatedUser = await User.findByIdAndUpdate(req.user.id, filteredBody, {
    new: true,
    runValidators: true,
  });

  res.status(200).json({
    status: 'success',
    data: {
      user: updatedUser,
    },
  });
});

exports.deleteMe = catchAsync(async (req, res, next) => {
  await User.findByIdAndUpdate(req.user.id, { deleted: true });

  res.status(204).json({
    status: 'success',
    data: null,
  });
});

exports.addUserAddress = catchAsync(async (req, res, next) => {
  const user = await User.findById(req.params.id);
  const address = req.body.address;
  user.address = address._id;
  user.save();
  res.status(201).json({
    status: 'success',
    data: { address },
  });
});
exports.checkUsernameExists = async (req, res) => {
  try {
    const { username } = req.query;
    const user = await User.findOne({ username });
    console.log('username',  req.query)

    if (user) {
      return res.status(200).json({ exists: true, message: 'Username already taken' });
    } else {
      return res.status(200).json({ exists: false, message: 'Username is available' });
    }
  } catch (err) {
    res.status(500).json({ message: 'Error checking username', error: err.message });
  }
};

exports.updateUsername = catchAsync(async (req, res, next) => {
  const { username } = req.body;

  if (!username) {
    return next(new AppError('Please provide a username to update', 400));
  }

  const updatedUser = await User.findByIdAndUpdate(
    req.user.id, 
    { username },
    { new: true, runValidators: true }
  );

  if (!updatedUser) {
    return next(new AppError('User not found', 404));
  }

  res.status(200).json({
    status: 'success',
    data: {
      user: updatedUser,
    },
  });
});

exports.createTopic = catchAsync(async (req, res, next) => {
  try {
    const { name, description, category, icon } = req.body;
    
    // Check if topic already exists
    const existingTopic = await Topic.findOne({ name: new RegExp(`^${name}$`, 'i') });
    
    if (existingTopic) {
      return res.status(409).json({
        message: 'Topic with this name already exists'
      });
    }
    
    // Create new topic
    const topic = new Topic({
      name,
      description,
      category,
      icon,
      // createdBy: req.user.id // From auth middleware
    });
    
    await topic.save();
    
    // Populate createdBy field for response
    // await topic.populate('createdBy', 'username email');
    
    res.status(201).json({
      message: 'Topic created successfully',
      topic
    });
  } catch (error) {
    console.error('Error in POST /topics:', error);
    
    if (error.code === 11000) {
      return res.status(409).json({
        message: 'Topic with this name already exists'
      });
    }
    
    res.status(500).json({
      message: 'Server error while creating topic',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});


// GET all partners
exports.getAllTopics = catchAsync(async (req, res, next) => {
  try {
    const Topic = await Topic.find();
    console.log('==Topic===', Topic)
    res.status(200).json({
      status: 'success',
      results: Topic.length,
      data: Topics
    });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
});

exports.updateProfilePhoto = catchAsync(async (req, res, next) => {
  try {
    const userId = "68ae1e3d4d3cf2e1c5dda228" || req.user.id;

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "Please select an image to upload",
      });
    }

    const user = await User.findById(userId);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const result = await uploadToCloudinary(req.file);
    const cloudinaryData = {
      public_id: result.public_id,
      url: result.url,
      format: result.format,
      bytes: result.bytes,
      width: result.width,
      height: result.height,
      created_at: result.created_at,
    };

    // Delete old avatar from Cloudinary if exists
    if (user.avatar && user.avatar.public_id) {
      try {
        await cloudinary.uploader.destroy(user.avatar.public_id);
        console.log(`Deleted old avatar: ${user.avatar.public_id}`);
      } catch (deleteError) {
        console.error("Error deleting old avatar:", deleteError);
      }
    }
console.log('==cloudinaryData===', cloudinaryData)
    // Update user with new avatar info
    user.avatar = cloudinaryData;
    await user.save();

    // Generate optimized URLs
    const optimizedUrls = {
      thumbnail: cloudinary.url(result.public_id, {
        width: 100,
        height: 100,
        crop: "fill",
      }),
      medium: cloudinary.url(result.public_id, {
        width: 300,
        height: 300,
        crop: "fill",
      }),
      large: cloudinary.url(result.public_id, {
        width: 500,
        height: 500,
        crop: "limit",
      }),
      original: result.secure_url,
    };

    res.status(200).json({
      success: true,
      message: "Profile photo updated successfully",
      data: {
        avatar: user.avatar,
        optimized_urls: optimizedUrls,
      },
    });
  } catch (error) {
    console.error("Error updating profile photo:", error);

    res.status(500).json({
      success: false,
      message: "Server error while updating profile photo",
      error:
        process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
});



/**
 * @desc    Delete user profile photo (avatar)
 * @route   DELETE /api/users/avatar
 * @access  Private
 */
exports.deleteProfilePhoto = catchAsync(async (req, res, next) => {
  try {
    const userId = req.user.id;
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    if (!user.avatar || !user.avatar.public_id) {
      return res.status(400).json({
        success: false,
        message: 'No profile photo to delete',
      });
    }

    // Delete from Cloudinary
    const deleteResult = await deleteFromCloudinary(user.avatar.public_id);
    
    if (deleteResult.result !== 'ok') {
      console.warn('Cloudinary deletion may have failed:', deleteResult);
    }

    // Remove avatar reference from user
    user.avatar = {
      public_id: '',
      url: '',
      format: '',
      bytes: 0,
      width: 0,
      height: 0,
      created_at: null,
    };

    await user.save();

    res.status(200).json({
      success: true,
      message: 'Profile photo deleted successfully',
      data: {
        deletion_result: deleteResult,
      },
    });

  } catch (error) {
    console.error('Error deleting profile photo:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while deleting profile photo',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
});

/**
 * @desc    Get user profile photo
 * @route   GET /api/users/avatar
 * @access  Private
 */
exports.getProfilePhoto = catchAsync(async (req, res, next) => {
  try {
    const userId = req.user.id;
    const user = await User.findById(userId).select('avatar');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    if (!user.avatar || !user.avatar.public_id) {
      return res.status(404).json({
        success: false,
        message: 'No profile photo found',
      });
    }

    // Generate optimized URLs
    const optimizedUrls = {
      thumbnail: getOptimizedUrl(user.avatar.public_id, { width: 100, height: 100, crop: 'fill' }),
      medium: getOptimizedUrl(user.avatar.public_id, { width: 300, height: 300, crop: 'fill' }),
      large: getOptimizedUrl(user.avatar.public_id, { width: 500, height: 500, crop: 'limit' }),
      original: user.avatar.url,
    };

    res.status(200).json({
      success: true,
      data: {
        avatar: user.avatar,
        optimized_urls: optimizedUrls,
      },
    });

  } catch (error) {
    console.error('Error fetching profile photo:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching profile photo',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
});

/**
 * @desc    Update user cover photo
 * @route   PATCH /api/users/cover-photo
 * @access  Private
 */
exports.updateCoverPhoto = catchAsync(async (req, res, next) => {
  try {
    const userId = req.user.id;
    
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Please select an image to upload',
      });
    }

    const user = await User.findById(userId);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    // Extract Cloudinary response data
    const cloudinaryData = {
      public_id: req.file.filename,
      url: req.file.path,
      format: req.file.format,
      bytes: req.file.size,
      width: req.file.width,
      height: req.file.height,
      created_at: new Date(),
    };

    // Delete old cover photo from Cloudinary if exists
    if (user.coverPhoto && user.coverPhoto.public_id) {
      try {
        await deleteFromCloudinary(user.coverPhoto.public_id);
        console.log(`Deleted old cover photo: ${user.coverPhoto.public_id}`);
      } catch (deleteError) {
        console.error('Error deleting old cover photo:', deleteError);
      }
    }

    // Update user with new cover photo info
    user.coverPhoto = cloudinaryData;
    await user.save();

    // Generate optimized URLs for cover photo
    const optimizedUrls = {
      small: getOptimizedUrl(cloudinaryData.public_id, { width: 800, height: 300, crop: 'fill' }),
      medium: getOptimizedUrl(cloudinaryData.public_id, { width: 1200, height: 400, crop: 'fill' }),
      large: getOptimizedUrl(cloudinaryData.public_id, { width: 1600, height: 600, crop: 'limit' }),
      original: cloudinaryData.url,
    };

    res.status(200).json({
      success: true,
      message: 'Cover photo updated successfully',
      data: {
        cover_photo: user.coverPhoto,
        optimized_urls: optimizedUrls,
      },
    });

  } catch (error) {
    console.error('Error updating cover photo:', error);
    
    // Clean up the uploaded file if something went wrong after upload
    if (req.file && req.file.filename) {
      try {
        await deleteFromCloudinary(req.file.filename);
        console.log('Cleaned up uploaded file due to error');
      } catch (cleanupError) {
        console.error('Error cleaning up file:', cleanupError);
      }
    }

    res.status(500).json({
      success: false,
      message: 'Server error while updating cover photo',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
});

/**
 * @desc    Delete user cover photo
 * @route   DELETE /api/users/cover-photo
 * @access  Private
 */
exports.deleteCoverPhoto = catchAsync(async (req, res, next) => {
  try {
    const userId = req.user.id;
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    if (!user.coverPhoto || !user.coverPhoto.public_id) {
      return res.status(400).json({
        success: false,
        message: 'No cover photo to delete',
      });
    }

    // Delete from Cloudinary
    const deleteResult = await deleteFromCloudinary(user.coverPhoto.public_id);
    
    if (deleteResult.result !== 'ok') {
      console.warn('Cloudinary deletion may have failed:', deleteResult);
    }

    // Remove cover photo reference from user
    user.coverPhoto = {
      public_id: '',
      url: '',
      format: '',
      bytes: 0,
      width: 0,
      height: 0,
      created_at: null,
    };

    await user.save();

    res.status(200).json({
      success: true,
      message: 'Cover photo deleted successfully',
      data: {
        deletion_result: deleteResult,
      },
    });

  } catch (error) {
    console.error('Error deleting cover photo:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while deleting cover photo',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
});
