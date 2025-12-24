const mongoose = require('mongoose');

const bikeSchema = new mongoose.Schema({
  make: {
    type: String,
    required: [true, 'Bike must have a make!'],
  },
  model: {
    type: String,
    required: [true, 'Bike must have a model!'],
  },
  year: {
    type: Number,
    required: [true, 'Bike must have a manufacturing year!'],
  },
  price: {
    type: Number,
    required: [true, 'Bike must have a price!'],
  },
  isAvailable: {
    type: Boolean,
    default: true,
  },
  garage: {
    type: mongoose.Schema.ObjectId,
    ref: 'Garage',
    required: [true, 'Bike must belong to a Garage!'],
  },
});

bikeSchema.pre(/^find/, function (next) {
  this.populate({
    path: 'garage',
    select: 'name address contactNumber',
  });
  next();
});

const Bike = mongoose.model('Bike', bikeSchema);

module.exports = Bike;

