const rateLimit = require("express-rate-limit");

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 min
  max: 100, // 100 requests per 15 min
  message: { success: false, message: "Too many requests, please try again later." },
});

module.exports = limiter;
