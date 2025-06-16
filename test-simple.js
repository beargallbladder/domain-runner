// Simple test for deployed service
const express = require('express');
const { Pool } = require('pg');

const app = express();
const PORT = process.env.PORT || 10000;

console.log('🚀 Simple test starting...');
console.log('📊 DATABASE_URL present:', !!process.env.DATABASE_URL);
console.log('🔧 NODE_ENV:', process.env.NODE_ENV);

// Simple health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    service: 'seo-metrics-test',
    timestamp: new Date().toISOString()
  });
});

// Database test endpoint
app.get('/db-test', async (req, res) => {
  try {
    const pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
    });
    
    const result = await pool.query('SELECT NOW() as current_time');
    await pool.end();
    
    res.json({ 
      status: 'Database connected successfully',
      time: result.rows[0].current_time
    });
  } catch (error) {
    console.error('Database test failed:', error.message);
    res.status(500).json({ 
      status: 'Database connection failed',
      error: error.message
    });
  }
});

app.listen(PORT, () => {
  console.log(`✅ Test service running on port ${PORT}`);
}); 