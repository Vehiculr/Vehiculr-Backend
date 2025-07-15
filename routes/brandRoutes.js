const express = require('express');
const brandController = require('../controllers/brandController');
const authController = require('../controllers/authController');

const router = express.Router({ mergeParams: true });

// router.use(authController.protect);
router
  .route('/')
//   .get(brandController.filterBrands, brandController.setHouseUserIds, brandController.getUserBrand)
  .get(brandController.getUserBrand)
  .post(brandController.createBrand);

//   router.use(authController.restrictTo('user', 'admin', 'owner'));
//   router.use(brandController.filterBrands);
  router
  .route('/:id')
  .get(brandController.getBrand)
  .patch(brandController.updateBrand)
  .delete(brandController.deleteBrand);
  router
  .route('/:type')
  .get(brandController.getBrand);
module.exports = router;