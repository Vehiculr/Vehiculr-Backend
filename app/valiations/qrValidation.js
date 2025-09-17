const { body, param, query } = require('express-validator');

const validateScanQR = [
  body('qrData')
    .notEmpty()
    .withMessage('QR code data is required')
    .isJWT()
    .withMessage('Invalid QR code format')
];

const validateVerifyQR = [
  body('qrData')
    .notEmpty()
    .withMessage('QR code data is required')
    .isJWT()
    .withMessage('Invalid QR code format')
];

const validateGarageId = [
  param('garageId')
    .notEmpty()
    .withMessage('Garage ID is required')
    .matches(/^GAR[A-Z0-9]+$/)
    .withMessage('Invalid Garage ID format')
];

const validateGenerateQR = [
  body('format')
    .optional()
    .isIn(['png', 'svg', 'jpeg', 'webp'])
    .withMessage('Invalid format. Must be png, svg, jpeg, or webp'),
  body('size')
    .optional()
    .isInt({ min: 100, max: 1000 })
    .withMessage('Size must be between 100 and 1000 pixels'),
  body('color')
    .optional()
    .isHexColor()
    .withMessage('Invalid color format. Use hex format (#RRGGBB)')
];

const validateDownloadQR = [
  query('format')
    .optional()
    .isIn(['png', 'svg', 'jpeg', 'webp'])
    .withMessage('Invalid format. Must be png, svg, jpeg, or webp'),
  query('size')
    .optional()
    .isInt({ min: 100, max: 1000 })
    .withMessage('Size must be between 100 and 1000 pixels')
];

const validatePrintQR = [
  query('format')
    .optional()
    .isIn(['svg', 'png'])
    .withMessage('Invalid format for printing. Must be svg or png'),
  query('size')
    .optional()
    .isInt({ min: 300, max: 1200 })
    .withMessage('Print size must be between 300 and 1200 pixels')
];

const validateShareQR = [
  body('email')
    .optional()
    .isEmail()
    .withMessage('Invalid email address'),
  body('phoneNumber')
    .optional()
    .isMobilePhone('any')
    .withMessage('Invalid phone number'),
  body('message')
    .optional()
    .isLength({ max: 500 })
    .withMessage('Message must be less than 500 characters')
];

const validatePartnerId = [
  param('partnerId')
    .notEmpty()
    .withMessage('Partner ID is required')
    .isMongoId()
    .withMessage('Invalid Partner ID format')
];

const validateExportQR = [
  query('format')
    .optional()
    .isIn(['json', 'csv', 'excel'])
    .withMessage('Invalid export format. Must be json, csv, or excel'),
  query('startDate')
    .optional()
    .isISO8601()
    .withMessage('Invalid start date format'),
  query('endDate')
    .optional()
    .isISO8601()
    .withMessage('Invalid end date format')
];

module.exports = {
  validateScanQR,
  validateVerifyQR,
  validateGarageId,
  validateGenerateQR,
  validateDownloadQR,
  validatePrintQR,
  validateShareQR,
  validatePartnerId,
  validateExportQR
};