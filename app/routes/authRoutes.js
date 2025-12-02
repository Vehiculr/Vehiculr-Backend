const express = require('express');
const router = express.Router({ mergeParams: true });

const userController = require('../controllers/userController');
const authController = require('../controllers/authController');
const partnerController = require('../controllers/partnerController'); 
const multer = require('multer');



// ✅ Auth routes
router.post('/login/email', authController.loginWithEmail);
router.post('/login/request-otp', authController.loginRequestOTP);
router.post('/login/verify-otp', authController.loginVerifyOTP);

router.post('/login', authController.login);            // unified
router.post('/auth/google', authController.googleLogin); // optional direct
router.post('/refresh', authController.refresh);
router.post('/logout', authController.logout);
router.post('/verify-quote-login', authController.verifyQuoteOTPForLogin); // optional direct

module.exports = router;