const mongoose = require('mongoose');

const kycSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['Aadhar'],
    required: true
  },

  // From Cashfree OKYC Verify API
  fullName: String,
  dob: String,
  gender: String,
  fatherName: String,
  address: String,
  photo: String,

  // Aadhaar info
  aadhaarMasked: String,   // XXXX-XXXX-1234
  aadhaarLast4: String,    // 1234

  // Cashfree OKYC
  refId: String,           
  rawVerifyResponse: Object,

  verified: {
    type: Boolean,
    default: false
  }
}, { _id: false });

// Brands schema
const brandsSchema = new mongoose.Schema({
  carBrands: [{
    type: String,
    enum: ['Audi', 'BMW', 'Chevrolet', 'Ford', 'Hyundai', 'Honda', 'Jeep', 'Kia',
      'Mahindra', 'Morris Garages', 'Nissan', 'Renault', 'Skoda', 'Suzuki',
      'Tata Motors', 'Toyota']
  }],
  bikeBrands: [{
    type: String,
    enum: ['Aprilia', 'Hero', 'Bajaj', 'Hero Motocorp', 'TVS', 'Honda', 'Yamaha',
      'Kawasaki', 'Ducati', 'Benelli', 'BMW', 'Royal Enfield', 'HarleyDavidson', 'BMW Motorrad']
  }]
}, { _id: false });

// Partners schema
const partnerSchema = new mongoose.Schema({
  garageId: {
    type: String,
    unique: true,
    sparse: true
  },
  fullName: {
    type: String,
  },
  businessName: {
    type: String,
  },
  shopLocation: {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point'
    },
    coordinates: {
      type: [Number], // [longitude, latitude]
      default: [0, 0],
      required: true
    }
  },
  experience: {
    type: Number, // years of experience
    required: false,
    min: 0,
  },
  shopPhotos: [{
    public_id: {
      type: String,
      required: true
    },
    url: {
      type: String,
      required: true
    },
    secure_url: {
      type: String,
      required: false
    },
    format: String,
    bytes: Number,
    width: Number,
    height: Number,
    created_at: {
      type: Date,
      default: Date.now
    },
    resource_type: {
      type: String,
      default: 'image'
    }
  }],
  phone: {
    type: String,
    unique: true,
    match: [/^\+91[0-9]{10}$/, 'Please enter a valid Indian phone number with +91']
  },
  email: {
    type: String
  },
  picture: String,
  vehicleTypes: {
    type: [String],
    enum: ["Car", "Bike"],
    required: true
  },
  accountType: { type: String, enum: ['user', 'partner'], default: 'partner' },
  otp: {
    type: String,
  },
  otpExpires: {
    type: Date,
  },
  expertise: {
    type: [String],
    enum: [],
    default: []
  },
  kyc: kycSchema,

  // CORRECTED: Use the brandsSchema
  brands: brandsSchema,
  services: [
    {
      categoryName: { type: String, required: true },
      subServices: [
        {
          name: { type: String, required: true },
          selected: { type: Boolean, default: false }
        }
      ]
    }
  ],
  isPremium: {
    type: Boolean,
    default: false
  },
  bio: {
    type: String,
    trim: true,   // Kindly add a brief description about your garage and it’s expertise.
  },
  maxFreeBrands: {
    type: Number,
    default: 50   // brand limit befeoreIncreased limit for free accounts
  },

  // QR Code data
  qrCode: {
    publicUrl: {
      type: String,
      required: false
    },
    displayUrl: {
      type: String,
      required: false
    },
    qrImageData: {
      type: String, // This will store the Data URL of the QR code image
      required: false
    },
    generatedAt: {
      type: Date,
      default: Date.now
    },
    lastUpdated: {
      type: Date,
      default: Date.now
    }
  },
  refreshTokens: [
    {
      token: String,
      deviceInfo: {
        deviceId: String,
        deviceType: String,
        userAgent: String,
        ip: String
      },
      createdAt: { type: Date, default: Date.now },
    }
  ],
  googleId: { type: String, index: true, unique: false }, // unique optional across both models
  role: { type: String, enum: ['user', 'partner', 'admin'], default: 'user' },
  isVerified: { type: Boolean, default: false },

  // Also add quoteOtp fields if not already:
  quoteOtp: String,
  quoteOtpExpires: Date,

}, { timestamps: true });

// Add pre-save hook to initialize brands
partnerSchema.pre('save', function (next) {
  // Initialize garageId if not exists
  if (!this.garageId && this._id) {
    this.garageId = `GAR${this._id.toString().slice(-5).toUpperCase()}`;
  }
  if (this.isModified('qrCode')) {
    this.qrCode.lastUpdated = new Date();
  }
  // Initialize brands object if not exists
  if (!this.brands) {
    this.brands = {
      carBrands: [],
      bikeBrands: []
    };
  }
  

  next();
});
partnerSchema.index({ shopLocation: '2dsphere' });

module.exports = mongoose.model('Partner', partnerSchema);