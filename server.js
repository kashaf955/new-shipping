const express = require('express');
const cors = require('cors');
const path = require('path');
const config = require('./config/config');

// Import routes
const insuranceRoutes = require('./routes/insurance');
const cartRoutes = require('./routes/cart');

const app = express();

// CORS Configuration
const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps, Postman, etc.)
    if (!origin) return callback(null, true);
    
    // Get allowed origins from config
    const allowedOrigins = config.cors.allowedOrigins || [];
    
    // If '*' is specified, allow all origins
    if (config.cors.origin === '*' || allowedOrigins.includes('*')) {
      return callback(null, true);
    }
    
    // Check if origin is in allowed list
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      // Also check if origin matches a pattern (for BigCommerce stores)
      const isBigCommerceOrigin = origin.includes('.mybigcommerce.com') || 
                                   origin.includes('.bigcommerce.com');
      if (isBigCommerceOrigin && config.cors.allowBigCommerce) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
  exposedHeaders: ['Content-Length', 'X-Foo', 'X-Bar'],
  maxAge: 86400 // 24 hours
};

// Apply CORS middleware
app.use(cors(corsOptions));

// Handle preflight requests
app.options('*', cors(corsOptions));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    environment: config.nodeEnv
  });
});

// API Routes
app.use('/api/insurance', insuranceRoutes);
app.use('/api/cart', cartRoutes);

// Serve static files (CSS, etc.)
// Use path.join for better path resolution across platforms
app.use('/css', express.static(path.join(__dirname, 'public', 'css')));

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({
    success: 0,
    error: err.message || 'Internal server error'
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: 0,
    error: 'Route not found'
  });
});

// Export for Vercel serverless function
module.exports = app;

// Start server only if not in Vercel environment
if (process.env.VERCEL !== '1') {
  const PORT = config.port;
  app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`📦 Environment: ${config.nodeEnv}`);
    console.log(`🏪 BigCommerce Store: ${config.bigcommerce.storeHash}`);
    console.log(`\nAvailable endpoints:`);
    console.log(`  GET  /health`);
    console.log(`  POST /api/insurance/add`);
    console.log(`  POST /api/insurance/update`);
    console.log(`  GET  /api/insurance/calculate`);
    console.log(`  GET  /api/cart/:cartId`);
  });
}

