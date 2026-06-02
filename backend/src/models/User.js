const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  shopId: {
    type: String,
    required: [true, 'Shop ID is required'],
    index: true
  },
  name: {
    type: String,
    required: [true, 'User name is required'],
    trim: true
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    trim: true,
    lowercase: true
  },
  password: {
    type: String,
    required: [true, 'Password is required']
  },
  role: {
    type: String,
    enum: ['Owner', 'Staff'],
    default: 'Staff'
  },
  googleId: {
    type: String,
    default: null
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('User', UserSchema);
