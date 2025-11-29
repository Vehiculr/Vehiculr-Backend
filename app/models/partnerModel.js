const mongoose = require("mongoose");

/* -------------------------- KYC SUB-SCHEMA -------------------------- */
const kycSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ["Aadhar"],
    required: true
  },
  fullName: String,
  dob: String,
  gender: String,
  fatherName: String,
  address: String,
  photo: String,

  aadhaarMasked: String,
  aadhaarLast4: String,

  refId: String,
  rawVerifyResponse: Object,

  verified: {
    type: Boolean,
    default: false
  }
}, { _id: false });

/* ------------------------- BRANDS SUB-SCHEMA ------------------------- */
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

/* -------------------------- PARTNER SCHEMA -------------------------- */
const partnerSchema = new mongoose.Schema({
  garageId: {
    type: Number,
    unique: true,
    sparse: true
  },

  fullName: String,
  businessName: String,

  shopLocation: {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point'
    },
    coordinates: {
      type: [Number],
      default: [0, 0],
      required: true
    }
  },
  experience: {
    type: Number,
    min: 0
  },
  shopPhotos: [{
    url: { type: String, required: true },
    secure_url: String,
    format: String,
    bytes: Number,
    width: Number,
    height: Number,
    created_at: { type: Date, default: Date.now },
    resource_type: { type: String, default: 'image' }
  }],
  phone: {
    type: String,
    unique: true,
    match: [/^\+91[0-9]{10}$/, "Enter valid +91 phone number"]
  },

  email: { type: String },
  picture: String,
  vehicleTypes: {
    type: [{
      type: String,
      enum: ["Car", "Bike"]
    }],
    required: true
  },
  accountType: { type: String, enum: ['user', 'partner'], default: 'partner' },

  otp: String,
  otpExpires: Date,

  expertise: { type: [String], default: [] },

  kyc: kycSchema,

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

  isPremium: { type: Boolean, default: false },

  bio: { type: String, trim: true },

  maxFreeBrands: { type: Number, default: 50 },

  qrCode: {
    publicUrl: String,
    displayUrl: String,
    qrImageData: String,
    generatedAt: { type: Date, default: Date.now },
    lastUpdated: { type: Date, default: Date.now }
  },

  refreshTokens: [{
    token: String,
    deviceInfo: {
      deviceId: String,
      deviceType: String,
      userAgent: String,
      ip: String
    },
    createdAt: { type: Date, default: Date.now }
  }],

  googleId: { type: String, index: true },

  role: { type: String, enum: ['user', 'partner', 'admin'], default: 'partner' },
  isVerified: { type: Boolean, default: false },

  quoteOtp: String,
  quoteOtpExpires: Date

}, { timestamps: true });

/* --------------------- UNIQUE 8-DIGIT NUMBER GENERATOR --------------------- */
async function generateUniqueGarageId(model) {
  let id, exists = true;

  while (exists) {
    id = Math.floor(1000000 + Math.random() * 9000000); // 8-digit
    exists = await model.findOne({ garageId: id });
  }
  return id;
}

/* ----------------------------- PRE-SAVE HOOK ----------------------------- */
partnerSchema.pre("save", async function (next) {
  if (!this.garageId) {
    this.garageId = await generateUniqueGarageId(this.constructor);
  }

  if (this.isModified("qrCode")) {
    this.qrCode.lastUpdated = new Date();
  }

  if (!this.brands) {
    this.brands = { carBrands: [], bikeBrands: [] };
  }

  next();
});

/* ------------------------------ INDEXES ---------------------------------- */
partnerSchema.index({ shopLocation: "2dsphere" });
partnerSchema.index({ garageId: 1 }, { unique: true });

module.exports = mongoose.model("Partner", partnerSchema);
