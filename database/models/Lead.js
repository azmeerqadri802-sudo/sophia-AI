const mongoose = require('mongoose');

const LeadSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Lead name is required'],
      trim: true,
    },
    email: {
      type: String,
      required: [true, 'Email address is required'],
      unique: true,
      lowercase: true,
      trim: true,
    },
    company: {
      type: String,
      required: [true, 'Company name is required'],
      trim: true,
    },
    confidenceScore: {
      type: Number,
      required: true,
      min: 0,
      max: 100,
      default: 90,
    },
    status: {
      type: String,
      enum: ['Hot', 'Contacted', 'Rejected'],
      default: 'Hot',
    },
  },
  { timestamps: true }
);

module.exports = mongoose.models.Lead || mongoose.model('Lead', LeadSchema);
