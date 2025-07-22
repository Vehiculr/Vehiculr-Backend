const City = require('../models/locationModel');
const factory = require('./handlerFactory');
const catchAsync = require('../utils/catchAsync');

exports.filterCitys = catchAsync(async (req, res, next) => {
  if (req.params.houseId) {
    req.docFilter = { house: req.params.houseId };
  } else {
    req.docFilter = { user: req.user.id };
  }
  next();
});

// Nested City
exports.setHouseUserIds = (req, res, next) => {
  //set house id from query if not specified in body
  if (!req.body.house) req.body.house = req.params.houseId;
  if (!req.body.user) req.body.user = req.user.id; //from Protect middleware
  next();
};

exports.getUserCity = factory.getAll(City);
exports.getCity = factory.getOne(City, { path: 'user' });
exports.createCity = factory.createOne(City);
exports.updateCity = factory.updateOne(City);
exports.deleteCity = factory.deleteOne(City);
exports.searchCity = factory.searchCity(City);
exports.popularCity = factory.popularCity(City);
exports.geocodeCity = factory.geocodeCity(City);
