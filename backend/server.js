require('dotenv').config();
const express = require('express');
const cors = require('cors');
const problemRoutes = require('./routes/problemRoutes');

const app = express();
const PORT = process.env.PORT || 5001;

// Middleware
// CORS - Allow all origins for production deployment
app.use(cors());

// Disable caching for API responses
app.use((req, res, next) => {
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
  res.set('Pragma', 'no-cache');
  res.set('Expires', '0');
  next();
});

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging
app.use((req, res, next) => {
  console.log(`${req.method} ${req.path}`);
  next();
});

// Test route (direct, no controller)
app.get('/api/test', (req, res) => {
  res.json({
    success: true,
    message: 'API routes are working!',
    timestamp: new Date().toISOString()
  });
});

// Routes
app.use('/api', problemRoutes);

// Health check
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'LeetCode Tracker API is running',
    version: '1.0.0',
    endpoints: {
      problems: '/api/problems',
      stats: '/api/stats',
      health: '/'
    }
  });
});

// Debug endpoint
app.get('/debug', (req, res) => {
  const fs = require('fs');
  const path = require('path');
  
  res.json({
    success: true,
    cwd: process.cwd(),
    files: {
      problemsJson: fs.existsSync(path.join(__dirname, 'problems.json')),
      controller: fs.existsSync(path.join(__dirname, 'controllers', 'problemController.js')),
      routes: fs.existsSync(path.join(__dirname, 'routes', 'problemRoutes.js'))
    },
    env: {
      NODE_ENV: process.env.NODE_ENV,
      PORT: process.env.PORT || 5001
    }
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

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📊 API: http://localhost:${PORT}/api`);
  console.log(`🏥 Health: http://localhost:${PORT}/`);
  console.log(`🔍 Debug: http://localhost:${PORT}/debug`);
  console.log(`🧪 Test: http://localhost:${PORT}/api/test`);
  console.log(`📝 Problems: http://localhost:${PORT}/api/problems`);
  
  // Log all registered routes
  console.log('\n📋 Registered routes:');
  app._router.stack.forEach((middleware) => {
    if (middleware.route) {
      console.log(`  ${Object.keys(middleware.route.methods)} ${middleware.route.path}`);
    } else if (middleware.name === 'router') {
      middleware.handle.stack.forEach((handler) => {
        if (handler.route) {
          console.log(`  ${Object.keys(handler.route.methods)} ${handler.route.path}`);
        }
      });
    }
  });
});

module.exports = app;
