class AnalyticsService {
  constructor({ billRepository, customerRepository, productRepository }) {
    this.billRepository = billRepository;
    this.customerRepository = customerRepository;
    this.productRepository = productRepository;
  }

  async compileLiveMetrics(shopId) {
    // 1. Aggregate total revenue & transaction counts
    const billsStats = await this.billRepository.aggregateStats(shopId);

    const totalRevenue = billsStats.length > 0 ? billsStats[0].totalRevenue : 0;
    const totalBills = billsStats.length > 0 ? billsStats[0].totalBills : 0;

    // 2. Count registered customers
    const totalCustomers = await this.customerRepository.countByShopId(shopId);

    // 3. Count registered catalog products
    const totalProducts = await this.productRepository.countActive(shopId);

    // 4. Aggregate payments by type (Cash, Card, UPI)
    const paymentBreakdown = await this.billRepository.aggregatePayments(shopId);

    // 5. Query top 5 recent bills
    const recentBills = await this.billRepository.findRecent(shopId, 5);

    // 6. Aggregate top 5 products by quantity sold
    const topProducts = await this.billRepository.aggregateTopProducts(shopId, 5);

    return {
      metrics: {
        totalRevenue: parseFloat(totalRevenue.toFixed(2)),
        totalBills,
        totalCustomers,
        totalProducts
      },
      paymentBreakdown,
      recentBills,
      topProducts
    };
  }
}

module.exports = AnalyticsService;
