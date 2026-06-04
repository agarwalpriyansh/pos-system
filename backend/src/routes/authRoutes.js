const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const Shop = require('../models/Shop');
const User = require('../models/User');
const authMiddleware = require('../middlewares/auth');
const { OAuth2Client } = require('google-auth-library');

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

// Helper to generate JWT token
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

// POST /register - Register a new shop and owner user
router.post('/register', async (req, res) => {
  try {
    const { shopName, shopDescription, shopContact, ownerName, ownerEmail, password } = req.body;

    if (!shopName || !ownerName || !ownerEmail || !password) {
      return res.status(400).json({ error: 'Shop name, owner name, email, and password are required' });
    }

    // Check if email already exists
    const existingUser = await User.findOne({ email: ownerEmail });
    if (existingUser) {
      return res.status(400).json({ error: 'Email is already registered' });
    }

    // Generate unique shopId
    let shopId = '';
    let isUnique = false;
    while (!isUnique) {
      shopId = `shop-${Math.floor(100000 + Math.random() * 900000)}`;
      const existingShop = await Shop.findOne({ shopId });
      if (!existingShop) {
        isUnique = true;
      }
    }

    // Create the Shop profile
    const shop = new Shop({
      shopId,
      name: shopName,
      description: shopDescription || '',
      contact: shopContact || ''
    });
    await shop.save();

    // Hash the password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create the Owner User
    const user = new User({
      shopId,
      name: ownerName,
      email: ownerEmail,
      password: hashedPassword,
      role: 'Owner'
    });
    await user.save();

    const token = generateToken(user);

    res.status(201).json({
      message: 'Business registered successfully!',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        shopId: user.shopId
      },
      shop
    });
  } catch (error) {
    console.error('[Auth Register Error]:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// POST /login - Standard email & password login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    // Find the user
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Check password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Fetch Shop info
    const shop = await Shop.findOne({ shopId: user.shopId });

    if (user.role !== 'SuperAdmin' && shop && shop.isActive === false) {
      return res.status(403).json({ error: 'Your shop account has been suspended. Please contact platform support.' });
    }

    const token = generateToken(user);

    res.json({
      message: 'Login successful!',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        shopId: user.shopId
      },
      shop
    });
  } catch (error) {
    console.error('[Auth Login Error]:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// POST /google-oauth - Google OAuth Login (or register if new user)
router.post('/google-oauth', async (req, res) => {
  try {
    const { googleId, email, name } = req.body;

    if (!googleId || !email || !name) {
      return res.status(400).json({ error: 'OAuth googleId, email, and name are required' });
    }

    // Find user by email or by googleId
    let user = await User.findOne({ $or: [{ email }, { googleId }] });
    let shop;

    if (!user) {
      return res.status(400).json({ error: 'This simulated Google account is not registered. Please register first.' });
    } else {
      // If user exists, fetch shop info
      shop = await Shop.findOne({ shopId: user.shopId });
      
      if (user.role !== 'SuperAdmin' && shop && shop.isActive === false) {
        return res.status(403).json({ error: 'Your shop account has been suspended. Please contact platform support.' });
      }
      
      // Update googleId if missing
      if (!user.googleId) {
        user.googleId = googleId;
        await user.save();
      }
    }

    const token = generateToken(user);

    res.json({
      message: 'Google Sign-In successful!',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        shopId: user.shopId
      },
      shop
    });
  } catch (error) {
    console.error('[Google OAuth Error]:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// GET /google-config - Return Google Client ID for frontend GIS setup
router.get('/google-config', (req, res) => {
  res.json({
    googleClientId: process.env.GOOGLE_CLIENT_ID || ''
  });
});

// POST /google-login - Verify Google ID token and log in (or signal that it's a new user)
router.post('/google-login', async (req, res) => {
  try {
    const { idToken } = req.body;
    if (!idToken) {
      return res.status(400).json({ error: 'Google ID Token is required' });
    }

    const payload = await verifyGoogleToken(idToken);
    const googleId = payload.sub; // Google's unique subject ID
    const email = payload.email;
    const name = payload.name;

    // Check if user exists by email or googleId
    let user = await User.findOne({ $or: [{ email }, { googleId }] });

    if (!user) {
      // User is new! Return metadata so the frontend can show the registration form.
      return res.json({
        isNewUser: true,
        email,
        name,
        googleId
      });
    }

    // Existing user: update googleId if not already set
    if (!user.googleId) {
      user.googleId = googleId;
      await user.save();
    }

    // Fetch Shop info
    const shop = await Shop.findOne({ shopId: user.shopId });

    if (user.role !== 'SuperAdmin' && shop && shop.isActive === false) {
      return res.status(403).json({ error: 'Your shop account has been suspended. Please contact platform support.' });
    }

    const token = generateToken(user);

    res.json({
      message: 'Google Sign-In successful!',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        shopId: user.shopId
      },
      shop
    });
  } catch (error) {
    console.error('[Google Login Error]:', error.message);
    res.status(400).json({ error: error.message || 'Google OAuth token verification failed' });
  }
});

// POST /google-register - Complete registration for a new user with Google ID token and Shop details
router.post('/google-register', async (req, res) => {
  try {
    const { idToken, shopName, shopDescription, shopContact, ownerName } = req.body;

    if (!idToken || !shopName || !ownerName) {
      return res.status(400).json({ error: 'ID Token, Shop Name, and Owner Name are required' });
    }

    const payload = await verifyGoogleToken(idToken);
    const googleId = payload.sub;
    const email = payload.email;

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ error: 'A user with this email is already registered.' });
    }

    // Generate unique shopId
    let shopId = '';
    let isUnique = false;
    while (!isUnique) {
      shopId = `shop-${Math.floor(100000 + Math.random() * 900000)}`;
      const existingShop = await Shop.findOne({ shopId });
      if (!existingShop) {
        isUnique = true;
      }
    }

    // Create the Shop profile
    const shop = new Shop({
      shopId,
      name: shopName,
      description: shopDescription || '',
      contact: shopContact || ''
    });
    await shop.save();

    // Generate a random password for OAuth schema (since password is required)
    const randomPassword = Math.random().toString(36).substring(2, 15);
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(randomPassword, salt);

    // Create the Owner User
    const user = new User({
      shopId,
      name: ownerName,
      email,
      password: hashedPassword,
      role: 'Owner',
      googleId
    });
    await user.save();

    const token = generateToken(user);

    res.status(201).json({
      message: 'Business registered successfully via Google!',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        shopId: user.shopId
      },
      shop
    });
  } catch (error) {
    console.error('[Google Register Error]:', error.message);
    res.status(400).json({ error: error.message || 'Failed to complete Google registration' });
  }
});


// GET /me - Get current user profile and shop info
router.get('/me', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).select('-password');
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const shop = await Shop.findOne({ shopId: req.shopId });

    res.json({
      user,
      shop
    });
  } catch (error) {
    console.error('[Auth Me Error]:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// PUT /shop - Update shop settings (Restricted to Owner)
router.put('/shop', authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== 'Owner') {
      return res.status(403).json({ error: 'Forbidden: Only the shop owner can modify settings.' });
    }

    const { name, description, contact } = req.body;

    const shop = await Shop.findOneAndUpdate(
      { shopId: req.shopId },
      { name, description, contact },
      { new: true, runValidators: true }
    );

    if (!shop) {
      return res.status(404).json({ error: 'Shop profile not found' });
    }

    res.json({
      message: 'Shop settings updated successfully!',
      shop
    });
  } catch (error) {
    console.error('[Update Shop Error]:', error.message);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
