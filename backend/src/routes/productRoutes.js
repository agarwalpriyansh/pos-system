const express = require('express');
const router = express.Router();
const productController = require('../controllers/productController');

// Get all active products for the tenant
router.get('/', productController.getProducts);

// Create a new product for the tenant
router.post('/', productController.createProduct);

// Update product stock (POS sale check)
router.patch('/:id/stock', productController.updateProductStock);

// Update entire product details (Admin edit)
router.put('/:id', productController.updateProductDetails);

// Delete a product permanently from the database
router.delete('/:id', productController.deleteProduct);

module.exports = router;
