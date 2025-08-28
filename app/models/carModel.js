const mongoose = require('mongoose');

const carSchema = new mongoose.Schema({
  make: {
    type: String,
    required: [true, 'Car must have a make!'],
  },
  model: {
    type: String,
    required: [true, 'Car must have a model!'],
  },
  year: {
    type: Number,
    required: [true, 'Car must have a manufacturing year!'],
  },
  price: {
    type: Number,
    required: [true, 'Car must have a price!'],
  },
  fuelType: String,
  location: String,
  image: String,
  mileage: Number, 
  isAvailable: {
    type: Boolean,
    default: true,
  },
  garage: {
    type: mongoose.Schema.ObjectId,
    ref: 'Garage',
    required: [true, 'Car must belong to a Garage!'],
  },
});

carSchema.pre(/^find/, function (next) {
  this.populate({
    path: 'garage',
    select: 'name address contactNumber',
  });
  next();
});

const Car = mongoose.model('Car', carSchema);

module.exports = Car;
