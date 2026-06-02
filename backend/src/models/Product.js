const mongoose = require('mongoose');

const ProductSchema = new mongoose.Schema({
  shopId: {
    type: String,
    required: [true, 'Shop ID is required'],
    index: true
  },
  name: {
    type: String,
    required: [true, 'Product name is required'],
    trim: true
  },
  sku: {
    type: String,
    required: [true, 'SKU is required'],
    trim: true
  },
  price: {
    type: Number,
    required: [true, 'Price is required'],
    min: [0, 'Price cannot be negative']
  },
  category: {
    type: String,
    default: 'General'
  },
  stock: {
    type: Number,
    required: true,
    default: 0,
    min: [0, 'Stock cannot be negative']
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Compound index to ensure unique SKU per shop
ProductSchema.index({ shopId: 1, sku: 1 }, { unique: true });

module.exports = mongoose.model('Product', ProductSchema);
