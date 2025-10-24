const multer = require('multer');
const User = require('../models/userModel');
const Partner = require('../models/partnerModel');
const factory = require('./handlerFactory');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');
const filterObj = require('../utils/filterObject');
const Topic = require('../models/topicsModel');
const { deleteFromCloudinary, getOptimizedUrl } = require('../utils/cloudinaryConfig');
const { uploadToCloudinary } = require('../utils/cloudinaryConfig');
const cloudinary = require("cloudinary").v2;
const { sendWhatsAppMessage } = require("../services/twilioClient"); // Import Twilio utility


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

exports.createPassword = catchAsync(async (req, res, next) => {
  if (req.body.password || req.body.confirmPassword) {
    if (!req.body.password || !req.body.confirmPassword) {
      return next(new AppError('Please provide both password and confirmPassword.', 400));
    }

    if (req.body.password !== req.body.confirmPassword) {
      return next(new AppError('Passwords do not match.', 400));
    }
    console.log("User for password update:", req.user.id);

    const user = await User.findById(req.user.id).select('+password');
    if (!user) {
      return next(new AppError('User not found.', 404));
    }

    user.password = req.body.password; // Will be hashed by pre-save middleware
    await user.save(); // Not findByIdAndUpdate → so that pre-save middleware works

    return res.status(200).json({
      status: 'success',
      message: 'Password updated successfully!',
    });
  }

  // 3) Otherwise update non-password fields
  const filteredBody = filterObj(req.body, 'name', 'phone'); // allow only safe fields
  if (req.file) filteredBody.photo = req.file.filename;

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
    console.log('username', req.query)

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

// Check if username exists
exports.checkUsernameExists = async (req, res) => {
  try {
    const { username } = req.query;
    const user = await User.findOne({ username });

    if (user) {
      return res.status(200).json({ exists: true, message: 'Username already taken' });
    } else {
      return res.status(200).json({ exists: false, message: 'Username is available' });
    }
  } catch (err) {
    res.status(500).json({ message: 'Error checking username', error: err.message });
  }
};

// Update username
exports.updateUsername = catchAsync(async (req, res, next) => {
  const { username } = req.body;

  if (!username) {
    return next(new AppError('Please provide a username to update', 400));
  }

  // Check if username already exists
  const existingUser = await User.findOne({ username });
  if (existingUser) {
    return next(new AppError('Username already taken, please choose another one.', 400));
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
})

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
    const userId = req.user.id;

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
})

// PATCH controller for adding vehicles
exports.updateVehicles = catchAsync(async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { bikes, cars } = req.body;

    const user = await User.findByIdAndUpdate(
      userId,
      {
        $addToSet: {
          bikes: { $each: bikes || [] },
          cars: { $each: cars || [] }
        }
      },
      { new: true, runValidators: true }
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Vehicles updated successfully!",
      data: user,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: "Error updating vehicles",
      error: err.message,
    });
  }
});


// Update user vehicles (rides and drives)
exports.updateRideAndDrives = catchAsync(async (req, res, next) => {
  const userId = req.user.id;
  const { rides, drives } = req.body;

  const user = await User.findById(userId);
  if (!user) {
    return next(new AppError('User not found', 404));
  }

  // Initialize vehicles object if it doesn't exist
  if (!user.vehicles) {
    user.vehicles = {
      rides: [],
      drives: []
    };
  }

  // Update rides if provided (remove duplicates)
  if (rides !== undefined) {
    const uniqueRides = [...new Set(rides.map(ride => ride.trim()))].filter(ride => ride);
    user.vehicles.rides = uniqueRides;
  }

  // Update drives if provided (remove duplicates)
  if (drives !== undefined) {
    const uniqueDrives = [...new Set(drives.map(drive => drive.trim()))].filter(drive => drive);
    user.vehicles.drives = uniqueDrives;
  }

  await user.save();

  res.status(200).json({
    success: true,
    message: 'Vehicles updated successfully',
    data: {
      vehicles: user.vehicles
    }
  });
});

// Get user vehicles
exports.getUserVehicles = catchAsync(async (req, res, next) => {
  const userId = req.user.id;
console.log('getUserVehicles==>', userId)
  const user = await User.findById(userId).select('vehicles');
  if (!user) {
    return next(new AppError('User not found', 404));
  }

  res.status(200).json({
    success: true,
    data: {
      vehicles: user.vehicles || { rides: [], drives: [] }
    }
  });
});

// Clear all vehicles
exports.clearVehicles = catchAsync(async (req, res, next) => {
  const userId = req.user.id;

  const user = await User.findById(userId);
  if (!user) {
    return next(new AppError('User not found', 404));
  }

  user.vehicles = {
    rides: [],
    drives: []
  };

  await user.save();

  res.status(200).json({
    success: true,
    message: 'Vehicles cleared successfully',
    data: {
      vehicles: user.vehicles
    }
  });
});

exports.notifyGarageOwner = catchAsync(async (req, res, next) => {
  const  partnerId  = req.params.id; 
  const partner = await Partner.findById(partnerId);
  if (!partner) return next(new AppError("Partner Garage not found", 404));
  const userId = req.user.id;
  const user = await User.findById(userId);
  console.log('=====',user)
  if (!user) return next(new AppError("User not found", 404));

  const ownerPhone = partner.phone;
  const userPhone = user.phone || "N/A";
  const userName = user.name || "A customer";
  const garageName = partner.businessName || "Your Garage";

  if (!ownerPhone)
    return next(new AppError("Garage owner has no WhatsApp number", 400));

  // ===== WhatsApp Message =====
  const enquiryMessage = 
`🚗 *New Customer Enquiry via Vehiculrr!*\n\n
Hello *${garageName}*, 👋\n\n
Great news! *${userName}* has shown interest in your garage through Vehiculrr.\n\n
📞 *Customer Contact:* ${userPhone}\n
💬 They are looking to know more about your services.\n\n
This enquiry was sent from your listing on *Vehiculrr*, where we connect vehicle owners with trusted garages like yours.\n\n
👉 Please reach out to *${userName}* at the above number, or share your service details and charges directly.\n\n
Let’s not keep your next customer waiting!\n\n
— *Team Vehiculrr* 🚀`;

  await sendWhatsAppMessage(ownerPhone, enquiryMessage);

  // ===== for Notify user also =====
  const userMessage = 
`Hey *${userName}* 👋,\n\n
Your enquiry for *${garageName}* has been sent successfully via Vehiculrr.\n\n
The garage owner will reach out to you soon at *${userPhone}*.\n\n
Thanks for using *Vehiculrr*! 🚗`;

  if (userPhone && userPhone !== "N/A") {
    // await sendWhatsAppMessage(userPhone, userMessage);
    await sendWhatsAppMessage(ownerPhone, userMessage);   //---testing for same number
  }

  res.status(200).json({
    status: "success",
    message: "WhatsApp enquiry sent successfully to garage and user.",
  });
});