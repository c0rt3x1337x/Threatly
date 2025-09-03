const mongoose = require('mongoose');

const alertSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  description: {
    type: String,
    required: true
  },
  isActive: {
    type: Boolean,
    default: true
  },
  keywords: [{
    type: String
  }],
  severity: {
    type: String,
    enum: ['critical', 'high', 'medium', 'low'],
    default: 'medium'
  },
  sectors: [{
    type: String,
    enum: ['Finance', 'Automotive', 'Industrial Control Systems', 'Healthcare', 'Energy', 'Transportation', 'Telecommunications', 'Government', 'Education', 'Retail', 'Manufacturing', 'Other']
  }]
}, {
  timestamps: true
});

// Index for active alerts
alertSchema.index({ isActive: 1 });

module.exports = mongoose.model('Alert', alertSchema);
