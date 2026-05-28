const express = require('express');
const router = express.Router();
const Product = require('../models/Product');

// Get all active products
router.get('/', async (req, res) => {
  try {
    const products = await Product.find({ isActive: true });
    res.json(products);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create a new product (Admin)
router.post('/', async (req, res) => {
  try {
    const { name, sku, price, category, stock } = req.body;
    const newProduct = new Product({ name, sku, price, category, stock });
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
    const product = await Product.findByIdAndUpdate(
      req.params.id,
      { stock },
      { new: true, runValidators: true }
    );
    if (!product) return res.status(404).json({ error: 'Product not found' });
    res.json(product);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Update entire product details (Admin edit)
router.put('/:id', async (req, res) => {
  try {
    const { name, sku, price, category, stock, isActive } = req.body;
    const product = await Product.findByIdAndUpdate(
      req.params.id,
      { name, sku, price, category, stock, isActive },
      { new: true, runValidators: true }
    );
    if (!product) return res.status(404).json({ error: 'Product not found' });
    res.json(product);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Soft Delete a product (Deactivate it from POS sales screen)
router.delete('/:id', async (req, res) => {
  try {
    const product = await Product.findByIdAndUpdate(
      req.params.id,
      { isActive: false },
      { new: true }
    );
    if (!product) return res.status(404).json({ error: 'Product not found' });
    res.json({ message: 'Product successfully deactivated', product });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
