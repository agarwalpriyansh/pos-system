const CustomerService = require('../services/customerService');
const customerRepository = require('../repositories/customerRepository');

// Instantiate service with dependency injection (DIP)
const customerService = new CustomerService({
  customerRepository
});

const getCustomers = async (req, res, next) => {
  try {
    const customers = await customerService.getCustomersSortedBySpent(req.shopId);
    res.json(customers);
  } catch (error) {
    next(error);
  }
};

const searchCustomer = async (req, res, next) => {
  try {
    const customer = await customerService.searchCustomerByPhone(req.shopId, req.query.phone);
    res.json(customer);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getCustomers,
  searchCustomer
};
