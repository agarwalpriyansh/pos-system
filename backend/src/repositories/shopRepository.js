const Shop = require('../models/Shop');

const findByShopId = async (shopId, session) => {
  const query = Shop.findOne({ shopId });
  if (session) {
    query.session(session);
  }
  return query;
};

const findAllShops = async () => {
  return Shop.find().sort({ createdAt: -1 });
};

const findAndUpdate = async (shopId, updateFields) => {
  return Shop.findOneAndUpdate(
    { shopId },
    updateFields,
    { new: true, runValidators: true }
  );
};

const save = async (shopData) => {
  const shop = new Shop(shopData);
  return shop.save();
};

module.exports = {
  findByShopId,
  findAllShops,
  findAndUpdate,
  save
};
