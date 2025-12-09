// ./app/middleware/errorHandler.js
'use strict';
const logger = require('../utils/logger').getLogger('ERROR_HANDLER');
const AppError = require('../utils/appError');

const sendErrorDev = (err, req, res) => {
  logger.error({ message: err.message, stack: err.stack, url: req.originalUrl, method: req.method });
  res.status(err.statusCode || 500).json({
    success: false,
    error: err,
    message: err.message,
    stack: err.stack,
  });
};

const sendErrorProd = (err, req, res) => {
  logger.error({ message: err.message, stack: err.stack, url: req.originalUrl, method: req.method });
  if (err.isOperational) {
    res.status(err.statusCode).json({ success: false, message: err.message });
  } else {
    // Programming or unknown error: don't leak details
    res.status(500).json({ success: false, message: 'Something went very wrong!' });
  }
};

module.exports = (err, req, res, next) => {
  err.statusCode = err.statusCode || 500;
  err.status = err.status || 'error';

  if (process.env.NODE_ENV === 'development') {
    return sendErrorDev(err, req, res);
  }
  return sendErrorProd(err, req, res);
};