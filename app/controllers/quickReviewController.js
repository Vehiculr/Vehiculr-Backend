const Review = require("../models/quickReviewModel");
const Partner = require("../models/partnerModel");  

// Add a Quick Review
exports.addReview = async (req, res) => {
  try {
    const { garageId, garageName, vehicle, photo, rating, description, tags } = req.body;

    if (!garageId || !garageName || !vehicle || !rating) {
      return res.status(400).json({
        success: false,
        message: "Garage ID, Garage Name, Vehicle, and Rating are required.",
      });
    }

    const newReview = new Review({
      garageId,
      garageName,
      vehicle,
      photo,
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
