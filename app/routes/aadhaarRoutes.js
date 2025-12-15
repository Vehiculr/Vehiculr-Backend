const express = require('express');
const router = express.Router();
const aadhaarController = require('../controllers/aadhaarController');
const validate = require('../middleware/validate');

// Validation middleware
// const validateOTPRequest = validate({
//   aadhaar_number: { type: 'string', pattern: /^\d{12}$/, required: true },
//   mobile: { type: 'string', pattern: /^\d{10}$/, required: false },
//   email: { type: 'string', format: 'email', required: false },
//   user_id: { type: 'string', required: false }
// });

// const validateVerifyRequest = validate({
//   transaction_id: { type: 'string', required: true },
//   otp: { type: 'string', pattern: /^\d{6}$/, required: true }
// });

const validateAadhaarOTP = (req, res, next) => {
    const { aadhaar_number, mobile, email, user_id } = req.body;
    const errors = [];

    // Validate aadhaar_number
    if (!aadhaar_number) {
        errors.push({
            field: 'aadhaar_number',
            message: 'Aadhaar number is required'
        });
    } else if (!/^\d{12}$/.test(aadhaar_number)) {
        errors.push({
            field: 'aadhaar_number',
            message: 'Aadhaar number must be 12 digits'
        });
    }

    // Validate mobile (optional)
    if (mobile && !/^\d{10}$/.test(mobile)) {
        errors.push({
            field: 'mobile',
            message: 'Mobile number must be 10 digits'
        });
    }

    // Validate email (optional)
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        errors.push({
            field: 'email',
            message: 'Please provide a valid email address'
        });
    }

    // Validate user_id (optional)
    if (user_id && (user_id.length < 3 || user_id.length > 50)) {
        errors.push({
            field: 'user_id',
            message: 'User ID must be between 3 and 50 characters'
        });
    }

    if (errors.length > 0) {
        return res.status(400).json({
            success: false,
            message: 'Validation failed',
            errors: errors
        });
    }
    next();
};

const validateVerifyOTP = (req, res, next) => {
    const { transaction_id, otp } = req.body;
    const errors = [];

    // Validate transaction_id
    if (!transaction_id) {
        errors.push({
            field: 'transaction_id',
            message: 'Transaction ID is required'
        });
    } else if (transaction_id.length < 10 || transaction_id.length > 100) {
        errors.push({
            field: 'transaction_id',
            message: 'Invalid transaction ID format'
        });
    }

    // Validate OTP
    if (!otp) {
        errors.push({
            field: 'otp',
            message: 'OTP is required'
        });
    } else if (!/^\d{6}$/.test(otp)) {
        errors.push({
            field: 'otp',
            message: 'OTP must be 6 digits'
        });
    }

    if (errors.length > 0) {
        return res.status(400).json({
            success: false,
            message: 'Validation failed',
            errors: errors
        });
    }

    next();
};

const validateTransactionId = (req, res, next) => {
    const { transaction_id } = req.params;

    if (!transaction_id || transaction_id.length < 10 || transaction_id.length > 100) {
        return res.status(400).json({
            success: false,
            message: 'Invalid transaction ID',
            error: 'Transaction ID must be 10-100 characters'
        });
    }

    next();
};

// Routes
router.post('/aadhaar/generate-otp', validateAadhaarOTP, aadhaarController.generateOTP);
router.post('/aadhaar/verify-otp', validateVerifyOTP, aadhaarController.verifyOTP);
router.get('/aadhaar/status/:transaction_id', validateTransactionId, aadhaarController.checkStatus);

// Webhook endpoint (for Digio callbacks)
router.post('/aadhaar/webhook', express.raw({ type: 'application/json' }), (req, res) => {
    const signature = req.headers['x-digio-signature'];
    const payload = req.body;

    // Verify webhook signature
    if (this.verifyWebhook(signature, payload)) {
        AA
        // Process webhook
        switch (payload.event) {
            case 'kyc.completed':
                // Update your database
                break;
            case 'kyc.failed':
                // Handle failure
                break;
        }
        res.status(200).send('OK');
    } else {
        res.status(401).send('Invalid signature');
    }
});

module.exports = router;