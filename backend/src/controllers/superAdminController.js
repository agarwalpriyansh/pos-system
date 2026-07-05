const SuperAdminService = require('../services/superAdminService');
const shopRepository = require('../repositories/shopRepository');
const userRepository = require('../repositories/userRepository');
const { BadRequestError } = require('../utils/appError');

// Instantiate service with dependency injection (DIP)
const superAdminService = new SuperAdminService({
  shopRepository,
  userRepository
});

const seedSuperAdmin = async (req, res, next) => {
  try {
    const credentials = await superAdminService.seedSuperAdmin();
    res.status(201).json({
      message: 'Super Admin account seeded successfully!',
      credentials
    });
  } catch (error) {
    next(error);
  }
};

const getDashboardMetrics = async (req, res, next) => {
  try {
    const metrics = await superAdminService.getDashboardMetrics();
    res.json({ metrics });
  } catch (error) {
    next(error);
  }
};

const getShopsList = async (req, res, next) => {
  try {
    const shopsList = await superAdminService.getShopsList();
    res.json(shopsList);
  } catch (error) {
    next(error);
  }
};

const updateShopStatus = async (req, res, next) => {
  try {
    const { isActive } = req.body;
    if (isActive === undefined) {
      throw new BadRequestError('isActive flag is required');
    }

    const shop = await superAdminService.updateShopStatus(req.params.shopId, isActive);
    res.json({
      message: `Shop status updated successfully. Active = ${shop.isActive}`,
      shop
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  seedSuperAdmin,
  getDashboardMetrics,
  getShopsList,
  updateShopStatus
};
