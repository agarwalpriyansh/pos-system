const AnalyticsService = require('../services/analyticsService');
const billRepository = require('../repositories/billRepository');
const customerRepository = require('../repositories/customerRepository');
const productRepository = require('../repositories/productRepository');

// Instantiate service with dependency injection (DIP)
const analyticsService = new AnalyticsService({
  billRepository,
  customerRepository,
  productRepository
});

const getAnalytics = async (req, res) => {
  try {
    const analytics = await analyticsService.compileLiveMetrics(req.shopId);
    res.json(analytics);
  } catch (error) {
    console.error('[Analytics Error]:', error.message);
    res.status(500).json({ error: error.message });
  }
};

module.exports = {
  getAnalytics
};
