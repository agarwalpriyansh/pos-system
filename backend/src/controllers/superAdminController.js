const bcrypt = require('bcryptjs');
const Shop = require('../models/Shop');
const User = require('../models/User');

const seedSuperAdmin = async (req, res) => {
  try {
    const adminEmail = 'admin@saaspos.com';
    const existingAdmin = await User.findOne({ email: adminEmail });
    
    if (existingAdmin) {
      return res.status(400).json({ message: 'Super Admin account already seeded!' });
    }

    // Seed a mock Shop for the platform administration
    const platformShopId = 'super-admin-platform';
    let shop = await Shop.findOne({ shopId: platformShopId });
    if (!shop) {
      shop = new Shop({
        shopId: platformShopId,
        name: 'SaaS Platform Owner',
        description: 'SaaS Platform Management Tenant instance.',
        contact: 'admin@saaspos.com'
      });
      await shop.save();
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash('adminsecret', salt);

    const adminUser = new User({
      shopId: platformShopId,
      name: 'System Super Admin',
      email: adminEmail,
      password: hashedPassword,
      role: 'SuperAdmin'
    });

    await adminUser.save();

    res.status(201).json({
      message: 'Super Admin account seeded successfully!',
      credentials: {
        email: adminEmail,
        password: 'adminsecret'
      }
    });
  } catch (error) {
    console.error('[Super Admin Seed Error]:', error.message);
    res.status(500).json({ error: error.message });
  }
};

const getDashboardMetrics = async (req, res) => {
  try {
    const totalShops = await Shop.countDocuments({ shopId: { $ne: 'super-admin-platform' } });
    const activeShops = await Shop.countDocuments({ shopId: { $ne: 'super-admin-platform' }, isActive: true });
    const suspendedShops = totalShops - activeShops;

    res.json({
      metrics: {
        totalShops,
        activeShops,
        suspendedShops
      }
    });
  } catch (error) {
    console.error('[Super Admin Dashboard Error]:', error.message);
    res.status(500).json({ error: error.message });
  }
};

const getShopsList = async (req, res) => {
  try {
    const shops = await Shop.find().sort({ createdAt: -1 });

    const shopsList = await Promise.all(shops.map(async (shop) => {
      // Exclude platform tenant from public list
      if (shop.shopId === 'super-admin-platform') return null;

      const owner = await User.findOne({ shopId: shop.shopId, role: 'Owner' }).select('name email');

      return {
        ...shop.toObject(),
        owner: owner ? { name: owner.name, email: owner.email } : { name: 'N/A', email: 'N/A' }
      };
    }));

    res.json(shopsList.filter(Boolean));
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

    if (req.params.shopId === 'super-admin-platform') {
      return res.status(400).json({ error: 'Cannot deactivate the platform administration tenant!' });
    }

    const shop = await Shop.findOneAndUpdate(
      { shopId: req.params.shopId },
      { isActive },
      { new: true }
    );

    if (!shop) {
      return res.status(404).json({ error: 'Shop tenant not found' });
    }

    res.json({
      message: `Shop status updated successfully. Active = ${shop.isActive}`,
      shop
    });
  } catch (error) {
    console.error('[Super Admin Update Shop Status Error]:', error.message);
    res.status(500).json({ error: error.message });
  }
};

module.exports = {
  seedSuperAdmin,
  getDashboardMetrics,
  getShopsList,
  updateShopStatus
};
