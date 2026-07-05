const Customer = require('../models/Customer');

const findByPhone = async (shopId, phone, session) => {
  return Customer.findOne({ shopId, phone }).session(session);
};

const findByShopId = async (shopId) => {
  return Customer.find({ shopId }).sort({ totalSpent: -1 });
};

const save = async (customerData, session) => {
  const customer = new Customer(customerData);
  return customer.save({ session });
};

module.exports = {
  findByPhone,
  findByShopId,
  save
};
