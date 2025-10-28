const mongoose = require("mongoose");

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
    vehicle: {
      type: String,
      required: true,
      trim: true,
    },
    photo: {
      type: String, // optional image URL or file path
      default: null,
    },
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

module.exports = mongoose.model("quickReview", reviewSchema);
