const mongoose = require('mongoose');
const billRepository = require('../repositories/billRepository');
const customerRepository = require('../repositories/customerRepository');
const productRepository = require('../repositories/productRepository');
const shopRepository = require('../repositories/shopRepository');
const queuePublisher = require('../queue/queuePublisher');
const { getMultiplier } = require('../utils/multiplier');

const createBill = async (shopId, billData) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { customerPhone, customerName, customerEmail, items, paymentMethod } = billData;

    // Fetch Shop metadata
    const shop = await shopRepository.findByShopId(shopId, session);
    if (!shop) {
      throw new Error(`Shop profile not found for tenant: ${shopId}`);
    }

    // 1. Create or Update Customer
    let customer = await customerRepository.findByPhone(shopId, customerPhone, session);
    if (!customer) {
      customer = await customerRepository.save({
        shopId,
        phone: customerPhone,
        name: customerName,
        email: customerEmail || undefined
      }, session);
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
        // Mongoose document save within transaction session
        await customer.save({ session });
      }
    }

    // 2. Validate Items & Calculate Prices
    let subtotal = 0;
    const billItems = [];

    for (const item of items) {
      const product = await productRepository.findById(item.productId, shopId, session);
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

    const countToday = await billRepository.countTodayBills(shopId, startOfDay, endOfDay, session);
    const invoiceNumber = `INV-${dateStr}-${countToday + 1}`;

    // 3. Create Bill Document
    const bill = await billRepository.save({
      shopId,
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
    }, session);

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
    await queuePublisher.publishBillTask(taskPayload);

    return bill;

  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    throw error;
  }
};

const getBillsByShopId = async (shopId) => {
  return billRepository.findByShopId(shopId);
};

const updateBillStatus = async (id, whatsappStatus, emailStatus) => {
  const updateFields = {};
  if (whatsappStatus) updateFields.whatsappStatus = whatsappStatus;
  if (emailStatus) updateFields.emailStatus = emailStatus;

  const bill = await billRepository.findByIdAndUpdate(id, updateFields);
  if (!bill) {
    throw new Error('Bill not found');
  }
  return bill;
};

module.exports = {
  createBill,
  getBillsByShopId,
  updateBillStatus
};
