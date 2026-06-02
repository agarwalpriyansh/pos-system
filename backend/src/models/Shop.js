const mongoose = require('mongoose');

const ShopSchema = new mongoose.Schema({
  shopId: {
    type: String,
    required: true,
    unique: true,
    index: true,
    trim: true
  },
  name: {
    type: String,
    required: [true, 'Shop name is required'],
    trim: true
  },
  description: {
    type: String,
    default: ''
  },
  contact: {
    type: String,
    default: ''
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Shop', ShopSchema);
