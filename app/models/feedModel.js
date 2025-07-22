const mongoose = require('mongoose');

const feedSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  content: {
    text: {
      type: String,
      required: true,
      trim: true,
      maxlength: 2000
    },
    hashtags: [{
      type: String,
      lowercase: true,
      trim: true
    }]
  },
  media: {
    images: [String], // Array of image URLs
    videos: [String]  // Array of video URLs
  },
  relatedContent: {
    title: {
      type: String,
      trim: true
    },
    source: {
      type: String,
      trim: true
    },
    readTime: {
      type: String,
      trim: true
    }
  },
  engagement: {
    likes: {
      type: Number,
      default: 0,
      min: 0
    },
    comments: {
      type: Number,
      default: 0,
      min: 0
    },
    shares: {
      type: Number,
      default: 0,
      min: 0
    }
  },
  translation: {
    available: Boolean,
    translatedText: String
  },
  metrics: {
    views: {
      type: Number,
      default: 0
    },
    saves: {
      type: Number,
      default: 0
    }
  },
  timestamp: {
    type: Date,
    default: Date.now
  },
  visibility: {
    type: String,
    enum: ['public', 'private', 'connections'],
    default: 'public'
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual for time since posting (e.g., "20h")
feedSchema.virtual('timePosted').get(function() {
  const diffHours = Math.floor((Date.now() - this.createdAt) / (1000 * 60 * 60));
  return diffHours > 0 ? `${diffHours}h` : 'Just now';
});

// Virtual for follower count (could be from User model)
feedSchema.virtual('followerCount').get(async function() {
  const user = await mongoose.model('User').findById(this.user);
  return user?.followersCount || 0;
});

// Indexes for better performance
feedSchema.index({ user: 1 });
feedSchema.index({ 'content.hashtags': 1 });
feedSchema.index({ createdAt: -1 });

const Feed = mongoose.model('feed', feedSchema);

module.exports = Feed;