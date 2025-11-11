const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema(
  {
    garageId: {
      type: mongoose.Schema.Types.Mixed,
      ref: "Partner",
      required: true,
    },
    garageName: {
      type: String,
      required: true,
      trim: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    userName: {
      type: String,
      trim: true,
    },
    vehicleType: {
      type: String,
      required: true,
      trim: true,
    },
    photos: [
      {
        public_id: String,
        url: String,
        width: Number,
        height: Number,
        bytes: Number,
        created_at: String
      }
    ],
    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
    },
    description: {
      type: String,
      trim: true,
    },
    tags: [
      {
        type: String,
        trim: true,
      },
    ],
  },
  { timestamps: true }
);

reviewSchema.index({ location: '2dsphere' });

const Review = mongoose.model('Review', reviewSchema);
module.exports = Review;
