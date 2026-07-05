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

const authMiddleware = require('./middleware/auth');

// Routes
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/products', authMiddleware, require('./routes/productRoutes'));
app.use('/api/bills', require('./routes/billRoutes'));
app.use('/api/customers', authMiddleware, require('./routes/customerRoutes'));
app.use('/api/analytics', authMiddleware, require('./routes/analyticsRoutes'));
app.use('/api/super-admin', require('./routes/superAdminRoutes'));

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

    const sampleProducts = [];

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
