const winston = require('winston');
const path = require('path');

function getLogger(filename) {
    const label = path.basename(filename);

    return winston.createLogger({
        level: 'info',
        format: winston.format.combine(
            winston.format.label({ label }),
            winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
            winston.format.printf(({ timestamp, level, message, label }) => {
                return `${timestamp} [${label}] ${level.toUpperCase()}: ${message}`;
            })
        ),
        transports: [
            new winston.transports.Console(),
            new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
            new winston.transports.File({ filename: 'logs/combined.log' }),
        ],
    });
}

module.exports = { getLogger };
