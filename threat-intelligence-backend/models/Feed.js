const mongoose = require('mongoose');

const feedSchema = new mongoose.Schema({
  url: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  name: {
    type: String,
    required: true
  },
  description: {
    type: String
  },
  // Latest article date processed from this feed
  isoDate: {
    type: Date,
    default: new Date(0) // Start from epoch time
  },
  // Error tracking
  lastError: {
    code: String,
    message: String,
    timestamp: Date
  },
  // Status tracking
  isActive: {
    type: Boolean,
    default: true
  },
  lastFetchAttempt: {
    type: Date,
    default: Date.now
  },
  fetchCount: {
    type: Number,
    default: 0
  },
  errorCount: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

// Index for date-based queries
feedSchema.index({ isoDate: -1 });

// Index for active feeds
feedSchema.index({ isActive: 1 });

module.exports = mongoose.model('Feed', feedSchema);
