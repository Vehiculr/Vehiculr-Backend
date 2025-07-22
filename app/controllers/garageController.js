const Garage = require('../models/garageModel');
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

exports.getUserGarage = factory.getAll(Garage);
exports.getGarage = factory.getOne(Garage);
exports.createGarage = factory.createOne(Garage);
exports.updateGarage = factory.updateOne(Garage);
exports.deleteGarage = factory.deleteOne(Garage);

exports.nearByGarage = factory.findGarages(Garage);

exports.notifyGarageOwner = catchAsync(async (req, res, next) => {
  // Get garage details using factory pattern
  const garage = await Garage.findById(req.params.id);
  if (!garage) return next(new AppError("Garage not found", 404));

  // Garage owner's WhatsApp number
  const ownerPhone = garage.contact; 
  if (!ownerPhone) return next(new AppError("Garage owner has no WhatsApp number", 400));

  // Send WhatsApp message
  const userName = garage.name; 
  const message1 = `${userName} \n\n*Garages of India* 🚗\n\n_Exciting Offers Await!_\n\n🛠️ Get your vehicle serviced now!\n📍 Available in 25+ cities\n\n👉 Visit: www.garagesofindia.com`
const enquiryMessage = 
`🚗 New Customer Enquiry via Vehiculrr!\n\n 
Hello ${userName},\n\n 
Great news! A customer has shown interest in your garage through Vehiculrr.\n\n 
📞 Customer Contact: ${ownerPhone}\n 
💬 They are looking to know more about your services.\n\n 
This enquiry was sent from your listing on Vehiculrr, where we connect vehicle owners with trusted garages like yours.\n\n
👉 Please reach out to the customer at the above number, or feel free to send them your service details and charges directly.\n\n
Let’s not keep your next customer waiting!\n 
— Team Vehiculrr`;
  // const message = `${userName} has searched your garage.`;
  await sendWhatsAppMessage(ownerPhone, enquiryMessage);

  res.status(200).json({
    status: "success",
    message: "WhatsApp message sent successfully.",
  });
});


  //Add a review:
  exports.createGarageReview = factory.addReview(Garage);
  exports.updateGarageReview = factory.updateReview(Garage);
  exports.deleteGarageReview = factory.deleteReview(Garage);