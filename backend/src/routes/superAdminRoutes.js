const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const superAdminMiddleware = require('../middleware/superAdmin');
const superAdminController = require('../controllers/superAdminController');

// POST /seed - Seed default Super Admin account (PUBLIC)
router.post('/seed', superAdminController.seedSuperAdmin);

// Protect all other routes with auth and superAdmin middlewares
router.use(authMiddleware);
router.use(superAdminMiddleware);

// GET /dashboard - Platform overall statistics (focused on shops access tracking)
router.get('/dashboard', superAdminController.getDashboardMetrics);

// GET /shops - List all registered shops with owner profile info
router.get('/shops', superAdminController.getShopsList);

// PATCH /shops/:shopId/status - Suspension/activation switch
router.patch('/shops/:shopId/status', superAdminController.updateShopStatus);

module.exports = router;
