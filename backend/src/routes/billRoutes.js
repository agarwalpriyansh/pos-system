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
    } else {
      let isChanged = false;
      if (customerName !== customer.name) {
        customer.name = customerName;
        isChanged = true;
      }
      if (customerEmail && customerEmail !== customer.email) {
        customer.email = customerEmail;
        isChanged = true;
      }
      if (isChanged) {
        await customer.save({ session });
      }
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

    // Generate sequential invoice number: INV-DDMMYYYY-N
    const now = new Date();
    const day = String(now.getDate()).padStart(2, '0');
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const year = now.getFullYear();
    const dateStr = `${day}${month}${year}`;

    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

    const countToday = await Bill.countDocuments({
      createdAt: {
        $gte: startOfDay,
        $lte: endOfDay
      }
    }).session(session);

    const invoiceNumber = `INV-${dateStr}-${countToday + 1}`;

    // 3. Create Bill Document
    const bill = new Bill({
      invoiceNumber,
      customer: customer._id,
      items: billItems,
      subtotal,
      tax: 0,
      discount: 0,
      total,
      paymentMethod,
      whatsappStatus: 'Pending',
      emailStatus: customer.email ? 'Pending' : 'N/A'
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
      customerEmail: customer.email || '',
      total: bill.total,
      itemsSummary,
      paymentMethod: bill.paymentMethod,
      createdAt: bill.createdAt
    };

        // 5. Update Status to Queued
    bill.whatsappStatus = 'Queued';
    if (customer.email) {
      bill.emailStatus = 'Queued';
    }
    await bill.save({ session });

    // Commit Transaction
    await session.commitTransaction();
    session.endSession();

    // 6. Publish to Redis Queue (LPUSH) after successful transaction commit
    const redis = getRedisClient();
    const queueName = process.env.REDIS_QUEUE_NAME || 'queue:bills';
    await redis.lpush(queueName, JSON.stringify(taskPayload));

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

// Update delivery status of a bill
router.patch('/:id/status', async (req, res) => {
  try {
    const { whatsappStatus, emailStatus } = req.body;
    const updateFields = {};
    if (whatsappStatus) updateFields.whatsappStatus = whatsappStatus;
    if (emailStatus) updateFields.emailStatus = emailStatus;

    const bill = await Bill.findByIdAndUpdate(
      req.params.id,
      { $set: updateFields },
      { new: true }
    );

    if (!bill) {
      return res.status(404).json({ error: 'Bill not found' });
    }

    res.json({ message: 'Status updated successfully', bill });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
