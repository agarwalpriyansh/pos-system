const express = require('express');
const router = express.Router();
const Customer = require('../models/Customer');

// Get all customers sorted by totalSpent descending for this shop
router.get('/', async (req, res) => {
  try {
    const customers = await Customer.find({ shopId: req.shopId }).sort({ totalSpent: -1, updatedAt: -1 });
    res.json(customers);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Search customer by phone number (Scoped per shop)
router.get('/search', async (req, res) => {
  try {
    const { phone } = req.query;
    if (!phone) {
      return res.status(400).json({ error: 'Phone number parameter is required' });
    }
    const customer = await Customer.findOne({ shopId: req.shopId, phone });
    if (!customer) {
      return res.status(404).json({ message: 'Customer not found' });
    }
    res.json(customer);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
