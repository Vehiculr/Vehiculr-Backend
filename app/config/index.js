// config/index.js
'use strict';

// Aggregate different config modules into a single object
const env = require('./env');        // loads env variables
const db = require('./db');          // connect/disconnect helpers
const cors = require('./cors');      // corsOptions & helpers
const rateLimit = require('./rateLimit'); // export rate limiters

module.exports = {
  env,
  db,
  cors,
  rateLimit,
};
