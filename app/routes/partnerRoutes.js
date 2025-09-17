const express = require('express');
const router = express.Router({ mergeParams: true });
const partnerController = require('../controllers/partnerController');
const authController = require('../controllers/authController');
const { validateKYC, validateBrands, validateServices, validateOTPRequest, validateOTPVerification } = require('../valiations/partnerValidation');
const { otpLimiter, apiLimiter } = require('../middleware/security');
const validation = require('../valiations/qrValidation');
const rateLimit = require('express-rate-limit');
const { protect, restrictTo } = authController;
const publicQrController = require('../controllers/publicQrController');




router.use(apiLimiter);

// Routes
router.post('/', partnerController.createPartner);
router.get('/', partnerController.getAllPartners);
router.get('/:id', partnerController.getPartnerById);
router.get('/qr-code', partnerController.getQRCode);
// New KYC verification route
router.patch('/partnerKYC', authController.protect, partnerController.updateKYC);
router.post('/generate-qr-code', authController.protect, partnerController.generateQRCode);


// Public routes (no authentication required)
router.get('/garage/:garageId', publicQrController.getGarageByPublicId);
router.get('/profile/:garageId', publicQrController.getGaragePublicProfile);

// ==================== PARTNER ONBOARDING ROUTES ====================

// ✅ Partner-specific auth
router.post('/request-otp', otpLimiter, validateOTPRequest, authController.requestOTP);
router.post('/verify-otp', otpLimiter, validateOTPVerification, authController.verifyOTP);

// QR Code generation route
// router.get('/qr-code',
//     authController.protect,
//     restrictTo('partner'),
//     validation.validateQRCodeRequest,
//     partnerController.getQRCode
// );

// router.post('/generate-qr-code',
//     authController.protect,
//     restrictTo('partner'),
//     validation.validateQRCodeRequest,
//     partnerController.getQRCode
// );

// // ✅ Partner profile management
// router.route('/partner/profile')
//   .get(authController.protect, restrictTo('partner'), partnerController.getPartnerProfile)
//   .patch(authController.protect, restrictTo('partner'), partnerController.updatePartnerProfile);

// // ✅ Domain selection
// router.route('/partner/domains')
//   .get(partnerController.getDomains)
//   .patch(authController.protect, restrictTo('partner'), partnerController.updateDomains);

// // ✅ Services management
// router.route('/partner/services')
//   .get(partnerController.getServicesCatalog)
//   .patch(authController.protect, restrictTo('partner'), partnerController.updatePartnerServices);

// // ✅ Brands management
// router.route('/partner/brands')
//   .get(partnerController.getBrandsCatalog)
//   .patch(authController.protect, validateBrands,restrictTo('partner'), partnerController.updatePartnerBrands);

// // ✅ KYC verification
// router.post('/partner/kyc', 
//   authController.protect, 
//   restrictTo('partner'), 
//  validateKYC, // Add validation middleware
//   upload.fields([
//     { name: 'documentFront', maxCount: 1 },
//     { name: 'documentBack', maxCount: 1 }
//   ]), 
//   partnerController.submitKYC
// );

// // ✅ Shop photos upload 
// router.post('/partner/shop-photos', 
//   authController.protect, 
//   restrictTo('partner'), 
//   upload.array('photos', 5), // Max 5 photos
//   partnerController.uploadShopPhotos
// );

// // ✅ WhatsApp integration
// router.post('/partner/whatsapp/send-otp', 
//   authController.protect, 
//   restrictTo('partner'), 
//   partnerController.sendWhatsAppOTP
// );

// router.post('/partner/whatsapp/verify', 
//   authController.protect, 
//   restrictTo('partner'), 
//   partnerController.verifyWhatsApp
// );

// // ✅ Premium membership
// router.route('/partner/premium')
//   .get(partnerController.getPremiumPlans)
//   .post(authController.protect, restrictTo('partner'), partnerController.subscribeToPremium);

// // ✅ QR code generation
// router.get('/partner/qr-code', 
//   authController.protect, 
//   restrictTo('partner'), 
//   partnerController.getQRCode
// );

// // ✅ Partner posts
// router.route('/partner/posts')
//   .get(authController.protect, restrictTo('partner'), partnerController.getPosts)
//   .post(
//     authController.protect, 
//     restrictTo('partner'), 
//     upload.single('image'), 
//     partnerController.createPost
//   );

// // ✅ Partner feed
// router.get('/partner/feed', 
//   authController.protect, 
//   restrictTo('partner'), 
//   partnerController.getPartnerFeed
// );


module.exports = router;
