const analyticsService = require('../services/analyticsService');

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
