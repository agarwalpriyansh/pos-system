const AuthService = require('../services/authService');
const shopRepository = require('../repositories/shopRepository');
const userRepository = require('../repositories/userRepository');

// Instantiate service with dependency injection (DIP)
const authService = new AuthService({
  shopRepository,
  userRepository
});

const register = async (req, res) => {
  try {
    const { shopName, shopDescription, shopContact, ownerName, ownerEmail, password } = req.body;

    if (!shopName || !ownerName || !ownerEmail || !password) {
      return res.status(400).json({ error: 'Shop name, owner name, email, and password are required' });
    }

    const { token, user, shop } = await authService.registerShopAndOwner(
      shopName, shopDescription, shopContact, ownerName, ownerEmail, password
    );

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
    res.status(500).json({ error: error.message });
  }
};

const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const { token, user, shop } = await authService.loginUser(email, password);

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
    if (error.message.includes('suspended')) {
      return res.status(403).json({ error: error.message });
    }
    res.status(500).json({ error: error.message });
  }
};

const googleOauthSimulated = async (req, res) => {
  try {
    const { googleId, email, name } = req.body;

    if (!googleId || !email || !name) {
      return res.status(400).json({ error: 'OAuth googleId, email, and name are required' });
    }

    const { token, user, shop } = await authService.loginGoogleOauthSimulated(googleId, email, name);

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
    if (error.message.includes('suspended')) {
      return res.status(403).json({ error: error.message });
    }
    res.status(500).json({ error: error.message });
  }
};

const getGoogleConfig = (req, res) => {
  res.json({
    googleClientId: process.env.GOOGLE_CLIENT_ID || ''
  });
};

const googleLogin = async (req, res) => {
  try {
    const { idToken } = req.body;
    if (!idToken) {
      return res.status(400).json({ error: 'Google ID Token is required' });
    }

    const result = await authService.verifyAndLoginGoogleToken(idToken);

    if (result.isNewUser) {
      return res.json(result);
    }

    res.json({
      message: 'Google Sign-In successful!',
      token: result.token,
      user: {
        id: result.user._id,
        name: result.user.name,
        email: result.user.email,
        role: result.user.role,
        shopId: result.user.shopId
      },
      shop: result.shop
    });
  } catch (error) {
    if (error.message.includes('suspended')) {
      return res.status(403).json({ error: error.message });
    }
    res.status(400).json({ error: error.message || 'Google OAuth token verification failed' });
  }
};

const googleRegister = async (req, res) => {
  try {
    const { idToken, shopName, shopDescription, shopContact, ownerName } = req.body;

    if (!idToken || !shopName || !ownerName) {
      return res.status(400).json({ error: 'ID Token, Shop Name, and Owner Name are required' });
    }

    const { token, user, shop } = await authService.registerGoogleUser(
      idToken, shopName, shopDescription, shopContact, ownerName
    );

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
    res.status(400).json({ error: error.message || 'Failed to complete Google registration' });
  }
};

const me = async (req, res) => {
  try {
    const { user, shop } = await authService.getUserProfileAndShop(req.user.userId, req.shopId);
    res.json({ user, shop });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const updateShop = async (req, res) => {
  try {
    const { name, description, contact } = req.body;
    const shop = await authService.updateShopProfile(
      req.shopId, req.user.role, name, description, contact
    );
    res.json({
      message: 'Shop settings updated successfully!',
      shop
    });
  } catch (error) {
    if (error.message.includes('Forbidden')) {
      return res.status(403).json({ error: error.message });
    }
    res.status(500).json({ error: error.message });
  }
};

module.exports = {
  register,
  login,
  googleOauthSimulated,
  getGoogleConfig,
  googleLogin,
  googleRegister,
  me,
  updateShop
};
