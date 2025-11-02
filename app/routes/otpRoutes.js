const express = require('express');
const router = express.Router({ mergeParams: true });

const userController = require('../controllers/userController');
const authController = require('../controllers/authController');
const addressController = require('../controllers/addressController');
const partnerController = require('../controllers/partnerController'); // NEW: Partner controller
const houseRouter = require('./houseRoutes');
const { checkUsernameExists, updateUsername } = require('../controllers/userController');
const { protect, restrictTo } = require('../controllers/authController');

// ✅ Auth routes
// router.post('/signup', authController.signup);
// router.post('/login', authController.login);
// router.post('/logout', authController.logout);
// router.post('/forgotPassword', authController.forgotPassword);
// router.post('/request-otp', authController.requestOTP);
// router.post('/verify-otp', authController.verifyOTP);
router.post('/request-email-otp', authController.requestEmailOTP);
router.post('/verify-email-otp', authController.verifyEmailOTP);
// router.post('/store-password', authController.storeUserPassword);


module.exports = router;