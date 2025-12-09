// app/swagger/swaggerRoutes.js
'use strict';

const express = require('express');
const router = express.Router();
const swaggerUi = require('swagger-ui-express');
const swaggerSpec = require('./swaggerDef');

router.use('/', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

module.exports = router;
