const express = require('express');
require('dotenv').config();

// MINIMAL SEO METRICS RUNNER - BULLETPROOF STARTUP
console.log('🚀 SEO METRICS RUNNER - MINIMAL MODE');
console.log('📊 DATABASE_URL available:', !!process.env.DATABASE_URL);
console.log('🔧 NODE_ENV:', process.env.NODE_ENV);

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 10000;

// Health check - ALWAYS works
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    service: 'SEO Metrics Runner',
    timestamp: new Date().toISOString(),
    experiment: '$25 SEO→AI correlation',
    mode: 'minimal'
  });
});

// Status endpoint
app.get('/status', (req, res) => {
  res.json({
    service: 'SEO Metrics Runner',
    status: 'running',
    endpoints: ['/health', '/status'],
    experiment: '$25 SEO→AI correlation analysis',
    ready: true
  });
});

// Test endpoint for basic functionality
app.get('/test', (req, res) => {
  res.json({
    message: 'SEO Metrics Runner is operational',
    timestamp: new Date().toISOString(),
    ready_for_experiment: true
  });
});

// Start server immediately - no database dependencies
app.listen(PORT, () => {
  console.log(`✅ SEO Metrics Runner LIVE on port ${PORT}`);
  console.log(`🔗 Health: http://localhost:${PORT}/health`);
  console.log(`📊 Status: http://localhost:${PORT}/status`);
  console.log(`🎯 Ready for $25 experiment!`);
}); 