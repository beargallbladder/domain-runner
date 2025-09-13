const express = require('express');
const { Pool } = require('pg');
require('dotenv').config();
const axios = require('axios');
const cheerio = require('cheerio');

// SEO METRICS RUNNER - ULTRA ROBUST PRODUCTION MODE
console.log('🔍 SEO METRICS RUNNER STARTING - ULTRA ROBUST MODE');

let pool;
let databaseReady = false;

// Initialize database connection with fallback
try {
  pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
    max: 10,
    connectionTimeoutMillis: 30000,
  });
  console.log('📊 Database pool created');
} catch (error) {
  console.log('⚠️ Database pool creation failed, running in fallback mode:', error.message);
}

// Stealth configuration
const STEALTH_CONFIG = {
  userAgents: [
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
  ],
  requestDelay: 3000,
  timeout: 15000
};

// Graceful database operations
async function initializeDatabase() {
  try {
    if (!pool) {
      console.log('⚠️ No database pool available');
      return false;
    }
    
    console.log('🔄 Testing database connection...');
    const testResult = await pool.query('SELECT NOW() as current_time');
    console.log('✅ Database connected at:', testResult.rows[0].current_time);
    
    console.log('🔄 Creating tables if needed...');
    await pool.query(`
      CREATE TABLE IF NOT EXISTS seo_metrics (
        id SERIAL PRIMARY KEY,
        domain VARCHAR(255) NOT NULL,
        http_status_code INTEGER,
        page_load_time INTEGER,
        page_size INTEGER,
        dom_nodes INTEGER,
        https_enabled BOOLEAN,
        meta_title BOOLEAN,
        meta_description BOOLEAN,
        h1_count INTEGER,
        image_count INTEGER,
        schema_markup_types TEXT[],
        mobile_viewport BOOLEAN,
        compression_enabled BOOLEAN,
        cdn_detected BOOLEAN,
        internal_links INTEGER,
        external_links INTEGER,
        security_headers TEXT[],
        collected_at TIMESTAMP DEFAULT NOW(),
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);
    console.log('✅ Database tables ready');
    databaseReady = true;
    return true;
  } catch (error) {
    console.log('⚠️ Database initialization failed (continuing in fallback mode):', error.message);
    return false;
  }
}

// SEO Metrics Collection
async function collectSEOMetrics(domain) {
  const startTime = Date.now();
  
  try {
    const userAgent = STEALTH_CONFIG.userAgents[Math.floor(Math.random() * STEALTH_CONFIG.userAgents.length)];
    
    const response = await axios.get(`https://${domain}`, {
      timeout: STEALTH_CONFIG.timeout,
      headers: { 'User-Agent': userAgent },
      maxRedirects: 5
    });
    
    const $ = cheerio.load(response.data);
    const pageLoadTime = Date.now() - startTime;
    
    const metrics = {
      domain,
      httpStatusCode: response.status,
      pageLoadTime,
      pageSize: Buffer.byteLength(response.data, 'utf8'),
      domNodes: $('*').length,
      httpsEnabled: response.config.url.startsWith('https://'),
      metaTitle: $('title').length > 0,
      metaDescription: $('meta[name="description"]').length > 0,
      h1Count: $('h1').length,
      imageCount: $('img').length,
      schemaMarkupTypes: $('script[type="application/ld+json"]').map((i, el) => {
        try {
          const data = JSON.parse($(el).html());
          return data['@type'] || data.type;
        } catch { return null; }
      }).get().filter(Boolean),
      mobileViewport: $('meta[name="viewport"]').length > 0,
      compressionEnabled: response.headers['content-encoding'] ? true : false,
      cdnDetected: !!(response.headers['cf-ray'] || response.headers['x-amz-cf-id']),
      internalLinks: $('a[href^="/"], a[href*="' + domain + '"]').length,
      externalLinks: $('a[href^="http"]').not('[href*="' + domain + '"]').length,
      securityHeaders: Object.keys(response.headers).filter(h => 
        h.includes('security') || h.includes('x-frame') || h.includes('x-content')
      )
    };
    
    // Try to save to database, but don't fail if database is down
    if (databaseReady && pool) {
      try {
        await pool.query(`
          INSERT INTO seo_metrics (
            domain, http_status_code, page_load_time, page_size, dom_nodes,
            https_enabled, meta_title, meta_description, h1_count, image_count,
            schema_markup_types, mobile_viewport, compression_enabled, cdn_detected,
            internal_links, external_links, security_headers
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
        `, [
          metrics.domain, metrics.httpStatusCode, metrics.pageLoadTime, metrics.pageSize,
          metrics.domNodes, metrics.httpsEnabled, metrics.metaTitle, metrics.metaDescription,
          metrics.h1Count, metrics.imageCount, metrics.schemaMarkupTypes, metrics.mobileViewport,
          metrics.compressionEnabled, metrics.cdnDetected, metrics.internalLinks,
          metrics.externalLinks, metrics.securityHeaders
        ]);
        console.log(`💾 Saved metrics for ${domain}`);
      } catch (dbError) {
        console.log(`⚠️ Database save failed for ${domain}, returning data anyway:`, dbError.message);
      }
    }
    
    return metrics;
  } catch (error) {
    console.error(`❌ Failed to collect metrics for ${domain}:`, error.message);
    return { domain, error: error.message };
  }
}

// Express App Setup
const app = express();
app.use(express.json());

const PORT = process.env.PORT || 10000;

// Health check endpoint - ALWAYS works
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    service: 'SEO Metrics Runner',
    timestamp: new Date().toISOString(),
    database: databaseReady ? 'connected' : 'fallback_mode',
    version: '1.0.0'
  });
});

// Test single domain
app.get('/test/:domain', async (req, res) => {
  try {
    const domain = req.params.domain;
    console.log(`🔍 Testing SEO metrics for: ${domain}`);
    
    const metrics = await collectSEOMetrics(domain);
    res.json(metrics);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get status
app.get('/status', (req, res) => {
  res.json({
    service: 'SEO Metrics Runner',
    status: 'running',
    database: databaseReady ? 'connected' : 'fallback_mode',
    endpoints: ['/health', '/test/:domain', '/status'],
    experiment: '$25 SEO→AI correlation analysis'
  });
});

// Start server
async function startServer() {
  try {
    console.log('🔄 Initializing database...');
    await initializeDatabase();
    
    app.listen(PORT, () => {
      console.log(`🚀 SEO Metrics Runner running on port ${PORT}`);
      console.log(`📊 Database status: ${databaseReady ? 'CONNECTED' : 'FALLBACK MODE'}`);
      console.log(`🔗 Health check: http://localhost:${PORT}/health`);
      console.log(`✅ Service ready for $25 experiment!`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error.message);
    
    // Even if database fails, start the server anyway
    app.listen(PORT, () => {
      console.log(`🚀 SEO Metrics Runner running on port ${PORT} (FALLBACK MODE)`);
      console.log(`⚠️ Database unavailable, but service is operational`);
    });
  }
}

startServer(); 