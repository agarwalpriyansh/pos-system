const Product = require('../models/Product');

const findById = async (id, shopId, session) => {
  return Product.findOne({ _id: id, shopId }).session(session);
};

const findByShopId = async (shopId) => {
  return Product.find({ shopId });
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

module.exports = {
  findById,
  findByShopId,
  findBySku,
  findByIdAndDelete,
  save
};
