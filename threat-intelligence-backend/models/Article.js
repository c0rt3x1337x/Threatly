const mongoose = require('mongoose');

const articleSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    index: true
  },
  content: {
    type: String,
    required: true
  },
  link: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  isoDate: {
    type: Date,
    required: true,
    index: true
  },
  source: {
    type: String,
    required: true,
    index: true
  },
  feedUrl: {
    type: String,
    required: true,
    index: true
  },
  // Classification fields
  sector: {
    type: String,
    enum: ['Finance', 'Automotive', 'Industrial Control Systems', 'Healthcare', 'Energy', 'Transportation', 'Telecommunications', 'Government', 'Education', 'Retail', 'Manufacturing', 'Other'],
    default: 'Other'
  },
  industry: {
    type: String,
    enum: ['Automotive', 'Finance', 'ICS/OT', 'Healthcare', 'Energy', 'Government', 'Education', 'Retail', 'Manufacturing', 'Transportation', 'Telecommunications', 'Media', 'Entertainment', 'Other'],
    default: 'Other'
  },
  severity: {
    type: String,
    enum: ['critical', 'high', 'medium', 'low'],
    default: 'medium'
  },
  type: {
    type: String,
    enum: ['news', 'forum'],
    default: 'news'
  },
  spam: {
    type: Number,
    enum: [0, 1],
    default: 0
  },
  isSpam: {
    type: Boolean,
    default: false
  },
  // Alert flags for specific companies
  adyen: {
    type: Number,
    enum: [0, 1],
    default: 0
  },
  automotive: {
    type: Number,
    enum: [0, 1],
    default: 0
  },
  samsung_sdi: {
    type: Number,
    enum: [0, 1],
    default: 0
  },
  // Read status
  read: {
    type: Boolean,
    default: false
  },
  readAt: {
    type: Date,
    default: null
  },
  // Saved status
  saved: {
    type: Boolean,
    default: false
  },
  savedAt: {
    type: Date,
    default: null
  },
  // Alert matches from the alert processing system
  alertMatches: {
    type: [String],
    default: []
  },
  alertProcessedAt: {
    type: Date,
    default: null
  },
  // Custom alert categories (dynamic based on alerts configuration)
  alerts: {
    type: Map,
    of: Number,
    default: {}
  },
  // Processing metadata
  processedAt: {
    type: Date,
    default: Date.now
  },
  lastUpdated: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Compound index for deduplication
articleSchema.index({ link: 1, source: 1 }, { unique: true });

// Index for date-based queries
articleSchema.index({ isoDate: -1 });

// Index for source-based queries
articleSchema.index({ source: 1, isoDate: -1 });

// Index for read status
articleSchema.index({ read: 1 });

// Index for saved status
articleSchema.index({ saved: 1 });

// Index for alert flags
articleSchema.index({ adyen: 1 });
articleSchema.index({ automotive: 1 });
articleSchema.index({ samsung_sdi: 1 });

// Text index for search
articleSchema.index({ title: 'text', content: 'text' });

module.exports = mongoose.model('Article', articleSchema);
