const bcrypt = require('bcryptjs');

class SuperAdminService {
  constructor({ shopRepository, userRepository }) {
    this.shopRepository = shopRepository;
    this.userRepository = userRepository;
  }

  async seedSuperAdmin() {
    const adminEmail = 'admin@saaspos.com';
    const existingAdmin = await this.userRepository.findByEmail(adminEmail);
    
    if (existingAdmin) {
      throw new Error('Super Admin account already seeded!');
    }

    const platformShopId = 'super-admin-platform';
    let shop = await this.shopRepository.findByShopId(platformShopId);
    if (!shop) {
      shop = await this.shopRepository.save({
        shopId: platformShopId,
        name: 'SaaS Platform Owner',
        description: 'SaaS Platform Management Tenant instance.',
        contact: 'admin@saaspos.com'
      });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash('adminsecret', salt);

    const adminUser = await this.userRepository.save({
      shopId: platformShopId,
      name: 'System Super Admin',
      email: adminEmail,
      password: hashedPassword,
      role: 'SuperAdmin'
    });

    return {
      email: adminEmail,
      password: 'adminsecret'
    };
  }

  async getDashboardMetrics() {
    const totalShops = await this.shopRepository.countShopsExcludingPlatform();
    const activeShops = await this.shopRepository.countShopsExcludingPlatform(true);
    const suspendedShops = totalShops - activeShops;

    return {
      totalShops,
      activeShops,
      suspendedShops
    };
  }

  async getShopsList() {
    const shops = await this.shopRepository.findAllShops();

    const shopsList = await Promise.all(shops.map(async (shop) => {
      if (shop.shopId === 'super-admin-platform') return null;

      const owner = await this.userRepository.findOwnerByShopId(shop.shopId);

      return {
        ...shop.toObject(),
        owner: owner ? { name: owner.name, email: owner.email } : { name: 'N/A', email: 'N/A' }
      };
    }));

    return shopsList.filter(Boolean);
  }

  async updateShopStatus(shopId, isActive) {
    if (shopId === 'super-admin-platform') {
      throw new Error('Cannot deactivate the platform administration tenant!');
    }

    const shop = await this.shopRepository.findAndUpdate(shopId, { isActive });
    if (!shop) {
      throw new Error('Shop tenant not found');
    }

    return shop;
  }
}

module.exports = SuperAdminService;
