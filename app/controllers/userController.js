const multer = require('multer');
const User = require('../models/userModel');
const factory = require('./handlerFactory');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');
const filterObj = require('../utils/filterObject');

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
});
