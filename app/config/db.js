"use strict";

const mongoose = require("mongoose");

async function connectDB(uri) {
  if (!uri) {
    console.error("❌ MONGO_URI is missing!");
    process.exit(1);
  }

  try {
    await mongoose.connect(uri);
    console.log("✅ MongoDB Connected");
  } catch (err) {
    console.error("❌ MongoDB Connection Error:", err.message);
    process.exit(1);
  }
}

async function disconnectDB() {
  try {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
      console.log("🔌 MongoDB Disconnected");
    }
  } catch (err) {
    console.error("❌ MongoDB Disconnection Error:", err.message);
  }
}

module.exports = {
  connectDB,
  disconnectDB,
};