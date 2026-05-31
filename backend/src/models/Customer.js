const mongoose = require('mongoose');

const CustomerSchema = new mongoose.Schema({
  phone: {
    type: String,
    required: [true, 'Customer phone number is required'],
    unique: true,
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

module.exports = mongoose.model('Customer', CustomerSchema);
