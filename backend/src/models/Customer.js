const mongoose = require('mongoose');

const CustomerSchema = new mongoose.Schema({
  phone: {
    type: String,
    required: [true, 'Customer phone number is required'],
    unique: true,
    trim: true,
    match: [/^\+?[1-9]\d{1,14}$/, 'Please fill a valid phone number in E.164 format (e.g. +1234567890)']
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

module.exports = mongoose.model('Customer', CustomerSchema);
