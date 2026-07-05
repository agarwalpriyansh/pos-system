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

const aggregateStats = async (shopId) => {
  return Bill.aggregate([
    { $match: { shopId } },
    {
      $group: {
        _id: null,
        totalRevenue: { $sum: '$total' },
        totalBills: { $sum: 1 }
      }
    }
  ]);
};

const aggregatePayments = async (shopId) => {
  return Bill.aggregate([
    { $match: { shopId } },
    {
      $group: {
        _id: '$paymentMethod',
        count: { $sum: 1 },
        amount: { $sum: '$total' }
      }
    }
  ]);
};

const findRecent = async (shopId, limit) => {
  return Bill.find({ shopId })
    .populate('customer', 'name phone')
    .sort({ createdAt: -1 })
    .limit(limit);
};

const aggregateTopProducts = async (shopId, limit) => {
  return Bill.aggregate([
    { $match: { shopId } },
    { $unwind: '$items' },
    {
      $group: {
        _id: '$items.name',
        quantity: { $sum: '$items.quantity' },
        revenue: { $sum: '$items.total' }
      }
    },
    { $sort: { quantity: -1 } },
    { $limit: limit }
  ]);
};

module.exports = {
  findById,
  findByIdAndUpdate,
  findByShopId,
  countTodayBills,
  save,
  aggregateStats,
  aggregatePayments,
  findRecent,
  aggregateTopProducts
};
