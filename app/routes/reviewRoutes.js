const express = require('express');
const reviewController = require('../controllers/reviewController');
const authController = require('../controllers/authController');

const router = express.Router({ mergeParams: true });

// All routes below require authentication
router.use(authController.protect);

// GET all reviews & POST a new review
router
  .route('/')
  .get(
    reviewController.filterReviews,
    reviewController.setHouseUserIds,
    reviewController.getUserReviews
  )
  .post(
    authController.restrictTo('user', 'owner'),
    reviewController.setHouseUserIds,
    reviewController.createReview
  );

// The routes below require specific roles
router.use(authController.restrictTo('user', 'admin', 'owner'));
router.use(reviewController.filterReviews);

// GET single review, UPDATE, DELETE
router
  .route('/:id')
  .get(reviewController.getReview)
  .patch(reviewController.updateReview)
  .delete(reviewController.deleteReview);

module.exports = router;
