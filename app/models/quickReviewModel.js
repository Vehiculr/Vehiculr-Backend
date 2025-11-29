const mongoose = require("mongoose");

const quickReviewSchema = new mongoose.Schema(
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
    vehicle: {
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
    reviewType: {
      type: String,
      enum: ["quickReview ", "normalReview"],
      default: "quickReview",
      required: true
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
    reviewerPhone: {
      type: String,
      sparse: true,
      trim: true
    },
    reviewerName: {
      type: String,
      // required: [true, 'Please tell us your name!'],
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("quickReview", quickReviewSchema);
