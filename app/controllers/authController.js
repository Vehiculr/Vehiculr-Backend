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
require("dotenv").config();

const isProduction = () => process.env.NODE_ENV === 'production';

const signToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN,
  });
};

const createSendToken = (account, statusCode, res) => {
  const token = signToken(account._id);
  const cookieOptions = {
    expire: new Date(Date.now() + process.env.JWT_COOKIE_EXPIRES_IN * 24 * 60 * 60 * 1000),
    httpOnly: true, //can't be accessed or modified by browser
  };
  if (process.env.NODE_ENV === 'production') cookieOptions.secure = true; //send cookie only on HTTPS conn.

  res.cookie('jwt', token, cookieOptions);

  // user.password = undefined; // Remove password field from created User
  res.status(statusCode).json({
    status: 'success',
    message: "Login successful",
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

    // Check username uniqueness ONLY if username is being updated
    if (username && username !== user.username) {
      const usernameExists = await User.findOne({
        username,
        _id: { $ne: user._id } // Exclude current user
      });
console.log('usernameExists', usernameExists);  

      if (usernameExists) {
        return res.status(409).json({
          success: false,
          message: 'username already taken by another user'
        });
      }
      user.username = username;
    }

    // Update other fields if provided
    if (password) {
      const salt = await bcrypt.genSalt(10);
      user.password = await bcrypt.hash(password, salt);
    }
    if (firstName) user.firstName = firstName;
    if (lastName) user.lastName = lastName;

    // Check phone uniqueness ONLY if phone is being updated
    if (phone && phone !== user.phone) {
      const phoneExists = await User.findOne({
        phone,
        _id: { $ne: user._id } // Exclude current user
      });

      if (phoneExists) {
        return res.status(409).json({
          success: false,
          message: 'Phone number already registered with another account'
        });
      }
      user.phone = phone;
    }

    await user.save();

    // Return updated user data (excluding sensitive information)
    const updatedUser = await User.findById(userId).select('-password -otp -otpExpires');

    res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      data: {
        user: updatedUser
      }
    });

  } catch (error) {
    console.error('Error updating user profile:', error);

    // Handle duplicate key errors
    if (error.code === 11000) {
      const field = Object.keys(error.keyValue)[0];
      return res.status(409).json({
        success: false,
        message: `${field} already exists`,
        field: field
      });
    }

    // Handle validation errors
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors
      });
    }

    res.status(500).json({
      success: false,
      message: 'Server error while updating profile',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});


exports.requestOTP = async (req, res) => {
  try {
    const { phone, accountType = 'user' } = req.body; // Default to 'user'
    if (!phone) return res.status(400).json({ message: "Phone number is required" });

    let account;
    let detectedAccountType;

    // Check both collections
    const [foundUser, foundPartner] = await Promise.all([
      User.findOne({ phone }),
      Partner.findOne({ phone })
    ]);

    // If requesting partner and partner exists, use partner
    if (accountType === 'partner' && foundPartner) {
      account = foundPartner;
      detectedAccountType = 'partner';
    }
    // If requesting user and user exists, use user
    else if (accountType === 'user' && foundUser) {
      account = foundUser;
      detectedAccountType = 'user';
    }
    // If account exists but not the requested type, return error
    else if ((accountType === 'partner' && foundUser) || (accountType === 'user' && foundPartner)) {
      return res.status(400).json({
        message: `Phone number already registered as ${foundUser ? 'user' : 'partner'}`,
        existingAccountType: foundUser ? 'user' : 'partner',
        suggestion: 'Use a different phone number or contact support'
      });
    }
    // No account exists, create new based on requested type
    else {
      if (accountType === 'partner') {
        account = await Partner.create({ phone });
        detectedAccountType = 'partner';
      } else {
        account = await User.create({ phone });
        detectedAccountType = 'user';
      }
    }

    const otp = generateOTP();
    const otpExpires = new Date(Date.now() + (process.env.OTP_EXPIRY || 10) * 60000);

    // Update OTP details
    account.otp = otp;
    account.otpExpires = otpExpires;
    await account.save();

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
      accountType: detectedAccountType,
      // Include OTP in development for testing
      ...(!isProduction() && {
        otp: otp,
        expiresIn: `${process.env.OTP_EXPIRY || 10} minutes`,
        accountId: account._id
      })
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

    // Check both User and Partner collections
    const [foundUser, foundPartner] = await Promise.all([
      User.findOne({ phone }),
      Partner.findOne({ phone })
    ]);

    const account = foundUser || foundPartner;
    if (!account) {
      return res.status(404).json({ message: "Account not found" });
    }

    const accountType = foundUser ? 'user' : 'partner';

    // In development, allow using the default test OTP regardless of what's stored
    let isValidOTP = false;

    if (isProduction()) {
      // Production: Strict OTP validation
      isValidOTP = account.otp === otp && account.otpExpires > Date.now();
    } else {
      // Development: Allow test OTP or actual stored OTP
      const testOTP = process.env.DEFAULT_OTP || '12345';
      isValidOTP = (account.otp === otp && account.otpExpires > Date.now()) || otp === testOTP;

      if (otp === testOTP) {
        console.log('✅ Development mode: Using test OTP');
      }
    }

    if (!isValidOTP) {
      return res.status(400).json({
        message: "Invalid or expired OTP",
        hint: isProduction() ? undefined : `Try using: ${process.env.DEFAULT_OTP || '12345'}`,
        accountType: accountType
      });
    }

    // ✅ OTP is valid → mark account as verified
    account.isVerified = true;
    account.otp = undefined;        // clear OTP after use
    account.otpExpires = undefined; // clear expiry
    await account.save();

    // ✅ Generate JWT token with account type in payload
    const tokenPayload = {
      id: account._id,
      phone: account.phone,
      accountType: accountType,
      isVerified: true
    };

    const token = jwt.sign(
      tokenPayload,
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.status(200).json({
      message: "OTP verified successfully",
      token,
      accountType: accountType,
      accountId: account._id,
      mode: isProduction() ? 'production' : 'development',
      // Include user/partner specific data if needed
      ...(accountType === 'partner' && { businessName: account.businessName }),
      ...(accountType === 'user' && { fullName: account.fullName })
    });
  } catch (error) {
    console.error("OTP verification error:", error);
    res.status(500).json({
      message: "Server Error",
      error: process.env.NODE_ENV === "development" ? error.message : "Internal server error"
    });
  }
};

exports.requestEmailOTP = async (req, res) => {
  try {
    const { email, accountType = 'user' } = req.body;
    console.log('requestEmailOTP called with:', req.body);  
    
    if (!email) {
      return res.status(400).json({ 
        message: "Email address is required" 
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ 
        message: "Invalid email format" 
      });
    }

    let account;
    let detectedAccountType;

    // Check both collections concurrently
    const [foundUser, foundPartner] = await Promise.all([
      User.findOne({ email: email.toLowerCase() }),
      Partner.findOne({ email: email.toLowerCase() })
    ]);
    console.log('requestEmailOTP called with:', foundUser, foundPartner);  
    
    // If requesting partner and partner exists, use partner
    if (accountType === 'partner' && foundPartner) {
      account = foundPartner;
      detectedAccountType = 'partner';
    }
    // If requesting user and user exists, use user
    else if (accountType === 'user' && foundUser) {
      account = foundUser;
      detectedAccountType = 'user';
    }
    // If account exists but not the requested type, return error
    else if ((accountType === 'partner' && foundUser) || 
             (accountType === 'user' && foundPartner)) {
      return res.status(400).json({
        message: `Email already registered as ${foundUser ? 'user' : 'partner'}`,
        existingAccountType: foundUser ? 'user' : 'partner',
        suggestion: 'Use a different email address or contact support'
      });
    }
    // No account exists, create new based on requested type
    else {
      if (accountType === 'partner') {
        account = await Partner.create({ 
          email: email.toLowerCase(),
          emailVerified: false
        });
        detectedAccountType = 'partner';
      } else {
        account = await User.create({ 
          email: email.toLowerCase(),
          emailVerified: false
        });
        detectedAccountType = 'user';
      }
    }

    // Generate OTP and set expiration
    const otp = generateOTP();
    const otpExpires = new Date(Date.now() + (process.env.OTP_EXPIRY || 10) * 60000);

    // Update OTP details
    account.otp = otp;
    account.otpExpires = otpExpires;
    await account.save();

    // Send OTP via email
    const otpResponse = await sendOTP(email, otp);

    if (!otpResponse.success) {
      return res.status(500).json({
        message: "Failed to send OTP email",
        error: otpResponse.error
      });
    }

    res.status(200).json({
      message: "OTP sent successfully to your email",
      mode: isProduction() ? 'production' : 'development',
      accountType: detectedAccountType,
      // Include OTP in development for testing
      ...(!isProduction() && {
        otp: otp,
        expiresIn: `${process.env.OTP_EXPIRY || 10} minutes`,
        accountId: account._id
      })
    });
  } catch (error) {
    console.error("Email OTP request error:", error);
    
    // Handle duplicate key errors (if email is unique in both collections)
    if (error.code === 11000) {
      return res.status(400).json({
        message: "Email already exists in the system",
        error: "Duplicate email"
      });
    }
    
    res.status(500).json({ 
      message: "Server Error", 
      error: error.message 
    });
  }
};


exports.verifyEmailOTP = async (req, res) => {
  try {
    const { email, otp } = req.body;
    
    if (!email || !otp) {
      return res.status(400).json({ 
        message: "Email and OTP are required" 
      });
    }

  // Check both User and Partner collections
    const [foundUser, foundPartner] = await Promise.all([
      User.findOne({ email }),
      Partner.findOne({ email })
    ]);

    const account = foundUser || foundPartner;
    if (!account) {
      return res.status(404).json({ message: "Account not found" });
    }

    const accountType = foundUser ? 'user' : 'partner';

    // In development, allow using the default test OTP regardless of what's stored
    let isValidOTP = false;

    if (isProduction()) {
      // Production: Strict OTP validation
      isValidOTP = account.otp === otp && account.otpExpires > Date.now();
    } else {
      // Development: Allow test OTP or actual stored OTP
      const testOTP = process.env.DEFAULT_OTP || '12345';
      isValidOTP = (account.otp === otp && account.otpExpires > Date.now()) || otp === testOTP;

      if (otp === testOTP) {
        console.log('✅ Development mode: Using test OTP');
      }
    }

    if (!isValidOTP) {
      return res.status(400).json({
        message: "Invalid or expired OTP",
        hint: isProduction() ? undefined : `Try using: ${process.env.DEFAULT_OTP || '12345'}`,
        accountType: accountType
      });
    }

    // Clear OTP and mark email as verified
    account.otp = undefined;
    account.otpExpires = undefined;
    account.emailVerified = true;
    await account.save();

    // Generate authentication token (if needed)
 // ✅ Generate JWT token with account type in payload
    const tokenPayload = {
      id: account._id,
      phone: account.phone,
      accountType: accountType,
      isVerified: true
    };

    const token = jwt.sign(
      tokenPayload,
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );
    res.status(200).json({
      message: "Email verified successfully",
      emailVerified: true,
      token: token,
      accountType: accountType,
      accountId: account._id,
      mode: isProduction() ? 'production' : 'development',
      // Include user/partner specific data if needed
      ...(accountType === 'partner' && { businessName: account.businessName }),
      ...(accountType === 'user' && { fullName: account.fullName })
    });
  } catch (error) {
    console.error("Email OTP verification error:", error);
    res.status(500).json({ 
      message: "Server Error", 
      error: error.message 
    });
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

exports.checkusernameExists = catchAsync(async (req, res, next) => {
  const { username } = req.query;

  if (!username) {
    return next(new AppError('username is required', 400));
  }

  const user = await User.findOne({ username: username });

  res.status(200).json({
    status: 'success',
    data: {
      exists: !!user,
    },
  });
});



exports.updateusername = catchAsync(async (req, res, next) => {
  const { newusername } = req.body;

  if (!newusername) {
    return next(new AppError('New username is required', 400));
  }

  const existingUser = await User.findOne({ username: newusername });

  if (existingUser) {
    return next(new AppError('username already taken. Please choose another.', 409));
  }

  const updatedUser = await User.findByIdAndUpdate(
    req.user.id,
    { username: newusername },
    { new: true, runValidators: true }
  );

  res.status(200).json({
    status: 'success',
    message: 'username updated successfully',
    data: {
      username: updatedUser.username,
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

/***********************************
 * 🔹 1️⃣ Login via Email & Password
 ***********************************/
exports.loginWithEmail = catchAsync(async (req, res, next) => {
  const { email, password } = req.body;

  if (!email || !password)
    return next(new AppError("Email and password are required", 400));

  // Check both User and Partner collections
  const [foundUser, foundPartner] = await Promise.all([
    User.findOne({ email }).select("+password"),
    Partner.findOne({ email }).select("+password"),
  ]);

  const account = foundUser || foundPartner;
  if (!account) return next(new AppError("Invalid email or password", 401));

  const accountType = foundUser ? "user" : "partner";

  // Compare passwords
  const isMatch = await bcrypt.compare(password, account.password);
  if (!isMatch) return next(new AppError("Invalid email or password", 401));

  createSendToken(account, 200, res);
});

/***********************************
 * 🔹 2️⃣ Login via Phone (Request OTP)
 ***********************************/
exports.loginRequestOTP = catchAsync(async (req, res, next) => {
  const { phone } = req.body;

  if (!phone) return next(new AppError("Phone number is required", 400));

  const [foundUser, foundPartner] = await Promise.all([
    User.findOne({ phone }),
    Partner.findOne({ phone }),
  ]);

  const account = foundUser || foundPartner;
  if (!account)
    return next(new AppError("Account not found. Please register first.", 404));

  const accountType = foundUser ? "user" : "partner";

  const otp = generateOTP();
  const otpExpires = new Date(Date.now() + (process.env.OTP_EXPIRY || 10) * 60000);

  account.otp = otp;
  account.otpExpires = otpExpires;
  await account.save();

  const otpResponse = await sendOTP(phone, otp);
  if (!otpResponse.success)
    return next(new AppError("Failed to send OTP", 500));

  res.status(200).json({
    success: true,
    message: "OTP sent successfully for login",
    mode: isProduction() ? "production" : "development",
    accountType,
    ...( !isProduction() && { otp, expiresIn: `${process.env.OTP_EXPIRY || 10} minutes` }),
  });
});

/***********************************
 * 🔹 3️⃣ Verify OTP (Complete Login)
 ***********************************/
exports.loginVerifyOTP = catchAsync(async (req, res, next) => {
  const { phone, otp } = req.body;
  if (!phone || !otp)
    return next(new AppError("Phone and OTP are required", 400));

  const [foundUser, foundPartner] = await Promise.all([
    User.findOne({ phone }),
    Partner.findOne({ phone }),
  ]);

  const account = foundUser || foundPartner;
  if (!account) return next(new AppError("Account not found", 404));

  const accountType = foundUser ? "user" : "partner";

  let isValidOTP = false;
console.log('Verifying OTP for account:', accountType, account.phone);
  if (isProduction()) {
    isValidOTP = account.otp === otp && account.otpExpires > Date.now();
  } else {
    const testOTP = process.env.DEFAULT_OTP || "12345";
    isValidOTP =
      (account.otp === otp && account.otpExpires > Date.now()) || otp === testOTP;

    if (otp === testOTP) console.log("✅ Development mode: Test OTP used");
  }

  if (!isValidOTP)
    return next(new AppError("Invalid or expired OTP", 400));

  // Clear OTP after successful login
  account.otp = undefined;
  account.otpExpires = undefined;
  await account.save();

  createSendToken(account, 200, res);
});
