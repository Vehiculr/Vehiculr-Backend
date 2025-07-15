// models/Brand.js
const mongoose = require('mongoose');

const brandSchema = new mongoose.Schema({
  type: { type: String, enum: ['car', 'bike'], required: true }, // 'car' or 'bike'
  name: { type: String, required: true },
});

const Blog  = mongoose.model('Brand', brandSchema);
module.exports = Blog;
