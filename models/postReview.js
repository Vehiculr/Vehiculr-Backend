const mongoose = require('mongoose');

const postReviewSchema = new mongoose.Schema({
    name: String,
    date: String,
    feedback: String,
    car: String,
    imageUrl: String,
    rating: Number,
});

// postReviewSchema.pre(/^find/, function (next) {
//   this.populate({
//     path: 'postReview',
//     select: 'name address contact Number',
//   });
//   next();
// });

const postReview = mongoose.model('postReview', postReviewSchema);

module.exports = postReview;
