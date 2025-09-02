const express = require('express');
const router = express.Router({ mergeParams: true });

const userController = require('../controllers/userController');
const authController = require('../controllers/authController');
const addressController = require('../controllers/addressController');
const houseRouter = require('./houseRoutes');

// ✅ Username check and update (define only once!)
router.get('/check-username', userController.checkUsernameExists);
router.patch('/update-username', authController.protect, userController.updateUsername);

// ✅ Auth routes
router.post('/signup', authController.signup);
router.post('/login', authController.login);
router.post('/logout', authController.logout);
router.post('/forgotPassword', authController.forgotPassword);
router.post('/request-otp', authController.requestOTP);
router.post('/verify-otp', authController.verifyOTP);
router.post('/store-password', authController.storeUserPassword);

// ✅ User routes
router
  .route('/')
  .get(userController.getAllUsers)
  .post(userController.createUser);

// ✅ Profile routes
router.get('/getMe', userController.setUserId, userController.getMe());
router.patch('/updateMe', userController.updateMe);
router.patch('/updatePassword', authController.updatePassword);
router.patch('/updateUserProfile', authController.updateUserProfile);
router.delete('/deleteMe', userController.deleteMe);

router.route('/:id').get(userController.getUser);

// ✅ Houses for owner
router.route('/me/houses').get(authController.restrictTo('owner'), houseRouter);

// ✅ Address routes
router
  .route('/:houseId/address')
  .get(userController.getUserAddress, addressController.getAddress)
  .post(addressController.createAddress, userController.saveUserAddress)
  .patch(userController.getUserAddress, addressController.updateAddress)
  .delete(userController.getUserAddress, addressController.deleteAddress);

module.exports = router;
