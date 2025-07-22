const Blog = require('../models/blogModel');
const factory = require('./handlerFactory');
const catchAsync = require('../utils/catchAsync');

exports.filterBlogs = catchAsync(async (req, res, next) => {
  if (req.params.houseId) {
    req.docFilter = { house: req.params.houseId };
  } else {
    req.docFilter = { user: req.user.id };
  }
  next();
});

// Nested Blog
exports.setHouseUserIds = (req, res, next) => {
  //set house id from query if not specified in body
  if (!req.body.house) req.body.house = req.params.houseId;
  if (!req.body.user) req.body.user = req.user.id; //from Protect middleware
  next();
};

exports.getUserBlog = factory.getAll(Blog);
exports.getBlog = factory.getOne(Blog, { path: 'user' });
exports.createBlog = factory.createOne(Blog);
exports.updateBlog = factory.updateOne(Blog);
exports.deleteBlog = factory.deleteOne(Blog);
