// app/config/db.js
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

module.exports = {
  connectDB,
};
