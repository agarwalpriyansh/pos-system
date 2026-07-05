const customerRepository = require('../repositories/customerRepository');

const getCustomersSortedBySpent = async (shopId) => {
  return customerRepository.findByShopId(shopId);
};

const searchCustomerByPhone = async (shopId, phone) => {
  if (!phone) {
    throw new Error('Phone number parameter is required');
  }
  const customer = await customerRepository.findByPhone(shopId, phone);
  if (!customer) {
    throw new Error('Customer not found');
  }
  return customer;
};

module.exports = {
  getCustomersSortedBySpent,
  searchCustomerByPhone
};
