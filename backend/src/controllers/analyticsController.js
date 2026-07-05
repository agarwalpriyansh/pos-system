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

const getAnalytics = async (req, res, next) => {
  try {
    const analytics = await analyticsService.compileLiveMetrics(req.shopId);
    res.json(analytics);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAnalytics
};
