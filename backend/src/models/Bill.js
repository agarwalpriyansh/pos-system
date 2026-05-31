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
  invoiceNumber: {
    type: String,
    required: true,
    unique: true,
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

module.exports = mongoose.model('Bill', BillSchema);
