
'use strict';

const rateLimit = require('express-rate-limit');
const env = require('../config/env');

const isDev = process.env.NODE_ENV !== 'production';

// If local → return NO limiter
if (isDev) {
  console.log("⚠️ Rate limiter DISABLED in development");
  module.exports = (req, res, next) => next();
  return;
}

// If production → apply strict limits
const apiLimiter = rateLimit({
  windowMs: Number(env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, 
  max: Number(env.RATE_LIMIT_MAX) || 500,
  standardHeaders: true,
  legacyHeaders: false,
  message: 'Too many requests from this IP. Try again later.',
});

module.exports = { apiLimiter }