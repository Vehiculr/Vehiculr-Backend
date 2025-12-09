// ./app/middleware/security.js
"use strict";

const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const mongoSanitize = require("express-mongo-sanitize");
const xss = require("xss-clean");
const hpp = require("hpp");
const cors = require("cors");

// ===================
// CORS CONFIG
// ===================
const allowedOrigins = [
  "http://localhost:3000",
  "http://127.0.0.1:3000",
  process.env.FRONTEND_URL,
  "http://localhost:9002",   
  "https://vehiculr.com",
  "http://13.27.251.120"
].filter(Boolean);

const corsOptions = {
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error("❌ CORS Blocked: " + origin));
    }
  },
  credentials: true,
  methods: "GET,POST,PUT,PATCH,DELETE",
  allowedHeaders: [
    "Content-Type",
    "Authorization",
    "x-api-key",
    "x-client-id"
  ]
};

// ===================
// RATE LIMITERS
// ===================

// 🔒 OTP brute force protection — HARD LIMIT
const otpLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, 
  max: 3,
  message: {
    success: false,
    error: "Too many OTP attempts. Please wait 15 minutes."
  },
  standardHeaders: true,
  legacyHeaders: false
});

// 🛡 Generic API protection
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200, 
  message: {
    success: false,
    error: "Too many requests. Try again later."
  },
  standardHeaders: true,
  legacyHeaders: false
});

// 📁 Upload protection — avoid storage abuse
const uploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 10,
  message: {
    success: false,
    error: "Upload limit exceeded. Try later."
  }
});

// ===================
// SECURITY MIDDLEWARE
// ===================

const securityMiddleware = (app) => {

  // 🛡 Secure HTTP headers
  app.use(
    helmet({
      contentSecurityPolicy: false, // You can enable CSP later if needed
      crossOriginEmbedderPolicy: false,
      crossOriginOpenerPolicy: { policy: "same-origin-allow-popups" },
      crossOriginResourcePolicy: { policy: "cross-origin" }
    })
  );

  // 🌍 CORS
  app.use(cors(corsOptions));
  app.options("*", cors(corsOptions));

  // 🧹 Prevent NoSQL injection: { "$gt": "" }
  app.use(mongoSanitize());

  // 🧼 Sanitize user input from malicious HTML/script tags
  app.use(xss());

  // 🚫 Avoid HTTP Param Pollution — whitelist allowed duplicate params
  app.use(
    hpp({
      whitelist: [
        "brand",
        "category",
        "tags",
        "vehicleTypes"
      ]
    })
  );

  // 🚦 GLOBAL API RATE LIMIT
  app.use("/api", apiLimiter);

  // Optional: Add per-route limiters in routes:
  // router.post("/send-otp", otpLimiter, controller.sendOtp);
};

// Export all
module.exports = {
  otpLimiter,
  apiLimiter,
  uploadLimiter,
  securityMiddleware
};
