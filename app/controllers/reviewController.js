const Review = require("../models/reviewModel");
const Partner = require("../models/partnerModel");
const { uploadToCloudinary, uploadMultipleToCloudinary } = require('../utils/cloudinaryConfig');
const cloudinary = require("cloudinary").v2;
const { uploadMultipleToS3, getSignedS3Url } = require('../utils/aws-S3-Config');

// Add a Quick Review
exports.addReview = async (req, res) => {
  try {
    const { garageId, garageName, vehicleType, rating, description, tags } = req.body;
    // ✅ Basic Validation
    if (!garageId || !garageName || !vehicleType || !rating) {
      return res.status(400).json({
        success: false,
        message: "Garage ID, Garage Name, Vehicle, and Rating are required.",
      });
    }

    // ✅ User details from token
    const userId = req.user.id;
    const userName = req.user.name || req.user.fullName || "User";

    // ✅ Photo Upload Handling (if images exist)
    let reviewPhotos = [];

    if (req.files && req.files.length > 0) {
      if (req.files.length > 4) {
        return res.status(400).json({
          success: false,
          message: "Maximum 4 images allowed for a review.",
        });
      }

      const uploadResults = await uploadMultipleToS3(
        req.files, {
        folder: 'review-photos'
      
      });

      reviewPhotos = uploadResults.map(result => ({
        url: result.url,
        key: result.key,
        bucket: result.bucket,
      }));
    }

    // ✅ Create Review Entry
    const newReview = new Review({
      garageId,
      garageName,
      userId,
      userName,
      vehicleType,
      photos: reviewPhotos, // ✅ Saved Photos s3
      rating,
      description,
      tags,
    });

    await newReview.save();

    res.status(201).json({
      success: true,
      message: "Review added successfully.",
      data: newReview,
    });

  } catch (error) {
    console.error("Error adding review:", error);
    res.status(500).json({
      success: false,
      message: "Internal Server Error.",
      error: error.message,
    });
  }
};

// Get All Reviews (Optional)
exports.getAllReviews = async (req, res) => {
  try {
    const reviews = await Review.find().sort({ createdAt: -1 });
    res.status(200).json({ success: true, data: reviews });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch reviews.",
      error: error.message,
    });
  }
};

// Get Reviews by Garage ID
exports.getReviewsByGarage = async (req, res) => {
  try {
    const { garageId } = req.params;

    const partner = await Partner.findOne({ garageId });

    if (!partner) {
      return res.status(404).json({
        success: false,
        message: `No partner found with garageId: ${garageId}`,
      });
    }

    return res.status(200).json({
      success: true,
      partner,
    });
  } catch (error) {
    console.error("Error fetching partner by garageId:", error);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error.",
      error: error.message,
    });
  }
};
