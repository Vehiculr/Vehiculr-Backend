const postReview = require('../models/postReview');
const factory = require('./handlerFactory');
const catchAsync = require('../utils/catchAsync');

exports.filterReviews = catchAsync(async (req, res, next) => {
  if (req.params.houseId) {
    req.docFilter = { house: req.params.houseId };
  } else {
    req.docFilter = { user: req.user.id };
  }
  next();
});

// Nested review routes
exports.setHouseUserIds = (req, res, next) => {
  //set house id from query if not specified in body
  if (!req.body.house) req.body.house = req.params.houseId;
  if (!req.body.user) req.body.user = req.user.id; //from Protect middleware
  next();
};

exports.getUserPostReviews = factory.getAll(postReview);
exports.getPostReview = factory.getOne(postReview, { path: 'user' });
exports.createPostReview = factory.createOne(postReview);
exports.updatePostReview = factory.updateOne(postReview);
exports.deletePostReview = factory.deleteOne(postReview);
