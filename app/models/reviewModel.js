const mongoose = require('mongoose');
const House = require('./houseModel');

const reviewSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Review title can not be empty!'],
    },
    description: {
      liked: {
        type: String,
        minlength: [20, 'Possitive description must have atleast 20 characters'],
      },
      disliked: {
        type: String,
        minlength: [20, 'Negative description must have atleast 5 characters'],
      },
    },
    rating: {
      type: Number,
      min: 1,
      max: 5,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
    house: {
      type: mongoose.Schema.ObjectId,
      ref: 'House',
      required: [true, 'Review must belong to a house.'],
    },
    userId: {
      type: mongoose.Schema.ObjectId,
      ref: 'User',
      required: [true, 'Review must belong to a user'],
    },
    photo: { type: String }, // URL or path to image
    tags: [String], // e.g., #EngineRepair, #OilChange
    garageId: { type: mongoose.Schema.Types.ObjectId, ref: 'Garage' },
    location: {
      type: { type: String, default: 'Point' },
      coordinates: { type: [Number], required: true }, // [longitude, latitude]
    },
  },
  {
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
  { timestamps: true }
);

reviewSchema.index({ location: '2dsphere' });
// QUERY MIDDLEWARE
reviewSchema.pre(/^find/, function (next) {
  //child populate - house !required
  this.populate({
    path: 'user',
    select: 'name photo',
  });
  next();
});

const Review = mongoose.model('Review', reviewSchema);
module.exports = Review;
