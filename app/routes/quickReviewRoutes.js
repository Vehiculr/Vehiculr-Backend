const express = require("express");
const router = express.Router();
const reviewController = require("../controllers/quickReviewController");

// Add a new quick review
router.post("/addQuickReview", reviewController.addReview);

router.get("/getAllQuickReview", reviewController.getAllReviews);

router.get("/:garageId", reviewController.getReviewsByGarage);

module.exports = router;
