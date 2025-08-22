const Review = require('../models/reviewModel');
const factory = require('./handlerFactory');
const catchAsync = require('../utils/catchAsync');

// Middleware to filter reviews by house or user
exports.filterReviews = catchAsync(async (req, res, next) => {
  if (req.params.houseId) {
    req.docFilter = { house: req.params.houseId };
  } else {
    req.docFilter = { user: req.user.id };
  }
  next();
});

// Set house and user IDs in request body if missing
exports.setHouseUserIds = (req, res, next) => {
  if (!req.body.house) req.body.house = req.params.houseId;
  if (!req.body.user) req.body.user = req.user.id;
  next();
};

// Controller methods using handlerFactory
exports.getUserReviews = factory.getAll(Review);
exports.getReview = factory.getOne(Review, { path: 'user' });
exports.createReview = factory.createOne(Review);
exports.updateReview = factory.updateOne(Review);
exports.deleteReview = factory.deleteOne(Review);
