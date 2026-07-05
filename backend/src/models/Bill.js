const mongoose = require('mongoose');

const BillItemSchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true
  },
  name: {
    type: String,
    required: true
  },
  quantity: {
    type: Number,
    required: true,
    min: [1, 'Quantity must be at least 1']
  },
  weightChoice: {
    type: String,
    default: '1kg'
  },
  price: {
    type: Number,
    required: true,
    min: [0, 'Price cannot be negative']
  },
  total: {
    type: Number,
    required: true
  }
});

const BillSchema = new mongoose.Schema({
  shopId: {
    type: String,
    required: [true, 'Shop ID is required']
  },
  invoiceNumber: {
    type: String,
    required: true,
    default: () => `INV-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`
  },
  customer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Customer',
    required: true
  },
  items: [BillItemSchema],
  subtotal: {
    type: Number,
    required: true,
    min: 0
  },
  total: {
    type: Number,
    required: true,
    min: 0
  },
  paymentMethod: {
    type: String,
    required: true,
    enum: ['Cash', 'Card', 'UPI'],
    default: 'Cash'
  },
  whatsappStatus: {
    type: String,
    enum: ['Pending', 'Queued', 'Sent', 'Failed'],
    default: 'Pending'
  },
  emailStatus: {
    type: String,
    enum: ['Pending', 'Queued', 'Sent', 'Failed', 'N/A'],
    default: 'Pending'
  }
}, {
  timestamps: true
});

// Compound index to ensure unique invoiceNumber per shop
BillSchema.index({ shopId: 1, invoiceNumber: 1 }, { unique: true });

// Compound index for date range query and sorting performance
BillSchema.index({ shopId: 1, createdAt: -1 });

module.exports = mongoose.model('Bill', BillSchema);
