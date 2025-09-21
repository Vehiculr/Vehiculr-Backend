const mongoose = require('mongoose');

const citySchema = new mongoose.Schema({
    name: { type: String, required: true, unique: true },
    isPopular: { type: Boolean, default: false },
    location: {
        type: { type: String, default: 'Point' },
        coordinates: [Number]
    }
});

// citySchema.index({ location: '2dsphere' });

module.exports = mongoose.model('City', citySchema);