const SuperAdminService = require('../services/superAdminService');
const shopRepository = require('../repositories/shopRepository');
const userRepository = require('../repositories/userRepository');

// Instantiate service with dependency injection (DIP)
const superAdminService = new SuperAdminService({
  shopRepository,
  userRepository
});

const seedSuperAdmin = async (req, res) => {
  try {
    const credentials = await superAdminService.seedSuperAdmin();
    res.status(201).json({
      message: 'Super Admin account seeded successfully!',
      credentials
    });
  } catch (error) {
    console.error('[Super Admin Seed Error]:', error.message);
    res.status(error.message.includes('already seeded') ? 400 : 500).json({ error: error.message });
  }
};

const getDashboardMetrics = async (req, res) => {
  try {
    const metrics = await superAdminService.getDashboardMetrics();
    res.json({ metrics });
  } catch (error) {
    console.error('[Super Admin Dashboard Error]:', error.message);
    res.status(500).json({ error: error.message });
  }
};

const getShopsList = async (req, res) => {
  try {
    const shopsList = await superAdminService.getShopsList();
    res.json(shopsList);
  } catch (error) {
    console.error('[Super Admin Get Shops Error]:', error.message);
    res.status(500).json({ error: error.message });
  }
};

const updateShopStatus = async (req, res) => {
  try {
    const { isActive } = req.body;
    if (isActive === undefined) {
      return res.status(400).json({ error: 'isActive flag is required' });
    }

    const shop = await superAdminService.updateShopStatus(req.params.shopId, isActive);
    res.json({
      message: `Shop status updated successfully. Active = ${shop.isActive}`,
      shop
    });
  } catch (error) {
    console.error('[Super Admin Update Shop Status Error]:', error.message);
    res.status(error.message.includes('not found') ? 404 : 400).json({ error: error.message });
  }
};

module.exports = {
  seedSuperAdmin,
  getDashboardMetrics,
  getShopsList,
  updateShopStatus
};
