#!/usr/bin/env node

// PRODUCTION SERVER WITH CRAWL TRIGGER
const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');
const { spawn } = require('child_process');
const fs = require('fs');

const app = express();
const port = process.env.PORT || 10000;

// Database
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://raw_capture_db_user:wjFesUM8ISNEvE2b4kZtRAKgGYJVtKK5@dpg-d11fqgndiees73fb35dg-a.oregon-postgres.render.com/raw_capture_db',
  ssl: { rejectUnauthorized: false }
});

app.use(cors());
app.use(express.json());

// Root
app.get('/', (req, res) => {
  res.json({
    service: 'LLMRank.io API',
    status: 'operational',
    endpoints: [
      '/api/stats/rich', 
      '/api/rankings/rich', 
      '/api/domains/:domain/rich',
      '/api/trigger-crawl' // NEW!
    ]
  });
});

// Health
app.get('/health', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ status: 'healthy', database: 'connected' });
  } catch (err) {
    res.json({ status: 'degraded', database: 'error' });
  }
});

// API key check
const auth = (req, res, next) => {
  const key = req.headers['x-api-key'] || req.headers['authorization']?.replace('Bearer ', '');
  if (!key || !['llmpagerank-2025-neural-gateway', 'brandsentiment-premium-2025', 'internal-crawl-2025'].includes(key)) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
};

// 🚀 NEW: CRAWL TRIGGER ENDPOINT
app.post('/api/trigger-crawl', auth, async (req, res) => {
  try {
    // Check if crawler is already running
    const lockFile = '/tmp/crawl.lock';
    if (fs.existsSync(lockFile)) {
      const lockTime = fs.readFileSync(lockFile, 'utf8');
      const lockAge = Date.now() - parseInt(lockTime);
      
      // If lock is older than 1 hour, remove it (stale)
      if (lockAge > 3600000) {
        fs.unlinkSync(lockFile);
      } else {
        return res.json({
          status: 'already_running',
          started: new Date(parseInt(lockTime)).toISOString(),
          message: 'Crawler is already running. Check back in a few minutes.'
        });
      }
    }
    
    // Create lock file
    fs.writeFileSync(lockFile, Date.now().toString());
    
    // Get current stats
    const stats = await pool.query(`
      SELECT 
        (SELECT COUNT(*) FROM domains WHERE status = 'pending') as pending,
        (SELECT COUNT(*) FROM domains WHERE status = 'completed') as completed,
        (SELECT COUNT(*) FROM domain_responses) as total_responses
    `);
    
    // Spawn the crawler in background
    const crawler = spawn('node', ['crawler-tensor.js'], {
      cwd: __dirname,
      detached: true,
      stdio: 'ignore',
      env: process.env
    });
    
    crawler.unref();
    
    // Log the trigger
    const logEntry = {
      triggered_at: new Date().toISOString(),
      pid: crawler.pid,
      pending_domains: stats.rows[0].pending,
      completed_domains: stats.rows[0].completed,
      total_responses: stats.rows[0].total_responses
    };
    
    fs.appendFileSync('/tmp/crawl-triggers.log', JSON.stringify(logEntry) + '\n');
    
    res.json({
      status: 'started',
      pid: crawler.pid,
      stats: stats.rows[0],
      message: `Crawler started! Processing ${stats.rows[0].pending} pending domains.`,
      check_progress: '/api/crawl-status'
    });
    
  } catch (error) {
    // Clean up lock file on error
    try {
      fs.unlinkSync('/tmp/crawl.lock');
    } catch (e) {}
    
    res.status(500).json({
      status: 'error',
      error: error.message
    });
  }
});

// 🔍 NEW: CRAWL STATUS ENDPOINT
app.get('/api/crawl-status', auth, async (req, res) => {
  try {
    // Check if crawler is running
    const lockFile = '/tmp/crawl.lock';
    let isRunning = false;
    let startTime = null;
    
    if (fs.existsSync(lockFile)) {
      startTime = parseInt(fs.readFileSync(lockFile, 'utf8'));
      const lockAge = Date.now() - startTime;
      isRunning = lockAge < 3600000; // Consider running if less than 1 hour old
    }
    
    // Get current stats
    const stats = await pool.query(`
      SELECT 
        (SELECT COUNT(*) FROM domains WHERE status = 'pending') as pending,
        (SELECT COUNT(*) FROM domains WHERE status = 'processing') as processing,
        (SELECT COUNT(*) FROM domains WHERE status = 'completed') as completed
    `);
    
    // Get recent activity
    const recent = await pool.query(`
      SELECT model, COUNT(*) as count, MAX(created_at) as latest
      FROM domain_responses
      WHERE created_at > NOW() - INTERVAL '10 minutes'
      GROUP BY model
      ORDER BY latest DESC
      LIMIT 5
    `);
    
    res.json({
      is_running: isRunning,
      started_at: startTime ? new Date(startTime).toISOString() : null,
      duration_minutes: startTime ? Math.floor((Date.now() - startTime) / 60000) : null,
      domain_stats: stats.rows[0],
      recent_activity: recent.rows.map(r => ({
        model: r.model,
        responses: parseInt(r.count),
        last_response: r.latest
      }))
    });
    
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Rich stats (existing)
app.get('/api/stats/rich', auth, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        COUNT(DISTINCT d.id) as domains,
        COUNT(DISTINCT dr.model) as providers
      FROM domains d
      LEFT JOIN domain_responses dr ON d.id = dr.domain_id
    `);
    
    const providers = await pool.query(`
      SELECT model, COUNT(*) as count
      FROM domain_responses
      GROUP BY model
      ORDER BY count DESC
    `);
    
    res.json({
      overview: {
        totalDomains: parseInt(result.rows[0]?.domains || 0),
        totalProviders: parseInt(result.rows[0]?.providers || 0)
      },
      providers: providers.rows.map(p => ({
        name: p.model,
        count: parseInt(p.count),
        tribe: ['perplexity', 'you', 'phind'].some(s => p.model?.toLowerCase().includes(s)) ? 'search-enhanced' : 'base-llm'
      }))
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Start server
app.listen(port, () => {
  console.log(`
🚀 LLMRank.io API Server
========================
Port: ${port}
Environment: ${process.env.RENDER ? 'RENDER PRODUCTION' : 'LOCAL'}

NEW ENDPOINTS:
  POST /api/trigger-crawl - Start the crawler
  GET  /api/crawl-status  - Check crawl progress

Use x-api-key: internal-crawl-2025 for crawl endpoints
========================
  `);
});