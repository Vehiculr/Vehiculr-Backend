const mongoose = require('mongoose');

const kycSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['Aadhar', 'PAN', 'DrivingLicense'],
    required: true
  },
  fullName: {
    type: String,
    required: true
  },
  documentNumber: {
    type: String,
    required: true,
    unique: true
  },
  address: {
    type: String,
    required: true
  },
  verified: {
    type: Boolean,
    default: false
  }
}, { _id: false });

const partnerSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please tell us your name!'],
  },
  shopName: {
    type: String,
    required: [true, 'Please provide your shop name!'],
  },
  address: { 
    type: String,
    required: [true, 'Please provide your address!'],
  },
  phone: { 
    type: String,
    required: [true, 'Please provide your phone number!'],
    unique: true,
    match: [/^\+91[0-9]{10}$/, 'Please enter a valid Indian phone number with +91']
  },
  expertise: {
    type: [String],
    enum: ['Off-Roads', 'Vintages', 'Luxury Automobile'],
    default: []
  },
  kyc: kycSchema // ✅ Added KYC support
}, { timestamps: true });

module.exports = mongoose.model('Partner', partnerSchema);
