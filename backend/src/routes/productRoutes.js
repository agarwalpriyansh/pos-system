const express = require('express');
const router = express.Router();
const Product = require('../models/Product');

// Get all active products for the tenant
router.get('/', async (req, res) => {
  try {
    const products = await Product.find({ shopId: req.shopId, isActive: true });
    res.json(products);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create a new product for the tenant
router.post('/', async (req, res) => {
  try {
    const { name, sku, price, category, stock } = req.body;
    
    if (!name || !sku || price === undefined || stock === undefined) {
      return res.status(400).json({ error: 'Name, SKU, price, and stock are required' });
    }

    // Check if sku already exists inside this shop
    const existingProduct = await Product.findOne({ shopId: req.shopId, sku });
    if (existingProduct) {
      return res.status(400).json({ error: `SKU '${sku}' already exists in your shop` });
    }

    const newProduct = new Product({ 
      shopId: req.shopId, 
      name, 
      sku, 
      price, 
      category: category || 'General', 
      stock 
    });
    await newProduct.save();
    res.status(201).json(newProduct);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Update product stock (POS sale check)
router.patch('/:id/stock', async (req, res) => {
  try {
    const { stock } = req.body;
    const product = await Product.findOneAndUpdate(
      { _id: req.params.id, shopId: req.shopId },
      { stock },
      { new: true, runValidators: true }
    );
    if (!product) return res.status(404).json({ error: 'Product not found in this shop' });
    res.json(product);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Update entire product details (Admin edit)
router.put('/:id', async (req, res) => {
  try {
    const { name, sku, price, category, stock, isActive } = req.body;

    // Check SKU conflict (if SKU is being changed)
    if (sku) {
      const existingProduct = await Product.findOne({ 
        shopId: req.shopId, 
        sku, 
        _id: { $ne: req.params.id } 
      });
      if (existingProduct) {
        return res.status(400).json({ error: `SKU '${sku}' already exists in your shop` });
      }
    }

    const product = await Product.findOneAndUpdate(
      { _id: req.params.id, shopId: req.shopId },
      { name, sku, price, category, stock, isActive },
      { new: true, runValidators: true }
    );
    if (!product) return res.status(404).json({ error: 'Product not found in this shop' });
    res.json(product);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Delete a product permanently from the database
router.delete('/:id', async (req, res) => {
  try {
    const product = await Product.findOneAndDelete({ _id: req.params.id, shopId: req.shopId });
    if (!product) return res.status(404).json({ error: 'Product not found in this shop' });
    res.json({ message: 'Product successfully deleted permanently', product });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
