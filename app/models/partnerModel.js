const mongoose = require('mongoose');

const kycSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['Aadhar', 'PAN', 'DrivingLicense'],
    required: true
  },
  fullName: {
    type: String,
  },
  documentNumber: {
    type: String,
  },
  address: {
    type: String,
  },
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
      'Kawasaki', 'Ducati', 'Benelli', 'BMW','Royal Enfield','HarleyDavidson','BMW Motorrad']
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
      default: 'Point',
    },
    coordinates: {
      type: [Number],
      required: false,
    },
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
  otp: {
    type: String,
  },
  otpExpires: {
    type: Date,
  },
  expertise: {
    type: [String],
    enum: ['Off-Roads', 'Vintages', 'Luxury Automobile'],
    default: []
  },
  kyc: kycSchema,

  // CORRECTED: Use the brandsSchema
  brands: brandsSchema,

  isPremium: {
    type: Boolean,
    default: false
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

module.exports = mongoose.model('Partner', partnerSchema);