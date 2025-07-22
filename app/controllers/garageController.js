const Garage = require('../models/garageModel');
const factory = require('./handlerFactory');
const catchAsync = require('../utils/catchAsync');

exports.filterGarages = catchAsync(async (req, res, next) => {
  if (req.params.houseId) {
    req.docFilter = { house: req.params.houseId };
  } else {
    req.docFilter = { user: req.user.id };
  }
  next();
});

// Nested Garage
exports.setHouseUserIds = (req, res, next) => {
  //set house id from query if not specified in body
  if (!req.body.house) req.body.house = req.params.houseId;
  if (!req.body.user) req.body.user = req.user.id; //from Protect middleware
  next();
};

exports.getUserGarage = factory.getAll(Garage);
exports.getGarage = factory.getOne(Garage);
exports.createGarage = factory.createOne(Garage);
exports.updateGarage = factory.updateOne(Garage);
exports.deleteGarage = factory.deleteOne(Garage);
