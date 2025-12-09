// server.js
"use strict";

require("dotenv").config();
require("express-async-errors");

const http = require("http");
const { connectDB, disconnectDB } = require("./app/config/db");

const { getLogger } = require("./app/utils/logger");

const logger = getLogger("SERVER");
const app = require("./app");
// const { console } = require("inspector");

// Load all environment variables
const { loadEnv } = require('./app/config/env');
const env = loadEnv();
// --------------------------------------------------------------
// 🔹 ENV values
// --------------------------------------------------------------
const PORT = Number(process.env.PORT || 9003);
const FORCE_SHUTDOWN_MS = Number(process.env.FORCE_SHUTDOWN_MS || 30000);

let server;

// --------------------------------------------------------------
// 🔹 Connect to MongoDB (config/db.js)
// --------------------------------------------------------------
connectDB(env.MONGO_URI);  // pass the URI here

// --------------------------------------------------------------
// 🔹 Start Server
// --------------------------------------------------------------
function startServer() {
  server = http.createServer(app);

  server.listen(PORT, () => {
    logger.info(`🚀 Server running on port ${PORT} (${process.env.NODE_ENV})`);
  });

  server.on("error", (err) => logger.error("Server error:", err));
}

startServer();

// --------------------------------------------------------------
// 🔹 Graceful Shutdown
// --------------------------------------------------------------
async function gracefulShutdown(signal) {
  logger.warn(`${signal} received. Gracefully shutting down...`);

  try {
    if (server) {
      server.close(async () => {
        await disconnectDB();
        logger.info("🧹 Cleanup done. Exiting...");
        process.exit(0);
      });

      setTimeout(() => {
        logger.error("⏱ Force shutdown due to timeout");
        process.exit(1);
      }, FORCE_SHUTDOWN_MS).unref();
    }
  } catch (err) {
    logger.error("Shutdown error:", err);
    process.exit(1);
  }
}

process.once("SIGINT", () => gracefulShutdown("SIGINT"));
process.once("SIGTERM", () => gracefulShutdown("SIGTERM"));

// --------------------------------------------------------------
// 🔹 Unhandled Rejections
// --------------------------------------------------------------
process.on("unhandledRejection", (err) => {
  logger.error("UNHANDLED REJECTION:", err);
  gracefulShutdown("unhandledRejection");
});

// --------------------------------------------------------------
// 🔹 Uncaught Exceptions
// --------------------------------------------------------------
process.on("uncaughtException", (err) => {
  logger.error("UNCAUGHT EXCEPTION:", err);
  process.exit(1);
});
