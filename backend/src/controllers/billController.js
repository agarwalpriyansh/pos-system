const BillService = require('../services/billService');
const billRepository = require('../repositories/billRepository');
const customerRepository = require('../repositories/customerRepository');
const productRepository = require('../repositories/productRepository');
const shopRepository = require('../repositories/shopRepository');
const queuePublisher = require('../queue/queuePublisher');

// Instantiate service with dependency injection (DIP)
const billService = new BillService({
  billRepository,
  customerRepository,
  productRepository,
  shopRepository,
  queuePublisher
});

const createBill = async (req, res, next) => {
  try {
    const bill = await billService.createBill(req.shopId, req.body);
    res.status(201).json({
      message: 'Bill created successfully and queued for receipt broadcast',
      bill
    });
  } catch (error) {
    next(error);
  }
};

const getBills = async (req, res, next) => {
  try {
    const bills = await billService.getBillsByShopId(req.shopId);
    res.json(bills);
  } catch (error) {
    next(error);
  }
};

const updateBillStatus = async (req, res, next) => {
  try {
    const { whatsappStatus, emailStatus } = req.body;
    const bill = await billService.updateBillStatus(req.params.id, whatsappStatus, emailStatus);
    res.json({ message: 'Status updated successfully', bill });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createBill,
  getBills,
  updateBillStatus
};
