// app/models/Transaction.js
const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
  transactionId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  partnerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Partner',
    required: false
  },
  aadhaarNumber: {
    type: String,
    required: true
  },
  maskedAadhaar: String,
  status: {
    type: String,
    enum: ['OTP_SENT', 'VERIFIED', 'FAILED', 'EXPIRED'],
    default: 'OTP_SENT'
  },
  otpSentAt: {
    type: Date,
    default: Date.now
  },
  verifiedAt: Date,
  failedAt: Date,
  digioReferenceId: String,
  errorDetails: {
    code: String,
    message: String
  },
  createdAt: {
    type: Date,
    default: Date.now,
    expires: 7 * 24 * 60 * 60 // Auto-delete after 7 days (in seconds)
  }
}, { timestamps: true });

module.exports = mongoose.model('Transaction', transactionSchema);