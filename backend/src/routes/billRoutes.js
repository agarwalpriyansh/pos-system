const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Bill = require('../models/Bill');
const Customer = require('../models/Customer');
const Product = require('../models/Product');
const { getRedisClient } = require('../config/redis');

// Create a new bill and push task to Redis queue
router.post('/', async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { customerPhone, customerName, customerEmail, items, tax, discount, paymentMethod } = req.body;

    if (!customerPhone || !customerName || !items || items.length === 0) {
      return res.status(400).json({ error: 'Customer phone, name, and items are required' });
    }

    // 1. Create or Update Customer
    let customer = await Customer.findOne({ phone: customerPhone }).session(session);
    if (!customer) {
      customer = new Customer({
        phone: customerPhone,
        name: customerName,
        email: customerEmail || undefined
      });
      await customer.save({ session });
    } else if (customerName !== customer.name) {
      customer.name = customerName;
      if (customerEmail) customer.email = customerEmail;
      await customer.save({ session });
    }

    // 2. Validate Items & Calculate Prices
    let subtotal = 0;
    const billItems = [];

    for (const item of items) {
      const product = await Product.findById(item.productId).session(session);
      if (!product) {
        throw new Error(`Product not found: ${item.productId}`);
      }

      // Check stock
      if (product.stock < item.quantity) {
        throw new Error(`Insufficient stock for product ${product.name}. Available: ${product.stock}`);
      }

      // Deduct stock
      product.stock -= item.quantity;
      await product.save({ session });

      const itemTotal = product.price * item.quantity;
      subtotal += itemTotal;

      billItems.push({
        product: product._id,
        name: product.name,
        quantity: item.quantity,
        price: product.price,
        total: itemTotal
      });
    }

    // Calculations
    const total = subtotal;

    // 3. Create Bill Document
    const bill = new Bill({
      customer: customer._id,
      items: billItems,
      subtotal,
      tax: 0,
      discount: 0,
      total,
      paymentMethod,
      whatsappStatus: 'Pending'
    });

    await bill.save({ session });

    // Update Customer's total spent
    customer.totalSpent += total;
    await customer.save({ session });

    // 4. Queue Payload Preparation
    const itemsSummary = billItems
      .map((item) => `${item.quantity}x ${item.name} (₹${item.price.toFixed(2)})`)
      .join(', ');

    const taskPayload = {
      billId: bill._id.toString(),
      invoiceNumber: bill.invoiceNumber,
      customerPhone: customer.phone,
      customerName: customer.name,
      total: bill.total,
      itemsSummary
    };

    // 5. Publish to Redis Queue (LPUSH)
    const redis = getRedisClient();
    const queueName = process.env.REDIS_QUEUE_NAME || 'queue:bills';
    await redis.lpush(queueName, JSON.stringify(taskPayload));

    // Update Status to Queued
    bill.whatsappStatus = 'Queued';
    await bill.save({ session });

    // Commit Transaction
    await session.commitTransaction();
    session.endSession();

    console.log(`[Queue Publisher] Successfully queued WhatsApp job for invoice ${bill.invoiceNumber}`);

    res.status(201).json({
      message: 'Bill created successfully and queued for WhatsApp broadcast',
      bill
    });

  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    console.error('[Billing Endpoint Error]:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// Get all bills
router.get('/', async (req, res) => {
  try {
    const bills = await Bill.find()
      .populate('customer', 'name phone')
      .sort({ createdAt: -1 });
    res.json(bills);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
