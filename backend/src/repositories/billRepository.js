const Bill = require('../models/Bill');

const findById = async (id, session) => {
  return Bill.findById(id).session(session);
};

const findByIdAndUpdate = async (id, updateFields) => {
  return Bill.findByIdAndUpdate(
    id,
    { $set: updateFields },
    { new: true }
  );
};

const findByShopId = async (shopId) => {
  return Bill.find({ shopId })
    .populate('customer', 'name phone email')
    .sort({ createdAt: -1 });
};

const countTodayBills = async (shopId, startOfDay, endOfDay, session) => {
  return Bill.countDocuments({
    shopId,
    createdAt: {
      $gte: startOfDay,
      $lte: endOfDay
    }
  }).session(session);
};

const save = async (billData, session) => {
  const bill = new Bill(billData);
  return bill.save({ session });
};

module.exports = {
  findById,
  findByIdAndUpdate,
  findByShopId,
  countTodayBills,
  save
};
