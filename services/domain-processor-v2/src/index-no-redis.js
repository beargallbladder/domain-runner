/**
 * Emergency startup script without Redis
 */

console.log('Starting Domain Processor v2 WITHOUT Redis...');

const express = require('express');
const cors = require('cors');

const app = express();

// Basic middleware
app.use(cors());
app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'domain-processor-v2',
    version: '2.0.0',
    mode: 'emergency-no-redis',
    timestamp: new Date()
  });
});

app.get('/api/v2/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'domain-processor-v2',
    version: '2.0.0',
    mode: 'emergency-no-redis',
    timestamp: new Date()
  });
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    service: 'Domain Processor v2',
    status: 'running',
    mode: 'emergency-no-redis',
    message: 'Service running without Redis. Core features disabled.',
    endpoints: [
      'GET /health',
      'GET /api/v2/health'
    ]
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Not found',
    message: 'This endpoint is not available in emergency mode'
  });
});

// Start server
const port = process.env.PORT || 3003;
app.listen(port, () => {
  console.log(`Server listening on port ${port} (Emergency Mode - No Redis)`);
  console.log('Environment:', {
    NODE_ENV: process.env.NODE_ENV || 'not set',
    PORT: port,
    REDIS_URL: process.env.REDIS_URL ? 'Found' : 'NOT FOUND!',
    DATABASE_URL: process.env.DATABASE_URL ? 'Found' : 'NOT FOUND!'
  });
});