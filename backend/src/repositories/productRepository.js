const Product = require('../models/Product');

const findById = async (id, shopId, session) => {
  return Product.findOne({ _id: id, shopId }).session(session);
};

const findByShopId = async (shopId) => {
  return Product.find({ shopId });
};

const findByShopIdAndActive = async (shopId, isActive = true) => {
  return Product.find({ shopId, isActive });
};

const findBySku = async (shopId, sku) => {
  return Product.findOne({ shopId, sku });
};

const findByIdAndDelete = async (id, shopId) => {
  return Product.findOneAndDelete({ _id: id, shopId });
};

const save = async (productData, session) => {
  const product = new Product(productData);
  return product.save({ session });
};

const countActive = async (shopId) => {
  return Product.countDocuments({ shopId, isActive: true });
};

module.exports = {
  findById,
  findByShopId,
  findByShopIdAndActive,
  findBySku,
  findByIdAndDelete,
  save,
  countActive
};
