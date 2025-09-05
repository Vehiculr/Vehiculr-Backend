const { body, param, query } = require('express-validator');
const Partner = require('../models/partnerModel'); // You'll need to create this model

const validateKYC = [
  body('fullName')
    .notEmpty()
    .trim()
    .withMessage('Full name is required')
    .isLength({ min: 2, max: 50 })
    .withMessage('Full name must be between 2 and 50 characters'),
  
  body('documentType')
    .isIn(['AADHAR', 'DRIVING_LICENSE', 'PASSPORT'])
    .withMessage('Invalid document type'),
  
  body('documentNumber')
    .isLength({ min: 10, max: 20 })
    .withMessage('Document number must be between 10 and 20 characters')
    .matches(/^[a-zA-Z0-9\s-]+$/)
    .withMessage('Document number contains invalid characters'),
  
  body('address')
    .notEmpty()
    .trim()
    .withMessage('Address is required')
    .isLength({ min: 10, max: 200 })
    .withMessage('Address must be between 10 and 200 characters')
];

const validateBrands = [
  body('brandIds')
    .isArray({ min: 1, max: 3 })
    .withMessage('You must select between 1 and 3 brands')
    .custom((value) => {
      if (new Set(value).size !== value.length) {
        throw new Error('Duplicate brands are not allowed');
      }
      return true;
    })
];

const validateServices = [
  body('serviceIds')
    .isArray({ min: 1 })
    .withMessage('At least one service must be selected')
    .custom((value) => {
      if (new Set(value).size !== value.length) {
        throw new Error('Duplicate services are not allowed');
      }
      return true;
    })
];

const validateOTPRequest = [
  body('phoneNumber')
    .isMobilePhone('any')
    .withMessage('Valid phone number is required')
    .custom(async (value) => {
      // Check if partner already exists with this number
      const existingPartner = await Partner.findOne({ phoneNumber: value });
      if (existingPartner) {
        throw new Error('Phone number already registered');
      }
      return true;
    })
];

const validateOTPVerification = [
  body('phoneNumber')
    .isMobilePhone('any')
    .withMessage('Valid phone number is required'),
  
  body('otp')
    .isLength({ min: 4, max: 6 })
    .withMessage('OTP must be between 4 and 6 digits')
    .isNumeric()
    .withMessage('OTP must contain only numbers')
];

const validatePartnerProfile = [
  body('businessName')
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Business name must be between 2 and 100 characters'),
  
  body('shopLocation')
    .optional()
    .isObject()
    .withMessage('Shop location must be an object with coordinates'),
  
  body('businessDomain')
    .optional()
    .isIn(['CAR_REPAIR', 'BIKE_REPAIR', 'CAR_BIKE_SALES', 'MODIFICATION', 'OTHER'])
    .withMessage('Invalid business domain')
];

const validatePostCreation = [
  body('content')
    .notEmpty()
    .trim()
    .withMessage('Post content is required')
    .isLength({ min: 10, max: 500 })
    .withMessage('Post content must be between 10 and 500 characters'),
  
  body('tags')
    .optional()
    .isArray()
    .withMessage('Tags must be an array')
];

module.exports = {
  validateKYC,
  validateBrands,
  validateServices,
  validateOTPRequest,
  validateOTPVerification,
  validatePartnerProfile,
  validatePostCreation
};