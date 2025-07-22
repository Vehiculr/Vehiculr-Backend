const mongoose = require('mongoose');
require('express-async-errors');
require('dotenv').config({ path: './.env' });
process.env.NODE_ENV = process.env.NODE_ENV || 'development';

const app = require('./app');
const logger = require('./app/utils/logger').getLogger(__filename);

// const DB = process.env.DATABASE.replace('<PASSWORD>', process.env.DATABASE_PASSWORD);
mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => logger.info('✅ MongoDB connected'))
  .catch(err => logger.error('❌ MongoDB connection error:', err));

const disconnectDB = async () => {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
    logger.info('MongoDB disconnected');
  }
};


// Uncaught Exceptions (sync errors)
process.on('uncaughtException', (err) => {
logger.error('UNCAUGHT EXCEPTION! 💥 Shutting down...');
  logger.error(err.name, err.message);
  process.exit(1); // Optional: exit to avoid unstable state
});

// Graceful shutdown
const cleanup = async () => {
  await disconnectDB();
  logger.info('🧹 Cleanup done. Shutting down...');
  // Example: close DB connection or Redis
  // mongoose.connection.close()
  // redisClient.quit()
};

process.once('SIGINT', async () => {
  logger.warn('SIGINT received (Ctrl+C). Shutting down...');
  await cleanup();
  process.exit(0);
});

process.once('SIGTERM', async () => {
  logger.warn('SIGTERM received. Shutting down...');
  await cleanup();
  process.exit(0);
});

process.once('exit', async () => {
  await cleanup();
});

const port = process.env.PORT || 9003;
const server = app.listen(port, () => {
logger.info(`🚀 App running on port ${port} in ${process.env.NODE_ENV} mode`)});

process.on('unhandledRejection', (err) => {
  console.log('UNHANDLED REJECTION! 💥 Shutting down...');
  console.log(err.name, err.message);
  server.close(() => {
    process.exit(1);
  });
});


