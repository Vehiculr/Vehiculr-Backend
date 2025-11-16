const express = require('express');
const leadController = require('../controllers/leadController');
const authController = require('../controllers/authController');
const multer = require('multer');
const { protect, restrictTo } = authController;
const router = express.Router({ mergeParams: true });

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
// ===== Debug Log =====
router.use((req, res, next) => {
    console.log('🧭 Partner Route Hit:', req.originalUrl);
    next();
});
// router.use(authController.protect);

// User sends quote
router.post("/createLead", upload.array('photos', 4), leadController.createLead);

// Partner gets all leads
router.get("/:garageId", leadController.getLeadsByPartner);

// Get single lead
router.get("/getLeadById/:leadId", leadController.getLeadById);

// Partner sends quote reply
router.patch("/:leadId/sendQuoteReply", leadController.sendQuoteReply);

// Update lead status
router.patch("/:leadId/status", leadController.updateLeadStatus);

router.post('/send-quote-otp', leadController.requestQuoteOTP); 
router.post('/verify-quote-otp', leadController.verifyQuoteOTP);

module.exports = router;
