const { body } = require('express-validator');

const validateKYC = [
  body('fullName').notEmpty().withMessage('Full name is required'),
  body('documentType').isIn(['AADHAR', 'DRIVING_LICENSE', 'PASSPORT']).withMessage('Invalid document type'),
  body('documentNumber').isLength({ min: 10 }).withMessage('Invalid document number'),
  body('address').notEmpty().withMessage('Address is required')
];

module.exports = { validateKYC };