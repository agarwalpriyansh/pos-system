const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI);
    console.log(`MongoDB Connected: ${conn.connection.host}`);

    // Drop old single-field unique indexes to allow multi-tenant compound indexes
    try {
      const db = conn.connection.db;

      // 1. Clean up customers phone index
      const customersIndexes = await db.collection('customers').indexes();
      if (customersIndexes.some(idx => idx.name === 'phone_1')) {
        await db.collection('customers').dropIndex('phone_1');
        console.log('[Index Clean] Successfully dropped old global unique index "phone_1" on customers.');
      }

      // 2. Clean up products sku index
      const productsIndexes = await db.collection('products').indexes();
      if (productsIndexes.some(idx => idx.name === 'sku_1')) {
        await db.collection('products').dropIndex('sku_1');
        console.log('[Index Clean] Successfully dropped old global unique index "sku_1" on products.');
      }

      // 3. Clean up bills invoiceNumber index
      const billsIndexes = await db.collection('bills').indexes();
      if (billsIndexes.some(idx => idx.name === 'invoiceNumber_1')) {
        await db.collection('bills').dropIndex('invoiceNumber_1');
        console.log('[Index Clean] Successfully dropped old global unique index "invoiceNumber_1" on bills.');
      }

    } catch (indexError) {
      console.warn('[Index Clean WARNING]: Could not clear old unique indexes, they may not exist:', indexError.message);
    }

  } catch (error) {
    console.error(`MongoDB Connection Error: ${error.message}`);
    process.exit(1);
  }
};

module.exports = connectDB;
