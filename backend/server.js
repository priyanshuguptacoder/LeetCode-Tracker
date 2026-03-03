require('dotenv').config();
const express = require('express');
const cors = require('cors');
const problemRoutes = require('./routes/problemRoutes');

const app = express();
const PORT = process.env.PORT || 5001;

// Middleware
// CORS - Allow all origins for production deployment
app.use(cors());
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

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📊 API: http://localhost:${PORT}/api`);
  console.log(`🏥 Health: http://localhost:${PORT}/`);
});

module.exports = app;
