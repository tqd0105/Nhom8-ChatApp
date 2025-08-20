// backend/logger.js
const pino = require('pino');

const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  // In dev, pretty-print ra console cho dễ đọc
  transport: process.env.NODE_ENV !== 'production'
    ? {
        target: 'pino-pretty',
        options: { colorize: true, translateTime: 'SYS:standard' }
      }
    : undefined
});

module.exports = logger;
