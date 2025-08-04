const mongoose = require('mongoose');


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
  }

}, { timestamps: true });


const Partner = mongoose.model('Partner', partnerSchema);
module.exports = Partner;
