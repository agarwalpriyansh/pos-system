require('dotenv').config();
const express = require('express');
const cors = require('cors');
const connectDB = require('./config/db');
const { getRedisClient } = require('./config/redis');

// Initialize database connection
connectDB();

// Initialize Redis connection
getRedisClient();

const app = express();

// Middlewares
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/products', require('./routes/productRoutes'));
app.use('/api/bills', require('./routes/billRoutes'));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date(),
    services: {
      mongodb: require('mongoose').connection.readyState === 1 ? 'connected' : 'disconnected',
      redis: getRedisClient().status === 'ready' ? 'connected' : 'disconnected'
    }
  });
});

// Seed Initial Data (optional, helper for development)
app.post('/api/seed', async (req, res) => {
  try {
    const Product = require('./models/Product');
    const existing = await Product.countDocuments();
    if (existing > 0) {
      return res.json({ message: 'Products already exist, skipping seeding.' });
    }

    const sampleProducts = [
      { name: 'Organic Espresso Blend', sku: 'ESP-001', price: 12.99, category: 'Coffee Beans', stock: 50 },
      { name: 'Cold Brew Concentrate', sku: 'CBC-002', price: 8.50, category: 'Beverages', stock: 30 },
      { name: 'Premium Ceramic Mug', sku: 'MUG-003', price: 15.00, category: 'Merchandise', stock: 15 },
      { name: 'Almond Croissant', sku: 'BAK-004', price: 4.25, category: 'Bakery', stock: 20 },
      { name: 'Matcha Green Tea Powder', sku: 'MTC-005', price: 18.99, category: 'Tea', stock: 25 }
    ];

    await Product.insertMany(sampleProducts);
    res.status(201).json({ message: 'Sample product catalog seeded successfully!', count: sampleProducts.length });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Backend server running on http://localhost:${PORT}`);
});
