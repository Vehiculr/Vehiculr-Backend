const quickReview = require("../models/quickReviewModel");
const Partner = require("../models/partnerModel");
const { uploadToCloudinary, uploadMultipleToCloudinary } = require('../utils/cloudinaryConfig');
const cloudinary = require("cloudinary").v2;

// Add a Quick Review
exports.addQuickReview = async (req, res) => {
  try {
    const { garageId, garageName, vehicle, rating, description, tags } = req.body;
    // ✅ Basic Validation
    if (!garageId || !garageName || !vehicle || !rating) {
      return res.status(400).json({
        success: false,
        message: "Garage ID, Garage Name, Vehicle, and Rating are required.",
      });
    }

    // ✅ Photo Upload Handling (if images exist)
    let reviewPhotos = [];

    if (req.files && req.files.length > 0) {
      if (req.files.length > 4) {
        return res.status(400).json({
          success: false,
          message: "Maximum 4 images allowed for a quickReview.",
        });
      }

      const uploadResults = await uploadMultipleToCloudinary(req.files, {
        folder: 'quickReview-photos',
        transformation: [
          { width: 1200, height: 900, crop: "limit", quality: "auto" }
        ]
      });

      reviewPhotos = uploadResults.map(result => ({
        public_id: result.public_id,
        url: result.secure_url,
        width: result.width,
        height: result.height,
        bytes: result.bytes,
        created_at: result.created_at,
      }));
    }

    // ✅ Create Review Entry
    const newReview = new quickReview({
      garageId,
      garageName,
      vehicle,
      photos: reviewPhotos, // ✅ Saved Cloudinary Photos
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
exports.getAllQuickReviews = async (req, res) => {
  try {
    const reviews = await quickReview.find().sort({ createdAt: -1 });
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
exports.getQuickReviewsByGarage = async (req, res) => {
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

// update reviewer info
exports.updateReviewerInfo = async (req, res) => {
  try {
    const { reviewId } = req.params;
    const { reviewerName, reviewerPhone } = req.body;

    if (!reviewerName || !reviewerPhone) {
      return res.status(400).json({
        success: false,
        message: "Reviewer Name and Phone are required",
      });
    }

    const updatedReview = await quickReview.findByIdAndUpdate(
      reviewId,
      { reviewerName, reviewerPhone },
      { new: true }
    );

    if (!updatedReview) {
      return res.status(404).json({
        success: false,
        message: "Review not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Reviewer details updated successfully",
      data: updatedReview,
    });
  } catch (error) {
    console.error("Error updating reviewer info:", error);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
      error: error.message,
    });
  }
};
