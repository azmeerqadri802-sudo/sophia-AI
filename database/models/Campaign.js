const mongoose = require('mongoose');

const CampaignSchema = new mongoose.Schema(
  {
    emailsSent: {
      type: Number,
      default: 243,
    },
    openRate: {
      type: Number,
      default: 68.4,
    },
    replies: {
      type: Number,
      default: 37,
    },
    meetingsBooked: {
      type: Number,
      default: 8,
    },
    autoPilot: {
      type: Boolean,
      default: true,
    },
    currentFocus: {
      type: String,
      default: 'Scraping Real Estate Agencies in New York',
    },
  },
  { timestamps: true }
);

module.exports = mongoose.models.Campaign || mongoose.model('Campaign', CampaignSchema);
