const express = require('express');
const router = express.Router();
const Customer = require('../models/Customer');

// Get all customers sorted by totalSpent descending
router.get('/', async (req, res) => {
  try {
    const customers = await Customer.find().sort({ totalSpent: -1, updatedAt: -1 });
    res.json(customers);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
