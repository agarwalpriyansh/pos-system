const express = require('express');
const router = express.Router();
const authMiddleware = require('../middlewares/auth');
const billController = require('./billController');

// Create a new bill and push task to Redis queue
router.post('/', authMiddleware, billController.createBill);

// Get all bills for the tenant
router.get('/', authMiddleware, billController.getBills);

// Update delivery status of a bill (Open endpoint called by background worker)
router.patch('/:id/status', billController.updateBillStatus);

module.exports = router;
