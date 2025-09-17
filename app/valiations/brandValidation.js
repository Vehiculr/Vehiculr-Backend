const { body } = require('express-validator');

const carBrands = ['Audi', 'BMW', 'Chevrolet', 'Ford', 'Hyundai', 'Honda', 'Jeep', 'Kia', 
                  'Mahindra', 'Morris Garages', 'Nissan', 'Renault', 'Skoda', 'Suzuki', 
                  'Tata Motors', 'Toyota'];

const bikeBrands = ['Aprilia', 'Hero', 'Bajaj', 'Hero Motocorp', 'TVS', 'Honda', 'Yamaha', 
                   'Kawasaki', 'Ducati', 'Benelli', 'BMW'];

const validateBrandSelection = [
  body('carBrands')
    .optional()
    .isArray()
    .withMessage('Car brands must be an array')
    .custom((value) => {
      if (value && value.some(brand => !carBrands.includes(brand))) {
        throw new Error('Invalid car brand selected');
      }
      return true;
    }),
  
  body('bikeBrands')
    .optional()
    .isArray()
    .withMessage('Bike brands must be an array')
    .custom((value) => {
      if (value && value.some(brand => !bikeBrands.includes(brand))) {
        throw new Error('Invalid bike brand selected');
      }
      return true;
    }),
  
  body().custom((value, { req }) => {
    if (!value.carBrands && !value.bikeBrands) {
      throw new Error('At least one brand selection is required');
    }
    return true;
  })
];

module.exports = {
  validateBrandSelection,
  carBrands,
  bikeBrands
};