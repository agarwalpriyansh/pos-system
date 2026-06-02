const express = require('express');
const router = express.Router();
const Bill = require('../models/Bill');
const Customer = require('../models/Customer');
const Product = require('../models/Product');

// GET /api/analytics - Live dashboard metrics compiled securely by shopId
router.get('/', async (req, res) => {
  try {
    const shopId = req.shopId;

    // 1. Aggregate total revenue & transaction counts
    const billsStats = await Bill.aggregate([
      { $match: { shopId } },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: '$total' },
          totalBills: { $sum: 1 }
        }
      }
    ]);

    const totalRevenue = billsStats.length > 0 ? billsStats[0].totalRevenue : 0;
    const totalBills = billsStats.length > 0 ? billsStats[0].totalBills : 0;

    // 2. Count registered customers
    const totalCustomers = await Customer.countDocuments({ shopId });

    // 3. Count registered catalog products
    const totalProducts = await Product.countDocuments({ shopId, isActive: true });

    // 4. Aggregate payments by type (Cash, Card, UPI)
    const paymentBreakdown = await Bill.aggregate([
      { $match: { shopId } },
      {
        $group: {
          _id: '$paymentMethod',
          count: { $sum: 1 },
          amount: { $sum: '$total' }
        }
      }
    ]);

    // 5. Query top 5 recent bills
    const recentBills = await Bill.find({ shopId })
      .populate('customer', 'name phone')
      .sort({ createdAt: -1 })
      .limit(5);

    // 6. Aggregate top 5 products by quantity sold
    const topProducts = await Bill.aggregate([
      { $match: { shopId } },
      { $unwind: '$items' },
      {
        $group: {
          _id: '$items.name',
          quantity: { $sum: '$items.quantity' },
          revenue: { $sum: '$items.total' }
        }
      },
      { $sort: { quantity: -1 } },
      { $limit: 5 }
    ]);

    res.json({
      metrics: {
        totalRevenue: parseFloat(totalRevenue.toFixed(2)),
        totalBills,
        totalCustomers,
        totalProducts
      },
      paymentBreakdown,
      recentBills,
      topProducts
    });

  } catch (error) {
    console.error('[Analytics Error]:', error.message);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
