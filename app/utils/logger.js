// ./app/utils/logger.js
'use strict';

const winston = require('winston');
const path = require('path');
const fs = require('fs');
const { format } = winston;

// Ensure logs directory exists
const logDir = path.join(process.cwd(), 'logs');
if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir);
}

// Custom log format
const customFormat = format.printf(({ timestamp, level, message, label, stack }) => {
    return `${timestamp} [${label}] ${level.toUpperCase()}: ${stack || message}`;
});

// Create logger instance factory
function getLogger(filename) {
    const label = path.basename(filename || 'APP');

    const logger = winston.createLogger({
        level: process.env.LOG_LEVEL || 'info', // dynamic log levels
        format: format.combine(
            format.label({ label }),
            format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
            format.errors({ stack: true }),
            customFormat
        ),
        transports: [
            // Console output (colored)
            new winston.transports.Console({
                format: format.combine(
                    format.colorize(),
                    customFormat
                )
            }),

            // File for combined logs
            new winston.transports.File({
                filename: path.join(logDir, 'combined.log'),
                maxsize: 5 * 1024 * 1024, // 5 MB
                maxFiles: 5,
                tailable: true
            }),

            // File for error logs only
            new winston.transports.File({
                filename: path.join(logDir, 'error.log'),
                level: 'error',
                maxsize: 3 * 1024 * 1024, // 3 MB
                maxFiles: 3,
                tailable: true
            })
        ],
    });

    return logger;
}

// Optional: for Morgan HTTP logs
const httpStream = {
    write: (message) => {
        const logger = getLogger('HTTP');
        logger.info(message.trim());
    }
};

module.exports = {
    getLogger,
    httpStream
};
