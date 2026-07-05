const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { OAuth2Client } = require('google-auth-library');
const shopRepository = require('../repositories/shopRepository');
const userRepository = require('../repositories/userRepository');

let googleOAuthClient;

const verifyGoogleToken = async (token) => {
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
  if (!googleOAuthClient) {
    googleOAuthClient = new OAuth2Client(clientId);
  }
  const ticket = await googleOAuthClient.verifyIdToken({
    idToken: token,
    audience: clientId
  });
  return ticket.getPayload();
};

const generateToken = (user) => {
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
};

const registerShopAndOwner = async (shopName, shopDescription, shopContact, ownerName, ownerEmail, password) => {
  // Check if email already exists
  const existingUser = await userRepository.findByEmail(ownerEmail);
  if (existingUser) {
    throw new Error('Email is already registered');
  }

  // Generate unique shopId
  let shopId = '';
  let isUnique = false;
  while (!isUnique) {
    shopId = `shop-${Math.floor(100000 + Math.random() * 900000)}`;
    const existingShop = await shopRepository.findByShopId(shopId);
    if (!existingShop) {
      isUnique = true;
    }
  }

  // Create the Shop profile
  const shop = await shopRepository.save({
    shopId,
    name: shopName,
    description: shopDescription || '',
    contact: shopContact || ''
  });

  // Hash the password
  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(password, salt);

  // Create the Owner User
  const user = await userRepository.save({
    shopId,
    name: ownerName,
    email: ownerEmail,
    password: hashedPassword,
    role: 'Owner'
  });

  const token = generateToken(user);

  return { token, user, shop };
};

const loginUser = async (email, password) => {
  const user = await userRepository.findByEmail(email);
  if (!user) {
    throw new Error('Invalid email or password');
  }

  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) {
    throw new Error('Invalid email or password');
  }

  const shop = await shopRepository.findByShopId(user.shopId);

  if (user.role !== 'SuperAdmin' && shop && shop.isActive === false) {
    throw new Error('Your shop account has been suspended. Please contact platform support.');
  }

  const token = generateToken(user);

  return { token, user, shop };
};

const loginGoogleOauthSimulated = async (googleId, email, name) => {
  let user = await userRepository.findByEmailOrGoogleId(email, googleId);
  if (!user) {
    throw new Error('This simulated Google account is not registered. Please register first.');
  }

  const shop = await shopRepository.findByShopId(user.shopId);

  if (user.role !== 'SuperAdmin' && shop && shop.isActive === false) {
    throw new Error('Your shop account has been suspended. Please contact platform support.');
  }

  if (!user.googleId) {
    user.googleId = googleId;
    await user.save();
  }

  const token = generateToken(user);

  return { token, user, shop };
};

const verifyAndLoginGoogleToken = async (idToken) => {
  const payload = await verifyGoogleToken(idToken);
  const googleId = payload.sub;
  const email = payload.email;
  const name = payload.name;

  let user = await userRepository.findByEmailOrGoogleId(email, googleId);

  if (!user) {
    return {
      isNewUser: true,
      email,
      name,
      googleId
    };
  }

  if (!user.googleId) {
    user.googleId = googleId;
    await user.save();
  }

  const shop = await shopRepository.findByShopId(user.shopId);

  if (user.role !== 'SuperAdmin' && shop && shop.isActive === false) {
    throw new Error('Your shop account has been suspended. Please contact platform support.');
  }

  const token = generateToken(user);

  return { token, user, shop };
};

const registerGoogleUser = async (idToken, shopName, shopDescription, shopContact, ownerName) => {
  const payload = await verifyGoogleToken(idToken);
  const googleId = payload.sub;
  const email = payload.email;

  const existingUser = await userRepository.findByEmail(email);
  if (existingUser) {
    throw new Error('A user with this email is already registered.');
  }

  let shopId = '';
  let isUnique = false;
  while (!isUnique) {
    shopId = `shop-${Math.floor(100000 + Math.random() * 900000)}`;
    const existingShop = await shopRepository.findByShopId(shopId);
    if (!existingShop) {
      isUnique = true;
    }
  }

  const shop = await shopRepository.save({
    shopId,
    name: shopName,
    description: shopDescription || '',
    contact: shopContact || ''
  });

  const randomPassword = Math.random().toString(36).substring(2, 15);
  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(randomPassword, salt);

  const user = await userRepository.save({
    shopId,
    name: ownerName,
    email,
    password: hashedPassword,
    role: 'Owner',
    googleId
  });

  const token = generateToken(user);

  return { token, user, shop };
};

const getUserProfileAndShop = async (userId, shopId) => {
  const user = await userRepository.findById(userId);
  if (!user) {
    throw new Error('User not found');
  }

  const shop = await shopRepository.findByShopId(shopId);

  return { user, shop };
};

const updateShopProfile = async (shopId, role, name, description, contact) => {
  if (role !== 'Owner') {
    throw new Error('Forbidden: Only the shop owner can modify settings.');
  }

  const shop = await shopRepository.findAndUpdate(shopId, { name, description, contact });
  if (!shop) {
    throw new Error('Shop profile not found');
  }

  return shop;
};

module.exports = {
  registerShopAndOwner,
  loginUser,
  loginGoogleOauthSimulated,
  verifyAndLoginGoogleToken,
  registerGoogleUser,
  getUserProfileAndShop,
  updateShopProfile
};
