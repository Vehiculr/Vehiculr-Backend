const { body } = require('express-validator');

const validateVehicleData = [
  body('rides')
    .optional()
    .isArray()
    .withMessage('Rides must be an array'),
  
  body('rides.*.name')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Ride name is required')
    .isLength({ max: 50 })
    .withMessage('Ride name must be less than 50 characters'),
  
  body('rides.*.brand')
    .optional()
    .trim()
    .isLength({ max: 30 })
    .withMessage('Brand must be less than 30 characters'),
  
  body('rides.*.model')
    .optional()
    .trim()
    .isLength({ max: 30 })
    .withMessage('Model must be less than 30 characters'),
  
  body('drives')
    .optional()
    .isArray()
    .withMessage('Drives must be an array'),
  
  body('drives.*.name')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Drive name is required')
    .isLength({ max: 50 })
    .withMessage('Drive name must be less than 50 characters'),
  
  body('drives.*.brand')
    .optional()
    .trim()
    .isLength({ max: 30 })
    .withMessage('Brand must be less than 30 characters'),
  
  body('drives.*.model')
    .optional()
    .trim()
    .isLength({ max: 30 })
    .withMessage('Model must be less than 30 characters'),
  
  body().custom((value, { req }) => {
    if (!value.rides && !value.drives) {
      throw new Error('At least one ride or drive data is required');
    }
    return true;
  })
];

module.exports = {
  validateVehicleData
};