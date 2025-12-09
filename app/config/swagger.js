// app/config/swagger.js
"use strict";

const swaggerUi = require("swagger-ui-express");
const fs = require("fs");
const path = require("path");

/**
 * Load swagger.json + mount Swagger UI
 */
function setupSwagger(app) {
  const swaggerPath = path.join(__dirname, "../../swagger.json");

  if (!fs.existsSync(swaggerPath)) {
    console.error("❌ swagger.json not found at:", swaggerPath);
    return;
  }

  const swaggerDocument = require(swaggerPath);

  app.use(
    "/api-docs",
    swaggerUi.serve,
    swaggerUi.setup(swaggerDocument, {
      explorer: true,
      customCss: ".swagger-ui .topbar { display: none }",
    })
  );

  console.log("📘 Swagger Docs available at: /api-docs");
}

module.exports = setupSwagger;
