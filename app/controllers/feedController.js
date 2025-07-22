const Feed = require('../models/feedModel');
const factory = require('./handlerFactory');
const catchAsync = require('../utils/catchAsync');

exports.filterFeeds = catchAsync(async (req, res, next) => {
  if (req.params.houseId) {
    req.docFilter = { house: req.params.houseId };
  } else {
    req.docFilter = { user: req.user.id };
  }
  next();
});

// Nested Feed
exports.setHouseUserIds = (req, res, next) => {
  //set house id from query if not specified in body
  if (!req.body.house) req.body.house = req.params.houseId;
  if (!req.body.user) req.body.user = req.user.id; //from Protect middleware
  next();
};

exports.getFeeds = factory.getAll(Feed);
exports.getOneFeed = factory.getOne(Feed, { path: 'user' });
exports.createFeed = factory.createOne(Feed);
exports.updateFeed = factory.updateOne(Feed);
exports.deleteFeed = factory.deleteOne(Feed);
