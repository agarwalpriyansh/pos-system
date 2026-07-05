const customerService = require('../services/customerService');

const getCustomers = async (req, res) => {
  try {
    const customers = await customerService.getCustomersSortedBySpent(req.shopId);
    res.json(customers);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const searchCustomer = async (req, res) => {
  try {
    const customer = await customerService.searchCustomerByPhone(req.shopId, req.query.phone);
    res.json(customer);
  } catch (error) {
    if (error.message.includes('not found')) {
      return res.status(404).json({ message: error.message });
    }
    res.status(500).json({ error: error.message });
  }
};

module.exports = {
  getCustomers,
  searchCustomer
};
