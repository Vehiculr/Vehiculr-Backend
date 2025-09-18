const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const axios = require('axios');
const { promisify } = require('util');
const bcrypt = require('bcryptjs');
const User = require('../models/userModel');
const Partner = require('../models/partnerModel');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');
const sendEmail = require('../utils/email');
const { sendOTP } = require('../services/twilioClient');
const { generateOTP } = require('../utils/generateOTP');
const { sendWhatsAppMessage } = require('../services/twilioClient');

const isProduction = () => process.env.NODE_ENV === 'production';

const signToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN,
  });
};

const createSendToken = (account, statusCode, res) => {
  console.log('user in createSendToken:', account);
  const token = signToken(account._id);
  const cookieOptions = {
    expire: new Date(Date.now() + process.env.JWT_COOKIE_EXPIRES_IN * 24 * 60 * 60 * 1000),
    httpOnly: true, //can't be accessed or modified by browser
  };
  if (process.env.NODE_ENV === 'production') cookieOptions.secure = true; //send cookie only on HTTPS conn.

  res.cookie('jwt', token, cookieOptions);

  // user.password = undefined; // Remove password field from created User
  console.log('token:', token);

  res.status(statusCode).json({
    status: 'success',
    token,
    data: {
      account,
    },
  });
};

exports.signup = catchAsync(async (req, res, next) => {
  const { phone, email } = req.body;

  if (!phone && !email) {
    return res.status(400).json({ message: 'Either phone or email is required' });
  }

  let user;

  // 🔹 Check if user already exists
  if (phone) {
    user = await User.findOne({ phone });
    if (user && !(user.email || user.password)) {
      return res.status(400).json({ message: 'Mobile number already registered. Please login' });
    }
  } else if (email) {
    user = await User.findOne({ email });
    if (user && !(user.phone || user.password)) {
      return res.status(400).json({ message: 'Email already registered. Please login' });
    }
  }

  try {
    if (phone) {

      // ✅ Send OTP via MSG91
      //   const otpResponse = await axios.get('https://control.msg91.com/api/v5/otp', {
      //     params: {
      //       authkey: process.env.MSG91_AUTH_KEY,
      //       phone: `91${phone}`,
      //       template_id: process.env.MSG91_TEMPLATE_ID,
      //     },
      //   });
      // ✅ Send OTP via Twilio
      const otp = generateOTP();
      const twilioResponse = await sendOTP(phone, otp);

      if (!twilioResponse.success) {
        return res.status(500).json({ message: "OTP sending failed", error: twilioResponse.error });
      }

      if (!user) {
        user = new User({ phone });
        await user.save();
      }

      return res.status(200).json({ message: 'OTP sent successfully', phone });
    }

    if (email) {
      // ✅ Send verification mail (example using MSG91)
      const mailResponse = await sendVerificationEmail(email);

      if (!mailResponse.success) {
        return res.status(500).json({ message: "Verification email failed", error: mailResponse.error });
      }

      if (!user) {
        user = new User({ email });
        await user.save();
      }

      return res.status(200).json({ message: 'Verification email sent successfully', email });
    }
  } catch (error) {
    return res.status(500).json({
      message: 'Signup failed',
      error: error.response?.data || error.message,
    });
  }
});

exports.login = catchAsync(async (req, res, next) => {
  const { phone } = req.body;
  const [foundUser, foundPartner] = await Promise.all([
    User.findOne({ phone }),
    Partner.findOne({ phone })
  ]);

  const account = foundUser || foundPartner;

  console.log('account:', account);

  if (!account) {
    return res.status(404).json({
      success: false,
      message: "User or Partner not found",
    });
  }
  // 3) Send JWT to client
  createSendToken(account, 200, res);
});

exports.logout = (req, res) => {
  res.cookie('jwt', 'loggedout', {
    expires: new Date(Date.now() + 10 * 24 * 1000 * 60),
    httpOnly: true,
  });
  res.status(200).json({ status: 'success' });
};

exports.protect = catchAsync(async (req, res, next) => {
  // 1) Getting token from headers
  let token;
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  } else if (req.cookies.jwt) {
    token = req.cookies.jwt;
  }

  if (!token) {
    return next(new AppError('You are not logged in! Please log in to get access.', 401));
  }

  // 2) Token Verification - payload & expiry
  const decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET);

  let id = decoded.id; // already a string from your token

  const [foundUser, foundPartner] = await Promise.all([
    User.findById(id),
    Partner.findById(id)
  ]);

  const currentUser = foundUser || foundPartner;
  // 3) Check if user still exists
  if (!currentUser) {
    return next(new AppError('The user belonging to this token does no longer exist.', 401));
  }

  // 4) Check if user changed password after the token was issued
  // if (currentUser.changedPasswordAfter(currentUser.)) {
  //   return next(new AppError('User recently changed password! Please log in again.', 401));
  // }

  // GRANT ACCESS TO PROTECTED ROUTE
  req.user = {
    id: currentUser._id,
    role: currentUser.role,
  };
  next();
});

exports.restrictTo = (...roles) =>
  catchAsync(async (req, res, next) => {
    const userRole = req.user.role;
    if (roles.includes('admin') && userRole === 'admin') {
      next(); //need to pass admin doc filter
    } else if (req.method === 'POST' && userRole === roles[0]) {
      req.docFilter = { [userRole]: req.user.id };
      return next();
    }
    if (roles.includes(userRole)) {
      req.docFilter = { [userRole]: req.user.id };
      return next();
    }
    return next(new AppError('You do not have permission to perform this action', 403));
  });

exports.forgotPassword = catchAsync(async (req, res, next) => {
  // 1) Get user based on POSTed email
  const user = await User.findOne({ email: req.body.email });
  if (!user) {
    return next(new AppError(`No user found with email ${req.body.email}`, 404));
  }

  // 2) Generate the random reset token
  const resetToken = user.createPasswordResetToken();
  await user.save({ validateBeforeSave: false });

  // 3) Send it to user's email
  const resetURL = `${req.protocol}://${req.get('host')}/api/users/resetPassword/${resetToken}`;

  const message = `Forgot your password? Submit a PATCH request before 10 minutes with your New password and passwordConfirm to: ${resetURL}.\nIf you didn't forget your password, please ignore this email!`;
  console.warn('message:-', message);

  try {
    await sendEmail({
      email: user.email,
      subject: 'Password reset token ⚠️',
      message,
    });

    res.status(200).json({
      status: 'success',
      message: 'Token sent to email!',
    });
  } catch (err) {
    user.passwordResetToken = undefined;
    user.passwordReset = undefined;
    await user.save({ validateBeforeSave: false });

    return next(new AppError('There was an error sending the email. Try again later!'), 500);
  }
});

exports.updatePassword = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { password } = req.body;

    if (!password) {
      return res.status(400).json({
        status: "fail",
        message: "Password required"
      });
    }

    // Find user by phone/identifier
    const user = await User.findOne({ userId });
    if (!user) {
      return res.status(404).json({
        status: "fail",
        message: "User not found"
      });
    }

    // Check verification
    if (!user.isVerified) {
      return res.status(401).json({
        status: "fail",
        message: "Phone number not verified"
      });
    }

    // Hash and update password
    const hashedPassword = await bcrypt.hash(password, 12);
    user.password = hashedPassword;
    await user.save();

    res.status(200).json({
      status: "success",
      message: "Password updated successfully ✅"
    });
  } catch (err) {
    next(err);
  }
};

// PATCH API to update username or create new user
exports.updateUserProfile = catchAsync(async (req, res, next) => {
  try {
    const { username, password, firstName, lastName, phone } = req.body;
    const userId = req.user.id;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    if (user) {
      // User exists, check if the requested username is available
      const usernameExists = await User.findOne({ username });
      if (usernameExists && usernameExists._id.toString() !== user._id.toString()) {
        return res.status(409).json({
          message: 'Username already taken by another user'
        });
      }

      // Update the username
      if (username) user.username = username;
      // Optionally update other fields if provided
      if (password) {
        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(password, salt);
      }
      if (firstName) user.firstName = firstName;
      if (lastName) user.lastName = lastName;
      if (phone) user.phone = phone;

      await user.save();

      return res.status(200).json({
        message: 'Username updated successfully',
        user: {
          id: user._id,
          username: user.username,
          email: user.email,
          phone: user.phone,
          firstName: user.firstName,
          lastName: user.lastName,
          isActive: user.isActive
        }
      });
    } else {
      // User doesn't exist, check if we have enough info to create a new user
      if (!password || !firstName || !lastName) {
        return res.status(400).json({
          message: 'User not found. To create a new user, please provide password, firstName, and lastName'
        });
      }

      // Check if email is valid if identifier is an email
      const isEmail = /^\S+@\S+\.\S+$/.test(identifier);

      // Create new user
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(password, salt);

      const newUser = new User({
        username,
        email: isEmail ? identifier : undefined,
        phone: !isEmail ? identifier : phone,
        password: hashedPassword,
        firstName,
        lastName
      });

      await newUser.save();

      return res.status(201).json({
        message: 'User created successfully',
        user: {
          id: newUser._id,
          username: newUser.username,
          email: newUser.email,
          phone: newUser.phone,
          firstName: newUser.firstName,
          lastName: newUser.lastName,
          isActive: newUser.isActive
        }
      });
    }
  } catch (error) {
    console.error('Error in PATCH /users/username:', error);

    // Handle duplicate key errors
    if (error.code === 11000) {
      const field = Object.keys(error.keyValue)[0];
      return res.status(409).json({
        message: `${field} already exists`,
        field: field
      });
    }

    // Handle validation errors
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        message: 'Validation failed',
        errors: errors
      });
    }

    res.status(500).json({
      message: 'Server error while processing user',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});


exports.requestOTP = async (req, res) => {
  try {
    const { phone } = req.body;
    if (!phone) return res.status(400).json({ message: "Phone number is required" });

    let user = await User.findOne({ phone });

    if (!user) {
      user = await User.create({ phone });
    }

    const otp = generateOTP();
    const otpExpires = new Date(Date.now() + (process.env.OTP_EXPIRY || 10) * 60000); // Default 10 minutes

    user.otp = otp;
    user.otpExpires = otpExpires;
    await user.save();

    // Send OTP based on environment
    const otpResponse = await sendOTP(phone, otp);

    if (!otpResponse.success) {
      return res.status(500).json({
        message: "OTP sending failed",
        error: otpResponse.error
      });
    }

    res.status(200).json({
      message: "OTP sent successfully",
      mode: isProduction() ? 'production' : 'development',
      // Include OTP in development for testing
      ...(!isProduction() && { otp: otp, expiresIn: `${process.env.OTP_EXPIRY || 10} minutes` })
    });
  } catch (error) {
    console.error("OTP request error:", error);
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};

// 2️⃣ Verify OTP
exports.verifyOTP = async (req, res) => {
  try {
    const { phone, otp } = req.body;
    if (!phone || !otp) {
      return res.status(400).json({ message: "Phone and OTP are required" });
    }

    const user = await User.findOne({ phone });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // In development, allow using the default test OTP regardless of what's stored
    let isValidOTP = false;

    if (isProduction()) {
      // Production: Strict OTP validation
      isValidOTP = user.otp === otp && user.otpExpires > Date.now();
    } else {
      // Development: Allow test OTP or actual stored OTP
      const testOTP = process.env.DEFAULT_OTP || '12345';
      isValidOTP = (user.otp === otp && user.otpExpires > Date.now()) || otp === testOTP;

      if (otp === testOTP) {
        console.log('✅ Development mode: Using test OTP');
      }
    }

    if (!isValidOTP) {
      return res.status(400).json({
        message: "Invalid or expired OTP",
        hint: isProduction() ? undefined : `Try using: ${process.env.DEFAULT_OTP || '12345'}`
      });
    }

    // ✅ OTP is valid → mark user as verified
    user.isVerified = true;
    user.otp = undefined;        // clear OTP after use
    user.otpExpires = undefined; // clear expiry
    await user.save();

    // ✅ Generate JWT token
    const token = jwt.sign(
      { id: user._id, phone: user.phone },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.status(200).json({
      message: "OTP verified successfully",
      token,
      mode: isProduction() ? 'production' : 'development'
    });
  } catch (error) {
    console.error("OTP verification error:", error);
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};


exports.sendWhatsAppPromotionMessage = async (req, res) => {
  try {
    const { phone } = req.body;
    if (!phone) return res.status(400).json({ message: "whatsapp number is required" });

    let user = await User.findOne({ phone });

    if (!user) {
      user = await User.create({ phone });
    }

    message = `*Garages of India* 🚗\n\n_Exciting Offers Await!_\n\n🛠️ Get your vehicle serviced now!\n📍 Available in 25+ cities\n\n👉 Visit: www.garagesofindia.com`

    await user.save();
    const twilioResponse = await sendWhatsAppMessage(phone, message);
    if (!twilioResponse.success) {
      return res.status(500).json({ message: "OTP sending failed", error: twilioResponse.error });
    }

    res.status(200).json({ message: "OTP sent successfully" });
  } catch (error) {
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};

//storing the password
exports.storeUserPassword = catchAsync(async (req, res, next) => {
  const { phone, password } = req.body;

  if (!phone || !password) {
    return next(new AppError('Phone and password are required.', 400));
  }

  if (phone.length !== 10 || !/^\d{10}$/.test(phone)) {
    return next(new AppError('Phone number must be a valid 10-digit number.', 400));
  }

  if (password.length < 5) {
    return next(new AppError('Password must be at least 5 characters long.', 400));
  }

  // 1. Hash the password
  const hashedPassword = await bcrypt.hash(password, 12);

  // 2. Upsert user (create if not exists)
  const user = await User.findOneAndUpdate(
    { phoneNo: phone },
    {
      password: hashedPassword,
      passwordConfirm: hashedPassword, // Bypass validator (not ideal for production)
      isVerified: true, // optional
    },
    { new: true, upsert: true, runValidators: false }
  );

  res.status(200).json({
    status: 'success',
    message: 'Password stored successfully',
    data: {
      phone: user.phone,
    },
  });
});

exports.checkUsernameExists = catchAsync(async (req, res, next) => {
  const { username } = req.query;

  if (!username) {
    return next(new AppError('Username is required', 400));
  }

  const user = await User.findOne({ userName: username });

  res.status(200).json({
    status: 'success',
    data: {
      exists: !!user,
    },
  });
});



exports.updateUsername = catchAsync(async (req, res, next) => {
  const { newUsername } = req.body;

  if (!newUsername) {
    return next(new AppError('New username is required', 400));
  }

  const existingUser = await User.findOne({ userName: newUsername });

  if (existingUser) {
    return next(new AppError('Username already taken. Please choose another.', 409));
  }

  const updatedUser = await User.findByIdAndUpdate(
    req.user.id,
    { userName: newUsername },
    { new: true, runValidators: true }
  );

  res.status(200).json({
    status: 'success',
    message: 'Username updated successfully',
    data: {
      userName: updatedUser.userName,
    },
  });
});





// msg91 integration
const msg91 = require('../services/msg91Service');

exports.sendOtpToUser = async (req, res, next) => {
  const { phone } = req.body;
  const generatedOtp = Math.floor(100000 + Math.random() * 900000);

  try {
    await msg91.sendO1TP(phone, generatedOtp);
    res.status(200).json({ message: 'OTP sent successfully' });
  } catch (err) {
    next(new AppError('Failed to send OTP', 500));
  }
};

exports.verifyUserOtp = async (req, res, next) => {
  const { phone, otp } = req.body;

  try {
    const result = await msg91.verifyOTP(phone, otp);

    if (result.type === 'success') {
      res.status(200).json({ message: 'OTP verified successfully' });
    } else {
      next(new AppError('Invalid OTP', 400));
    }
  } catch (err) {
    next(new AppError('OTP verification failed', 500));
  }
};
