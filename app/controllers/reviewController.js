const Review = require("../models/reviewModel");
const QuickReview = require("../models/quickReviewModel");
const Partner = require("../models/partnerModel");
const { uploadToCloudinary, uploadMultipleToCloudinary } = require('../utils/cloudinaryConfig');
const cloudinary = require("cloudinary").v2;
const { uploadMultipleToS3, getSignedS3Url } = require('../utils/aws-S3-Config');

const { ObjectId } = require("mongoose").Types;

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
      reviewType: "normalReview"
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
// exports.getAllReviews = async (req, res) => {
//   try {
//     const reviews = await Review.find().sort({ createdAt: -1 });
//     res.status(200).json({ success: true, data: reviews });
//   } catch (error) {
//     res.status(500).json({
//       success: false,
//       message: "Failed to fetch reviews.",
//       error: error.message,
//     });
//   }
// };

// Get Reviews by Garage ID
exports.getReviewsByGarage = async (req, res) => {
  try {
    const { garageId } = req.params;

    const partner = await Review.find({ garageId });

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

exports.getAllReviews = async (req, res) => {
  try {
    const { garageId } = req.params;
    const { page = 1, limit = 10, sort = "latest" } = req.query;

    const skip = (page - 1) * limit;
    const sortOrder = sort === "oldest" ? 1 : -1;

    const stringGarageId = String(garageId);

    const pipeline = [
      // ===== NORMAL REVIEWS =====
      {
        $addFields: {
          garageIdString: { $toString: "$garageId" }
        }
      },
      {
        $match: { garageIdString: stringGarageId }
      },
      {
        $addFields: { reviewSource: "normal" }
      },

      // ===== UNION WITH QUICK REVIEWS =====
      {
        $unionWith: {
          coll: "quickreviews",
          pipeline: [
            {
              $addFields: {
                garageIdString: { $toString: "$garageId" }
              }
            },
            {
              $match: { garageIdString: stringGarageId }
            },
            {
              $addFields: { reviewSource: "quick" }
            }
          ]
        }
      },

      // ===== SORT + PAGINATION =====
      { $sort: { createdAt: sortOrder } },
      { $skip: skip },
      { $limit: parseInt(limit) }
    ];

    const reviews = await Review.aggregate(pipeline);

    // TOTAL COUNT
    const countPipeline = [
      {
        $addFields: {
          garageIdString: { $toString: "$garageId" }
        }
      },
      { $match: { garageIdString: stringGarageId } },
      {
        $unionWith: {
          coll: "quickreviews",
          pipeline: [
            {
              $addFields: {
                garageIdString: { $toString: "$garageId" }
              }
            },
            { $match: { garageIdString: stringGarageId } }
          ]
        }
      },
      { $count: "total" }
    ];

    const totalResult = await Review.aggregate(countPipeline);
    const total = totalResult?.[0]?.total || 0;

    res.status(200).json({
      success: true,
      message: "All reviews fetched successfully",
      total,
      page: Number(page),
      limit: Number(limit),
      reviews
    });

  } catch (error) {
    console.error("Error fetching reviews:", error);
    res.status(500).json({
      success: false,
      message: "Internal Server Error",
      error: error.message
    });
  }
};
