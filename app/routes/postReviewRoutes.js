const express = require('express');
const postpostReviewController = require('../controllers/postReviewController');
const authController = require('../controllers/authController');

const router = express.Router({ mergeParams: true });

// router.use(authController.protect);
router
  .route('/')
  .get( postpostReviewController.getUserPostReviews)
  .post( postpostReviewController.createPostReview);

router.use(authController.restrictTo('user', 'admin', 'owner'));
router.use(postpostReviewController.filterReviews);
router
  .route('/:id')
  .get(postpostReviewController.getPostReview)
  .patch(postpostReviewController.updatePostReview)
  .delete(postpostReviewController.deletePostReview);

module.exports = router;
