class CustomerService {
  constructor({ customerRepository }) {
    this.customerRepository = customerRepository;
  }

  async getCustomersSortedBySpent(shopId) {
    return this.customerRepository.findByShopId(shopId);
  }

  async searchCustomerByPhone(shopId, phone) {
    if (!phone) {
      throw new Error('Phone number parameter is required');
    }
    const customer = await this.customerRepository.findByPhone(shopId, phone);
    if (!customer) {
      throw new Error('Customer not found');
    }
    return customer;
  }
}

module.exports = CustomerService;
