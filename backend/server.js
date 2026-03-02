require('dotenv').config();
const express = require('express');
const cors = require('cors');
const problemRoutes = require('./routes/problemRoutes');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
// CORS configuration for production
const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (mobile apps, Postman, etc.)
    if (!origin) return callback(null, true);
    
    // Allow localhost for development
    if (origin.includes('localhost') || origin.includes('127.0.0.1')) {
      return callback(null, true);
    }
    
    // Allow your deployed frontend domains
    const allowedDomains = [
      'netlify.app',
      'vercel.app',
      'render.com',
      'railway.app'
    ];
    
    const isAllowed = allowedDomains.some(domain => origin.includes(domain));
    if (isAllowed) {
      return callback(null, true);
    }
    
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  optionsSuccessStatus: 200
};

app.use(cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging
app.use((req, res, next) => {
  console.log(`${req.method} ${req.path}`);
  next();
});

// Routes
app.use('/api', problemRoutes);

// Health check
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'LeetCode Tracker API is running',
    version: '1.0.0'
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Route not found'
  });
});

// Error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    success: false,
    error: 'Internal server error',
    message: err.message
  });
});

// Start server (only in development, Vercel handles this in production)
if (process.env.NODE_ENV !== 'production') {
  app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`📊 API: http://localhost:${PORT}/api`);
    console.log(`🏥 Health: http://localhost:${PORT}/`);
  });
}

// Export for Vercel serverless
module.exports = app;
