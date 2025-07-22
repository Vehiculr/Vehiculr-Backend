const express = require('express');
const cityController = require('../controllers/cityController');
const authController = require('../controllers/authController');

const router = express.Router({ mergeParams: true });


// router.use(authController.protect);
router
  .route('/')
  .get(cityController.getUserCity)
  .post(cityController.createCity);

  router
  .route('/:id')
  .get(cityController.getCity)
  .patch(cityController.updateCity)
  .delete(cityController.deleteCity);

// Define routes properly
router
  .route('/popular')
  .get(cityController.popularCity);

router
  .route('/search')
  .get(cityController.searchCity);

router
  .route('/geocode')
  .get(cityController.geocodeCity);
 

module.exports = router;
