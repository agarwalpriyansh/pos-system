const mongoose = require('mongoose');
const Bill = require('../models/Bill');
const Customer = require('../models/Customer');
const Product = require('../models/Product');
const Shop = require('../models/Shop');
const { getRedisClient } = require('../config/redis');

const getMultiplier = (weightChoice) => {
  if (!weightChoice) return 1;
  const clean = weightChoice.toLowerCase().trim();
  if (clean.endsWith('kg')) {
    return parseFloat(clean) || 1;
  }
  if (clean.endsWith('g') || clean.endsWith('gm') || clean.endsWith('gms')) {
    const val = parseFloat(clean);
    return val ? val / 1000 : 1;
  }
  const val = parseFloat(clean);
  return val ? val / 1000 : 1;
};

// Create a new bill and push task to Redis queue
const createBill = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { customerPhone, customerName, customerEmail, items, paymentMethod } = req.body;

    if (!customerPhone || !customerName || !items || items.length === 0) {
      return res.status(400).json({ error: 'Customer phone, name, and items are required' });
    }

    // Fetch Shop metadata
    const shop = await Shop.findOne({ shopId: req.shopId }).session(session);
    if (!shop) {
      throw new Error(`Shop profile not found for tenant: ${req.shopId}`);
    }

    // 1. Create or Update Customer
    let customer = await Customer.findOne({ shopId: req.shopId, phone: customerPhone }).session(session);
    if (!customer) {
      customer = new Customer({
        shopId: req.shopId,
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
      const product = await Product.findOne({ _id: item.productId, shopId: req.shopId }).session(session);
      if (!product) {
        throw new Error(`Product not found in your catalog: ${item.productId}`);
      }

      // Calculate weight multiplier
      const weightChoice = item.weightChoice || '1kg';
      const multiplier = getMultiplier(weightChoice);

      const itemPrice = product.price * multiplier;
      const itemTotal = itemPrice * item.quantity;
      const stockDeduction = multiplier * item.quantity;

      // Check stock
      if (product.stock < stockDeduction) {
        throw new Error(`Insufficient stock for product ${product.name}. Available: ${product.stock} kg`);
      }

      // Deduct stock (rounding to 2 decimal places to avoid floating point issues)
      product.stock = parseFloat((product.stock - stockDeduction).toFixed(2));
      await product.save({ session });

      subtotal += itemTotal;

      billItems.push({
        product: product._id,
        name: product.name,
        quantity: item.quantity,
        weightChoice: weightChoice,
        price: itemPrice,
        total: itemTotal
      });
    }

    // Calculations
    const total = subtotal;

    // Generate sequential invoice number: INV-DDMMYYYY-N (scoped per shop)
    const now = new Date();
    const day = String(now.getDate()).padStart(2, '0');
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const year = now.getFullYear();
    const dateStr = `${day}${month}${year}`;

    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

    const countToday = await Bill.countDocuments({
      shopId: req.shopId,
      createdAt: {
        $gte: startOfDay,
        $lte: endOfDay
      }
    }).session(session);

    const invoiceNumber = `INV-${dateStr}-${countToday + 1}`;

    // 3. Create Bill Document
    const bill = new Bill({
      shopId: req.shopId,
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

    // 4. Queue Payload Preparation (with shop metadata for dynamic branding)
    const itemsSummary = billItems
      .map((item) => `${item.quantity}x ${item.name} (${item.weightChoice}) (₹${item.price.toFixed(2)})`)
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
      createdAt: bill.createdAt,
      // Inject shop details for dynamic sender info in worker
      shopName: shop.name,
      shopDescription: shop.description || 'Premium POS SaaS Merchant',
      shopContact: shop.contact || ''
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

    console.log(`[Queue Publisher] Successfully queued WhatsApp/Email job for invoice ${bill.invoiceNumber} (Shop: ${shop.name})`);

    res.status(201).json({
      message: 'Bill created successfully and queued for receipt broadcast',
      bill
    });

  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    console.error('[Billing Endpoint Error]:', error.message);
    res.status(500).json({ error: error.message });
  }
};

// Get all bills for the tenant
const getBills = async (req, res) => {
  try {
    const bills = await Bill.find({ shopId: req.shopId })
      .populate('customer', 'name phone email')
      .sort({ createdAt: -1 });
    res.json(bills);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Update delivery status of a bill (Open endpoint called by background worker)
const updateBillStatus = async (req, res) => {
  try {
    const { whatsappStatus, emailStatus } = req.body;
    const updateFields = {};
    if (whatsappStatus) updateFields.whatsappStatus = whatsappStatus;
    if (emailStatus) updateFields.emailStatus = emailStatus;

    // Direct findByIdAndUpdate since Bill ID is a globally unique Mongo ObjectId
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
};

module.exports = {
  createBill,
  getBills,
  updateBillStatus
};
