const express = require('express');
const router = express.Router({ mergeParams: true }); // ✅ define router first
const userController = require('../controllers/userController');
const authController = require('../controllers/authController');
const addressController = require('../controllers/addressController');
const houseRouter = require('./houseRoutes');
const { checkUsernameExists, updateUsername } = require('../controllers/userController');
const { protect, restrictTo } = require('../controllers/authController'); // ✅ define protect
const multer = require('multer');
const upload = multer({ dest: 'uploads/' }); 

// ✅ Username check and update
router.get('/check-username', checkUsernameExists);
router.patch('/update-username', protect, updateUsername);

// ✅ Auth routes
router.post('/signup', authController.signup);
router.post('/login', authController.login);
router.post('/logout', authController.logout);
router.post('/forgotPassword', authController.forgotPassword);
router.post("/request-otp", authController.requestOTP);
router.post("/verify-otp", authController.verifyOTP);
router.post('/store-password', authController.storeUserPassword);
router.post("/request-otp", authController.requestOTP);
router.post("/verify-otp", authController.verifyOTP);


// ✅ User routes
router
  .route('/')
  .get(userController.getAllUsers)
  .post(userController.createUser);

// ✅ Profile routes
router.get('/getMe', userController.setUserId, userController.getMe());
router.patch('/updateMe', userController.updateMe);
router.patch('/updatePassword', authController.updatePassword);
router.patch('/updateProfilePhoto', upload.single('file'), userController.updateProfilePhoto);
router.patch('/updateUserProfile', authController.updateUserProfile);
router.delete('/deleteMe', userController.deleteMe);


router.route('/:id').get(userController.getUser);

// topics for user
router
  .route('/userTopics')
  .get(userController.getAllTopics)
  .post(userController.createTopic)


router.route('/me/houses').get(restrictTo('owner'), houseRouter);


router
  .route('/:houseId/address')
  .get(userController.getUserAddress, addressController.getAddress)
  .post(addressController.createAddress, userController.saveUserAddress)
  .patch(userController.getUserAddress, addressController.updateAddress)
  .delete(userController.getUserAddress, addressController.deleteAddress);

module.exports = router;
