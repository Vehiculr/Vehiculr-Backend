const mongoose = require('mongoose');
const dotenv = require('dotenv');
// require('dotenv').config();


dotenv.config({ path: './.env' });
const app = require('./app');

// DATABASE_LOCAL=mongodb://localhost:27017/rentalPGApp
// const DB = process.env.DATABASE_LOCAL || "mongodb://localhost:27018/rentalPGApp";
// const DB = process.env.DATABASE.replace('<PASSWORD>', process.env.DATABASE_PASSWORD);
// const MONGO_URL ="mongodb://mongo:27017/rentalPGApp";
// const DB = "mongodb://localhost:27017/rentalPGApp";
mongoose.connect(process.env.MONGO_URL, { useNewUrlParser: true, useUnifiedTopology: true, connectTimeoutMS: 10000 })
  .then(() => console.log('✅ MongoDB Connected!'))
  .catch(err => console.log('❌ MongoDB Connection Error:', err));

const port = process.env.PORT || 9003;
// const port = 3000;

const server = app.listen(port, () => {
  console.log(`App running on port ${port}...`);
});

process.on('unhandledRejection', (err) => {
  console.log('UNHANDLED REJECTION! 💥 Shutting down...');
  console.log(err.name, err.message);
  server.close(() => {
    process.exit(1);
  });
});


