const billService = require('../services/billService');

const createBill = async (req, res) => {
  try {
    const bill = await billService.createBill(req.shopId, req.body);
    res.status(201).json({
      message: 'Bill created successfully and queued for receipt broadcast',
      bill
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const getBills = async (req, res) => {
  try {
    const bills = await billService.getBillsByShopId(req.shopId);
    res.json(bills);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const updateBillStatus = async (req, res) => {
  try {
    const { whatsappStatus, emailStatus } = req.body;
    const bill = await billService.updateBillStatus(req.params.id, whatsappStatus, emailStatus);
    res.json({ message: 'Status updated successfully', bill });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports = {
  createBill,
  getBills,
  updateBillStatus
};
