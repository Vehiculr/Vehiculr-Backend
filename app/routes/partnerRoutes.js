/**
 * @swagger
 * /partners/nearby:
 *   get:
 *     summary: Get partners nearby
 *     parameters:
 *       - in: query
 *         name: latitude
 *         schema:
 *           type: number
 *       - in: query
 *         name: longitude
 *         schema:
 *           type: number
 *       - in: query
 *         name: maxDistance
 *         schema:
 *           type: number
 *     responses:
 *       200:
 *         description: A list of partners
 */
const express = require('express');
const router = express.Router();
const partnerController = require('../controllers/partnerController');
const authController = require('../controllers/authController');
const { protect, restrictTo } = authController;
const { otpLimiter } = require('../middleware/security');
const multer = require('multer');
const publicQrController = require('../controllers/publicQrController');
const { validateBrandSelection } = require('../valiations/brandValidation');
const { validateOTPRequest, validateOTPVerification } = require('../valiations/partnerValidation');
const { googleLogin } = require("../controllers/authController");
const { query } = require('joi');
const validate = require('../middleware/validate');


const nearbyQuerySchema = require('joi').object({
  latitude: require('joi').number().min(-90).max(90).optional(),
  longitude: require('joi').number().min(-180).max(180).optional(),
  maxDistance: require('joi').number().min(0).optional()
});
// Configure multer for file uploads
// / const storage = multer.diskStorage({
//   destination: function (req, file, cb) {
//     cb(null, 'uploads/')
//   },
//   filename: function (req, file, cb) {
//     // Create a unique filename with timestamp
//     const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
//     cb(null, file.fieldname + '-' + uniqueSuffix + '.' + file.originalname.split('.').pop())
//   }
// });

const storage = multer.memoryStorage({filename: function (req, file, cb) {
    // Create a unique filename with timestamp
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + '.' + file.originalname.split('.').pop())
  }});

const fileFilter = (req, file, cb) => {
  // Accept images only
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Only image files are allowed!'), false);
  }
};

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  },
  fileFilter: fileFilter
});


router.get('/count', partnerController.getPartnerCount);

// Routes

router.post('/', partnerController.createPartner);
router.get('/', partnerController.getAllPartners);

// ===== Public routes =====
router.get('/nearby', validate.query(nearbyQuerySchema), partnerController.findNearbyPartners);
router.get('/brandsAvailable', partnerController.getAvailableBrands);
router.get('/:garageId', partnerController.getPartnerById);
router.get('/profile/:garageId', publicQrController.getGaragePublicProfile);
router.get('/getAllPartners', partnerController.getAllPartnersByVehicleTypes);

// ===== Auth routes =====
router.post('/request-otp', otpLimiter, validateOTPRequest, authController.requestOTP);
router.post('/verify-otp', otpLimiter, validateOTPVerification, authController.verifyOTP);
router.post("/google", authController.googleLogin);
// router.post('/login', authController.loginWithEmailPassword);

// ===== Protected partner routes =====
router.get('/getMe', protect, partnerController.setUserId, partnerController.getMe());
router.get('/qr-code', protect, partnerController.getQRCode);
router.post('/generate-qr-code', protect, partnerController.generateQRCode);
router.patch('/partnerKYC', protect, partnerController.updateKYC);
router.patch('/updatePartnerProfile', protect, partnerController.updatePartnerProfile);
router.patch('/updatePartnerBrands', protect, validateBrandSelection, partnerController.updatePartnerBrands);
router.patch('/uploadShopPhotos', upload.array('photos', 4), protect, partnerController.uploadShopPhotos);
router.get('/check-limit', protect, restrictTo('partner'), partnerController.checkBrandLimit);
router.get('/my-brands', protect, restrictTo('partner'), partnerController.getPartnerBrands);

//Search Garages Api 
//GET /api/garages/search?query=wash&lat=12.97&lng=77.59&page=1&limit=10&vehicleType=Car&expertise=Engine
router.get('/search', protect, partnerController.searchGarages);



// ===== General routes =====
router.post('/', partnerController.createPartner);
router.get('/', partnerController.getAllPartners);

//===All Servises from Master===
router.get('/getAllServises', partnerController.getAllServices);
router.patch('/updatePartnerServices', protect, partnerController.updatePartnerServices);
router.get('/services/selected/:garageId', partnerController.getSelectedServices);
router.get('/services/unselected/:garageId', partnerController.getUnselectedServices);
router.get('/services/getAllPartnerServices/:garageId', partnerController.getAllPartnerServices);
// ===== Must always be LAST =====
router.get('/:id', partnerController.getPartnerById);


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
