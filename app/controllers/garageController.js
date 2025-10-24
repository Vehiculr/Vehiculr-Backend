const Partner = require('../models/partnerModel');
const factory = require('./handlerFactory');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');
const APIFeatures = require('../utils/apiFeatures');
const { sendWhatsAppMessage } = require("../services/twilioClient"); // Import Twilio utility


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

exports.getUserGarage = factory.getAll(Partner);
exports.getGarage = factory.getOne(Partner);
exports.createGarage = factory.createOne(Partner);
exports.updateGarage = factory.updateOne(Partner);
exports.deleteGarage = factory.deleteOne(Partner);


  //Add a review:
  exports.createGarageReview = factory.addReview(Partner);
  exports.updateGarageReview = factory.updateReview(Partner);
  exports.deleteGarageReview = factory.deleteReview(Partner);