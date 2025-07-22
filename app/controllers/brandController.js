const Brand = require('../models/brandModel');
const factory = require('./handlerFactory');
const catchAsync = require('../utils/catchAsync');

exports.filterBrands = catchAsync(async (req, res, next) => {
  if (req.params.houseId) {
    req.docFilter = { house: req.params.houseId };
  } else {
    req.docFilter = { user: req.user.id };
  }
  next();
});

// Nested Brand
exports.setHouseUserIds = (req, res, next) => {
  //set house id from query if not specified in body
  if (!req.body.house) req.body.house = req.params.houseId;
  if (!req.body.user) req.body.user = req.user.id; //from Protect middleware
  next();
};

exports.getUserBrand = factory.getAll(Brand);
exports.getBrand = factory.getOne(Brand, { path: 'user' });
exports.createBrand = factory.createOne(Brand);
exports.updateBrand = factory.updateOne(Brand);
exports.deleteBrand = factory.deleteOne(Brand);
