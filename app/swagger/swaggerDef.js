// app/swagger/swaggerDef.js
'use strict';

const swaggerJsdoc = require('swagger-jsdoc');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Vehiculr API',
      version: '1.0.0',
      description: 'API documentation for Vehiculr backend',
    },
    servers: [
      { url: process.env.SWAGGER_SERVER || 'http://localhost:9003/api' }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT'
        }
      }
    },
    security: [
      { bearerAuth: [] }
    ]
  },
  apis: ['./app/routes/*.js', './app/controllers/*.js'], // paths to scan for JSDoc comments
};

const swaggerSpec = swaggerJsdoc(options);
module.exports = swaggerSpec;
