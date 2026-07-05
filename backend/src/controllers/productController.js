const productService = require('../services/productService');

const getProducts = async (req, res) => {
  try {
    const products = await productService.getActiveProducts(req.shopId);
    res.json(products);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const createProduct = async (req, res) => {
  try {
    const newProduct = await productService.createProduct(req.shopId, req.body);
    res.status(201).json(newProduct);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

const updateProductStock = async (req, res) => {
  try {
    const product = await productService.updateProductStock(req.params.id, req.shopId, req.body.stock);
    res.json(product);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

const updateProductDetails = async (req, res) => {
  try {
    const product = await productService.updateProductDetails(req.params.id, req.shopId, req.body);
    res.json(product);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

const deleteProduct = async (req, res) => {
  try {
    const product = await productService.deleteProductPermanently(req.params.id, req.shopId);
    res.json({ message: 'Product successfully deleted permanently', product });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports = {
  getProducts,
  createProduct,
  updateProductStock,
  updateProductDetails,
  deleteProduct
};
