const mongoose = require('mongoose');

const CustomerSchema = new mongoose.Schema({
  shopId: {
    type: String,
    required: [true, 'Shop ID is required'],
    index: true
  },
  phone: {
    type: String,
    required: [true, 'Customer phone number is required'],
    trim: true,
    match: [/^\+?[1-9][\d\s]{1,15}$/, 'Please fill a valid phone number']
  },
  name: {
    type: String,
    required: [true, 'Customer name is required'],
    trim: true
  },
  email: {
    type: String,
    trim: true,
    lowercase: true
  },
  totalSpent: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

// Compound index to ensure unique phone per shop
CustomerSchema.index({ shopId: 1, phone: 1 }, { unique: true });

module.exports = mongoose.model('Customer', CustomerSchema);
