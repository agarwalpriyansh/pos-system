const express = require('express');
const router = express.Router();
const analyticsController = require('../controllers/analyticsController');

// GET /api/analytics - Live dashboard metrics compiled securely by shopId
router.get('/', analyticsController.getAnalytics);

module.exports = router;
