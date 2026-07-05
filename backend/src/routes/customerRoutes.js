const express = require('express');
const router = express.Router();
const customerController = require('../controllers/customerController');

// Get all customers sorted by totalSpent descending for this shop
router.get('/', customerController.getCustomers);

// Search customer by phone number (Scoped per shop)
router.get('/search', customerController.searchCustomer);

module.exports = router;
