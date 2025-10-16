const express = require('express');
const router = express.Router({ mergeParams: true });

const userController = require('../controllers/userController');
const authController = require('../controllers/authController');
const addressController = require('../controllers/addressController');
const partnerController = require('../controllers/partnerController'); // NEW: Partner controller
const houseRouter = require('./houseRoutes');
const { checkUsernameExists, updateUsername } = require('../controllers/userController');
const { protect, restrictTo } = require('../controllers/authController');
const multer = require('multer');


// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/')
  },
  filename: function (req, file, cb) {
    // Create a unique filename with timestamp
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + '.' + file.originalname.split('.').pop())
  }
});

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

// ✅ Username check and update
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
  router.get('/count', userController.getUserCount);//to get all user route

// ✅ Profile routes
router.route('/:id').get(userController.getUser);
router.get('/getMe', userController.setUserId, userController.getMe());
router.patch('/createPassword', authController.protect, userController.createPassword);
router.patch('/updatePassword', authController.protect, authController.updatePassword);
router.patch('/updateProfilePhoto', upload.single('file'), authController.protect, userController.updateProfilePhoto);
router.patch('/updateUserProfile', authController.protect, authController.updateUserProfile);
router.delete('/deleteMe', authController.protect, userController.deleteMe);
router.patch('/updateVehicles',authController.protect,userController.updateVehicles);




router
  .route('/userTopics')
  .get(userController.getAllTopics)
  .post(userController.createTopic)

// ✅ Address routes
router
  .route('/:houseId/address')
  .get(userController.getUserAddress, addressController.getAddress)
  .post(addressController.createAddress, userController.saveUserAddress)
  .patch(userController.getUserAddress, addressController.updateAddress)
  .delete(userController.getUserAddress, addressController.deleteAddress);
// ✅ Houses for owner
router.route('/me/houses').get(authController.restrictTo('owner'), houseRouter);

module.exports = router;