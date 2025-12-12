// app.js
"use strict";

const express = require("express");
require("express-async-errors");
const compression = require("compression");
const cookieParser = require("cookie-parser");
const responseTime = require("response-time");
const helmet = require("helmet");
const YAML = require("yamljs");
const swaggerUi = require("swagger-ui-express");

const { getLogger } = require("./app/utils/logger");
const logger = getLogger("APP");

// Load centralized config
const { corsOptions, configureCors } = require("./app/config/cors");

const {
  loadEnv
} = require("./app/config/env");

const securityMiddleware = require("./app/middleware/security").securityMiddleware;


// Routers
const houseRouter = require("./app/routes/houseRoutes");
const userRouter = require("./app/routes/userRoutes");
const reviewRouter = require("./app/routes/reviewRoutes");
const bookingRouter = require("./app/routes/bookingRoutes");
const blogRouter = require("./app/routes/blogRoutes");
const postReviewRouter = require("./app/routes/postReviewRoutes");
const brandRouter = require("./app/routes/brandRoutes");
const cityRouter = require("./app/routes/locationRoutes");
const feedRouter = require("./app/routes/feedRoutes");
const partnerRouter = require("./app/routes/partnerRoutes");
const otpRouter = require("./app/routes/otpRoutes");
const authRouter = require("./app/routes/authRoutes");
const quickReviewRouter = require("./app/routes/quickReviewRoutes");
const leadsRouter = require("./app/routes/leadRoutes");
const addharKycRouter = require("./app/routes/kycRoutes");
const swaggerRouter = require('./app/swagger/swaggerRoutes');
const swaggerDocument = require("./swagger.json");

const AppError = require("./app/utils/appError");
const globalErrorHandler = require("./app/controllers/errorController");

// --------------------------------------------------------------
// 🔹 Express App
// --------------------------------------------------------------
const app = express();

app.set("trust proxy", 1);

// ---- Swagger Docs ----
const setupSwagger = require("./app/config/swagger");
setupSwagger(app);

app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerDocument));
// --------------------------------------------------------------
// 🔹 Security Headers via Helmet
// --------------------------------------------------------------
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
  })
);

// --------------------------------------------------------------
// 🔹 CORS (from config/cors.js)
// --------------------------------------------------------------
app.use(configureCors);

// OPTIONS support
app.options("*", configureCors);

// --------------------------------------------------------------
// 🔹 Rate limiter (from config/rateLimit.js)
// --------------------------------------------------------------
const apiLimiter = require("./app/config/rateLimit");
const API_PREFIX = process.env.API_PREFIX || "/api";
app.use(API_PREFIX, apiLimiter);

// --------------------------------------------------------------
// 🔹 Additional security middleware (NoSQL injection, HPP, XSS)
// --------------------------------------------------------------
securityMiddleware(app);

// --------------------------------------------------------------
// 🔹 Parsers
// --------------------------------------------------------------
app.use(express.json({ limit: "10kb" }));
app.use(express.urlencoded({ extended: true, limit: "10kb" }));
app.use(cookieParser());
app.use(compression());
app.use(responseTime());

// --------------------------------------------------------------
// 🔹 Request Logging
// --------------------------------------------------------------
app.use((req, res, next) => {
  req.requestTime = new Date().toISOString();
  logger.info(`${req.method} ${req.originalUrl} - ${req.ip}`);
  next();
});

// --------------------------------------------------------------
// 🔹 Routes
// --------------------------------------------------------------
app.use(`${API_PREFIX}/users`, userRouter);
app.use(`${API_PREFIX}/houses`, houseRouter);
app.use(`${API_PREFIX}/reviews`, reviewRouter);
app.use(`${API_PREFIX}/booking`, bookingRouter);
app.use(`${API_PREFIX}/blogs`, blogRouter);
app.use(`${API_PREFIX}/brands`, brandRouter);
app.use(`${API_PREFIX}/postReview`, postReviewRouter);
app.use(`${API_PREFIX}/city`, cityRouter);
app.use(`${API_PREFIX}/feed`, feedRouter);
app.use(`${API_PREFIX}/partners`, partnerRouter);
app.use(`${API_PREFIX}/otps`, otpRouter);
app.use(`${API_PREFIX}/auth`, authRouter);
app.use(`${API_PREFIX}/quickReviews`, quickReviewRouter);
app.use(`${API_PREFIX}/leads`, leadsRouter);
app.use(`${API_PREFIX}/kyc`, addharKycRouter);
app.use(`${API_PREFIX}/docs`, swaggerRouter);

// Health Check
app.get(`${API_PREFIX}/health`, (req, res) =>
  res.status(200).json({
    status: "success",
    message: "Server is healthy 🚀",
    time: new Date().toISOString(),
  })
);

// --------------------------------------------------------------
// 🔹 404 Handler
// --------------------------------------------------------------
app.all("*", (req, res, next) => {
  next(new AppError(`Cannot find ${req.originalUrl}`, 404));
});

// --------------------------------------------------------------
// 🔹 Global Error Handler
// --------------------------------------------------------------
app.use(globalErrorHandler);

module.exports = app;
