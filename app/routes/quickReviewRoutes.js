const express = require("express");
const router = express.Router();
const reviewController = require("../controllers/quickReviewController");
const authController = require('../controllers/authController');

// Add a new quick review
router.post("/addQuickReview", authController.protect, reviewController.addReview);

router.get("/getAllQuickReview", reviewController.getAllReviews);

router.get("/:garageId", reviewController.getReviewsByGarage);

module.exports = router;
