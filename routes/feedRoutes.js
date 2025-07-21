const express = require('express');
const feedController = require('../controllers/feedController');
const authController = require('../controllers/authController');

const router = express.Router({ mergeParams: true });


// router.use(authController.protect);
router
  .route('/')
  //   .get(feedController.filterfeeds, feedController.setHouseUserIds, feedController.getUserfeed)
  .get(feedController.getFeeds)
  .post(feedController.createFeed)
//   router.use(authController.restrictTo('user', 'admin', 'owner'));
//   router.use(feedController.filterfeeds);

router
  .route('/:id')
  .get(feedController.getOneFeed)
  .patch(feedController.updateFeed)
  .delete(feedController.deleteFeed)
  
module.exports = router;
