// config/cors.js
const cors = require("cors");

const corsOptions = {
  origin: "*", // change later if needed
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true,
};

const configureCors = cors(corsOptions);

module.exports = {
  corsOptions,
  configureCors,
};
