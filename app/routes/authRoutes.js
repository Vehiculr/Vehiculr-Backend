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



module.exports = router;