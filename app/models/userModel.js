const crypto = require('crypto');
const mongoose = require('mongoose');
const validator = require('validator');
const bcrypt = require('bcryptjs');


const userSchema = new mongoose.Schema({
  name: {
    type: String,
    // required: [true, 'Please tell us your name!'],
  },
  email: {
    type: String,
    unique: true,
    sparse: true,
    lowercase: true,
    trim: true,
    validate: {
      validator: function (v) {
        return !v || /\S+@\S+\.\S+/.test(v);
      },
      message: 'Please provide a valid email'
    }
  },
  phone: {
    type: String,
    sparse: true,
    trim: true
  },
  username: {
    type: String,
    unique: true,
    trim: true,
    minlength: 3,
    maxlength: 30,
    match: /^[a-zA-Z0-9_]+$/ // Alphanumeric and underscores only
  },
  userType: { type: String, enum: ['garageOwner', 'vehicleUser'], default: 'vehicleUser' },
  interests: [String], // e.g., "Car Modifications", "EV", etc.
  rideDetails: {
    brands: [String], // e.g., "Honda", "Hyundai"
    tags: [String],   // e.g., "New Vehicle", "Pre-Owned"
  },
  avatar: {
    public_id: {
      type: String,
      default: '',
    },
    url: {
      type: String,
      default: '',
    },
  },
  coverPhoto: {
    public_id: {
      type: String,
      default: '',
    },
    url: {
      type: String,
      default: '',
    },
  },
  gender: {
    type: String,
    enum: ['Male', 'Female', 'Transgender'],
  },
  isVerified: { type: Boolean, default: false },
  dob: {
    type: Date,
    validate: {
      validator: (date) => {
        return date <= new Date(new Date().setFullYear(new Date().getFullYear() - 10));
      },
      message: 'Your Age should be greater than 10 years',
    },
  },
  address: {
    type: mongoose.Schema.ObjectId,
    ref: 'Address',
  },
  occupation: String,
  role: {
    type: String,
    enum: ['user', 'owner', 'guide', 'admin'],
    default: 'user',
  },
  password: {
    type: String,
    // required: function () {
    //   return !this.socialLogins || this.socialLogins.length === 0;
    // },
    minlength: 6
  },
  firstName: {
    type: String,
    // required: true,
    trim: true
  },
  lastName: {
    type: String,
    // required: true,
    trim: true
  },
  isEmailVerified: {
    type: Boolean,
    default: false
  },
  isPhoneVerified: {
    type: Boolean,
    default: false
  },
  emailVerificationToken: String,
  phoneVerificationToken: String,
  phoneVerificationExpires: Date,
  resetPasswordToken: String,
  resetPasswordExpires: Date,
  profileCompleted: {
    type: Boolean,
    default: false
  },
  confirmPassword: {
    type: String,
    // required: [true, 'Please confirm your password'],
    validate: {
      // This only works on CREATE and SAVE!
      validator: function (el) {
        return el === this.password;
      },
      message: 'Passwords are not the same!',
    },
  },
  passwordChangedAt: Date,
  passwordResetToken: String,
  passwordResetExpires: Date,
  deleted: {
    type: Boolean,
    default: false,
    select: false,
  },
  followersCount: {
    type: Number,
    default: 0,
    min: 0
  },
  followingCount: {
    type: Number,
    default: 0,
    min: 0
  },
  profileImage: String,
  bio: String,
  joinDate: {
    type: Date,
    default: Date.now
  },
  devices: [
    {
      name: String,
      ipAddress: String,
      lastLoggedIn: Date,
      active: {
        type: Boolean,
        default: true,
      },
      select: false,
    },
  ],
  otp: {
    type: String,
  },
  otpExpires: {
    type: Date,
  },
  phone: String,
  address: {
    street: String,
    city: String,
    state: String,
    zipCode: String,
    country: String
  },
  preferences: {
    newsletter: {
      type: Boolean,
      default: true
    },
    notifications: {
      type: Boolean,
      default: true
    }
  },
  topics: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Topic'
  }],
   vehicles: {
    rides: [{
      type: String, 
      trim: true,
      maxlength: 50
    }],
    drives: [{
      type: String, 
      trim: true,
      maxlength: 50
    }]
  },
  bikes: {
    type: [String],
    default: []
  },
  cars: {
    type: [String],
    default: []
  },
}, {
  timestamps: true
});

// OTP Schema for phone verification
const otpSchema = new mongoose.Schema({
  phone: {
    type: String,
    required: true
  },
  otp: {
    type: String,
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now,
    expires: 600 // OTP expires after 10 minutes
  }
});


// Index for username and email
userSchema.index({ username: 1 }, { unique: true });
userSchema.index({ email: 1 }, { unique: true });

// Method to update login info
userSchema.methods.updateLoginInfo = function () {
  this.loginCount += 1;
  this.lastLogin = new Date();
  return this.save();
};


// Virtual populate - parent to child reference
userSchema.virtual('reviews', {
  ref: 'Review',
  foreignField: 'user', //in Review modal
  localField: '_id',
});

// QUERY MIDDLEWARE
userSchema.pre(/^find/, function (next) {
  this.populate({
    path: 'address',
    select: 'city state',
  });
  next();
});

// Virtual for getting secure URL
userSchema.virtual('avatarUrl').get(function () {
  if (this.avatar.url) {
    return this.avatar.url.replace('/upload/', '/upload/w_300,h_300,c_fill/');
  }
  return '';
});


userSchema.pre('save', async function (next) {
  // Only run this function if password was actually modified
  if (!this.isModified('password')) return next();

  // Hash the password with cost of 12
  this.password = await bcrypt.hash(this.password, 12);

  //Delete confirmPassword field / Don't persist in Db
  this.confirmPassword = undefined;
  next();
});

userSchema.pre('save', function (next) {
  if (!this.isModified('password') || this.isNew) {
    return next();
  }
  this.passwordChangedAt = Date.now() - 1000; //saving user in Db before issuing JWT
  next();
});

userSchema.methods.correctPassword = async (candidatePassword, userPassword) => {
  return await bcrypt.compare(candidatePassword, userPassword);
};

userSchema.methods.changedPasswordAfter = function (JWTTimestamp) {
  if (this.passwordChangedAt) {
    const changedTimestamp = parseInt(this.passwordChangedAt.getTime() / 1000, 10);
    // True if password was changed after JWT was issued
    return JWTTimestamp < changedTimestamp;
  }
  return false;
};

userSchema.methods.createPasswordResetToken = function () {
  const resetToken = crypto.randomBytes(32).toString('hex');

  //Encrypted version of resetToken (save in DB)
  this.passwordResetToken = crypto.createHash('sha256').update(resetToken).digest('hex');
  this.passwordResetExpires = Date.now() + 10 * 60 * 1000;
  // console.log({ resetToken }, this.passwordResetToken);
  return resetToken;
};

const User = mongoose.model('User', userSchema);
module.exports = User;
