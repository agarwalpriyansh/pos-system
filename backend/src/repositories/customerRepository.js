const Customer = require('../models/Customer');

const findByPhone = async (shopId, phone, session) => {
  return Customer.findOne({ shopId, phone }).session(session);
};

const findByShopId = async (shopId) => {
  return Customer.find({ shopId }).sort({ totalSpent: -1, updatedAt: -1 });
};

const save = async (customerData, session) => {
  const customer = new Customer(customerData);
  return customer.save({ session });
};

const countByShopId = async (shopId) => {
  return Customer.countDocuments({ shopId });
};

module.exports = {
  findByPhone,
  findByShopId,
  save,
  countByShopId
};
