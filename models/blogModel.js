const mongoose = require('mongoose');

const blogSchema = new mongoose.Schema({
    title: String,
    description: String,
    imageUrl: {
        type: [String],
        max: 4
      }, // Store URLs or file paths
});

// blogSchema.pre(/^find/, function (next) {
//   this.populate({
//     path: 'blog',
//     select: 'name address contact Number',
//   });
//   next();
// });

const Blog = mongoose.model('Blog', blogSchema);

module.exports = Blog;
