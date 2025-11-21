const express = require('express');
const router = express.Router({ mergeParams: true });
const kycController = require('../controllers/kycController');
const authController = require('../controllers/authController');
const { protect, restrictTo } = authController;
const { otpLimiter, apiLimiter } = require('../middleware/security');
const multer = require('multer');
const upload = multer({ storage: multer.memoryStorage() });


router.use(apiLimiter);
router.post('/aadhaar/initiate', authController.protect, kycController.initiateAadhaarVerification);
router.post('/aadhaar/verify',  kycController.verifyAadhaarOtp);
router.post('/aadhaar/ocr',  upload.single('aadhaarImage'), kycController.ocrAadhaarAndMatch);


module.exports = router;