'use strict';

const path = require('path');
const dotenv = require('dotenv');

function loadEnv() {
  const envPath = path.join(process.cwd(), '.env');
  const result = dotenv.config({ path: envPath });

  if (result.error) {
    console.error("❌ Error loading .env:", result.error);
  }

  if (!process.env.MONGO_URI) {
    console.error("❌ MONGO_URI is missing!");
    // DO NOT EXIT YET — allow your logs to print
    return {}; 
  }

  const env = {
    PORT: process.env.PORT || 9002,
    MONGO_URI: process.env.MONGO_URI,
    RATE_LIMIT_WINDOW_MS: Number(process.env.RATE_LIMIT_WINDOW_MS) || 150 * 60 * 1000,
    RATE_LIMIT_MAX: Number(process.env.RATE_LIMIT_MAX) || 100,
  };
  return env;
}

module.exports = { loadEnv };
