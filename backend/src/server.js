require('dotenv').config();
const express = require('express');
const cors = require('cors');
const connectDB = require('./config/db');
const { getRedisClient } = require('./config/redis');

// Initialize database connection
connectDB();

// Initialize Redis connection
getRedisClient();

// Startup safety audit on keys
if (process.env.NODE_ENV === 'production') {
  if (!process.env.JWT_SECRET || process.env.JWT_SECRET === 'pos_jwt_secret_token_key') {
    console.warn('\x1b[33m%s\x1b[0m', '[SECURITY WARNING] Default or missing JWT_SECRET detected in production! Please configure a secure signature key.');
  }
}

const app = express();

// Hardened CORS Origin Controls
const allowedOrigins = process.env.ALLOWED_ORIGINS 
  ? process.env.ALLOWED_ORIGINS.split(',') 
  : ['http://localhost:5173', 'http://localhost:3000'];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Rejected by secure CORS configuration'));
    }
  },
  credentials: true
}));

app.use(express.json());

// Global input XSS sanitization across all request bodies
const { rateLimiter, sanitizeInput } = require('./middleware/security');
app.use(sanitizeInput);

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

const errorHandler = require('./middleware/errorHandler');
app.use(errorHandler);

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Backend server running on http://localhost:${PORT}`);
});
