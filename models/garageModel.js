const mongoose = require('mongoose');

const garageSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [false, 'Garage must have a name!'],
  },
  address: {
    type: String,
    required: [false, 'Garage must have an address!'],
  },
  photos: {
    type: [String],
    max: 4
  }, // Store URLs or file paths
  vehicleTypes: {
    type: [String],
    enum: ["Car", "Bike"],
    required: true
  },
  description: {
    type: String,
    required: false
  },
  services: [{ name: String, price: Number }],
  verified: { type: Boolean },
  location: {
    type: {
      type: String,
      default: 'Point',
    },
    coordinates: {
      type: [Number],
      required: [false, 'Garage must have coordinates!'], // [longitude, latitude]
    },
  },
  contact: {
    type: String,
    required: [false, 'Garage must have a contact number!'],
  },
  reviews: [
    {
      user: {
        type: mongoose.Schema.ObjectId,
        ref: 'User',
        required: [false, 'Review must belong to a User!'],
      },
      rating: {
        type: Number,
        min: 1,
        max: 5,
        required: [false, 'Review must have a rating!'],
      },
      comment: String,   // This allows a string to be added as a comment.
      date: {
        type: Date,
        default: Date.now,
      },
    },
  ],
});

garageSchema.pre(/^find/, function (next) {
  this.populate({
    path: 'reviews.user',
    select: 'name photo email',
  });
  next();
});

const Garage = mongoose.model('Garage', garageSchema);

module.exports = Garage;