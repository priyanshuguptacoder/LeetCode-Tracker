require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');

const problemRoutes = require('./routes/problems');

const app = express();
const PORT = process.env.PORT || 5001;

// CORS — allow all origins (Render free tier, multiple frontends)
app.use(cors());

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Disable caching
app.use((req, res, next) => {
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
  next();
});

// Request logging
app.use((req, res, next) => {
  console.log(`${req.method} ${req.path}`);
  next();
});

// Routes
app.use('/api/problems', problemRoutes);

// Health check
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'LeetCode Tracker API is running',
    db: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ success: false, error: 'Route not found' });
});

// Error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ success: false, error: 'Internal server error', message: err.message });
});

// Connect to MongoDB then start server
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log('✅ MongoDB connected');
    app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`📝 Problems API: http://localhost:${PORT}/api/problems`);
    });
  })
  .catch((err) => {
    console.error('❌ MongoDB connection failed:', err.message);
    process.exit(1);
  });

module.exports = app;
