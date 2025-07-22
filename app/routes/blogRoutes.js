const express = require('express');
const blogController = require('../controllers/blogController');
const authController = require('../controllers/authController');

const router = express.Router({ mergeParams: true });


// router.use(authController.protect);
router
  .route('/')
//   .get(blogController.filterBlogs, blogController.setHouseUserIds, blogController.getUserBlog)
  .get(blogController.getUserBlog)
  .post(blogController.createBlog);

//   router.use(authController.restrictTo('user', 'admin', 'owner'));
//   router.use(blogController.filterBlogs);
  router
  .route('/:id')
  .get(blogController.getBlog)
  .patch(blogController.updateBlog)
  .delete(blogController.deleteBlog);

module.exports = router;
