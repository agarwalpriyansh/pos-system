const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const authController = require('../controllers/authController');

// POST /register - Register a new shop and owner user
router.post('/register', authController.register);

// POST /login - Standard email & password login
router.post('/login', authController.login);

// POST /google-oauth - Google OAuth Login (or register if new user)
router.post('/google-oauth', authController.googleOauthSimulated);

// GET /google-config - Return Google Client ID for frontend GIS setup
router.get('/google-config', authController.getGoogleConfig);

// POST /google-login - Verify Google ID token and log in (or signal that it's a new user)
router.post('/google-login', authController.googleLogin);

// POST /google-register - Complete registration for a new user with Google ID token and Shop details
router.post('/google-register', authController.googleRegister);

// GET /me - Get current user profile and shop info
router.get('/me', authMiddleware, authController.me);

// PUT /shop - Update shop settings (Restricted to Owner)
router.put('/shop', authMiddleware, authController.updateShop);

module.exports = router;
