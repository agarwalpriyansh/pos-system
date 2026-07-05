const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { OAuth2Client } = require('google-auth-library');

class AuthService {
  constructor({ shopRepository, userRepository }) {
    this.shopRepository = shopRepository;
    this.userRepository = userRepository;
    this.googleOAuthClient = null;
  }

  async verifyGoogleToken(token) {
    if (token && typeof token === 'string' && token.startsWith('mock-oauth-token:')) {
      const parts = token.split(':');
      return {
        sub: parts[1] || 'mock-google-id',
        email: parts[2] || 'mock@example.com',
        name: parts[3] || 'Mock User'
      };
    }

    const clientId = process.env.GOOGLE_CLIENT_ID;
    if (!clientId || clientId.startsWith('your-google-client-id-here')) {
      throw new Error('Google OAuth is not configured on the server. Please define GOOGLE_CLIENT_ID.');
    }
    if (!this.googleOAuthClient) {
      this.googleOAuthClient = new OAuth2Client(clientId);
    }
    const ticket = await this.googleOAuthClient.verifyIdToken({
      idToken: token,
      audience: clientId
    });
    return ticket.getPayload();
  }

  generateToken(user) {
    return jwt.sign(
      { 
        userId: user._id, 
        shopId: user.shopId, 
        role: user.role, 
        name: user.name, 
        email: user.email 
      },
      process.env.JWT_SECRET || 'pos_jwt_secret_token_key',
      { expiresIn: '30d' }
    );
  }

  async registerShopAndOwner(shopName, shopDescription, shopContact, ownerName, ownerEmail, password) {
    const existingUser = await this.userRepository.findByEmail(ownerEmail);
    if (existingUser) {
      throw new Error('Email is already registered');
    }

    let shopId = '';
    let isUnique = false;
    while (!isUnique) {
      shopId = `shop-${Math.floor(100000 + Math.random() * 900000)}`;
      const existingShop = await this.shopRepository.findByShopId(shopId);
      if (!existingShop) {
        isUnique = true;
      }
    }

    const shop = await this.shopRepository.save({
      shopId,
      name: shopName,
      description: shopDescription || '',
      contact: shopContact || ''
    });

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const user = await this.userRepository.save({
      shopId,
      name: ownerName,
      email: ownerEmail,
      password: hashedPassword,
      role: 'Owner'
    });

    const token = this.generateToken(user);

    return { token, user, shop };
  }

  async loginUser(email, password) {
    const user = await this.userRepository.findByEmail(email);
    if (!user) {
      throw new Error('Invalid email or password');
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      throw new Error('Invalid email or password');
    }

    const shop = await this.shopRepository.findByShopId(user.shopId);

    if (user.role !== 'SuperAdmin' && shop && shop.isActive === false) {
      throw new Error('Your shop account has been suspended. Please contact platform support.');
    }

    const token = this.generateToken(user);

    return { token, user, shop };
  }

  async loginGoogleOauthSimulated(googleId, email, name) {
    let user = await this.userRepository.findByEmailOrGoogleId(email, googleId);
    if (!user) {
      throw new Error('This simulated Google account is not registered. Please register first.');
    }

    const shop = await this.shopRepository.findByShopId(user.shopId);

    if (user.role !== 'SuperAdmin' && shop && shop.isActive === false) {
      throw new Error('Your shop account has been suspended. Please contact platform support.');
    }

    if (!user.googleId) {
      user.googleId = googleId;
      await user.save();
    }

    const token = this.generateToken(user);

    return { token, user, shop };
  }

  async verifyAndLoginGoogleToken(idToken) {
    const payload = await this.verifyGoogleToken(idToken);
    const googleId = payload.sub;
    const email = payload.email;

    let user = await this.userRepository.findByEmailOrGoogleId(email, googleId);

    if (!user) {
      return {
        isNewUser: true,
        email,
        name: payload.name,
        googleId
      };
    }

    if (!user.googleId) {
      user.googleId = googleId;
      await user.save();
    }

    const shop = await this.shopRepository.findByShopId(user.shopId);

    if (user.role !== 'SuperAdmin' && shop && shop.isActive === false) {
      throw new Error('Your shop account has been suspended. Please contact platform support.');
    }

    const token = this.generateToken(user);

    return { token, user, shop };
  }

  async registerGoogleUser(idToken, shopName, shopDescription, shopContact, ownerName) {
    const payload = await this.verifyGoogleToken(idToken);
    const googleId = payload.sub;
    const email = payload.email;

    const existingUser = await this.userRepository.findByEmail(email);
    if (existingUser) {
      throw new Error('A user with this email is already registered.');
    }

    let shopId = '';
    let isUnique = false;
    while (!isUnique) {
      shopId = `shop-${Math.floor(100000 + Math.random() * 900000)}`;
      const existingShop = await this.shopRepository.findByShopId(shopId);
      if (!existingShop) {
        isUnique = true;
      }
    }

    const shop = await this.shopRepository.save({
      shopId,
      name: shopName,
      description: shopDescription || '',
      contact: shopContact || ''
    });

    const randomPassword = Math.random().toString(36).substring(2, 15);
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(randomPassword, salt);

    const user = await this.userRepository.save({
      shopId,
      name: ownerName,
      email,
      password: hashedPassword,
      role: 'Owner',
      googleId
    });

    const token = this.generateToken(user);

    return { token, user, shop };
  }

  async getUserProfileAndShop(userId, shopId) {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    const shop = await this.shopRepository.findByShopId(shopId);

    return { user, shop };
  }

  async updateShopProfile(shopId, role, name, description, contact) {
    if (role !== 'Owner') {
      throw new Error('Forbidden: Only the shop owner can modify settings.');
    }

    const shop = await this.shopRepository.findAndUpdate(shopId, { name, description, contact });
    if (!shop) {
      throw new Error('Shop profile not found');
    }

    return shop;
  }
}

module.exports = AuthService;
