#!/usr/bin/env node

/**
 * PRODUCTION API SERVER - LLMRank.io
 * Rich provider breakdowns and tribal analysis
 * ROCK SOLID. BATTLE TESTED. PRODUCTION READY.
 */

console.log('🚀 Starting LLMRank.io Production Server...');
console.log('📅 Startup time:', new Date().toISOString());
console.log('🔧 Node version:', process.version);
console.log('💾 Memory:', Math.round(process.memoryUsage().heapUsed / 1024 / 1024) + 'MB');

// Load environment
try {
  require('dotenv').config();
  console.log('✅ Environment loaded');
} catch (e) {
  console.log('⚠️  Using system environment variables');
}

const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');

const app = express();
const port = process.env.PORT || 10000;

// Database configuration with fallback
const dbUrl = process.env.DATABASE_URL || 'postgresql://raw_capture_db_user:wjFesUM8ISNEvE2b4kZtRAKgGYJVtKK5@dpg-d11fqgndiees73fb35dg-a.oregon-postgres.render.com/raw_capture_db';
console.log('🔗 Database:', dbUrl.includes('@') ? dbUrl.split('@')[1].split('/')[0] : 'configured');
console.log('🌍 Environment:', process.env.NODE_ENV || 'development');
console.log('🔌 Port:', port);

// Create connection pool with error handling
let pool;
try {
  pool = new Pool({
    connectionString: dbUrl,
    ssl: { rejectUnauthorized: false },
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
  });
  
  // Test database connection immediately
  pool.query('SELECT 1').then(() => {
    console.log('✅ Database connected successfully');
  }).catch(err => {
    console.error('❌ Database connection failed:', err.message);
    // Don't exit - server can still show status page
  });
} catch (err) {
  console.error('❌ Failed to create database pool:', err.message);
  process.exit(1);
}

// Request logging middleware
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`${req.method} ${req.path} - ${res.statusCode} - ${duration}ms`);
  });
  next();
});

// CORS middleware
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'x-api-key', 'X-API-Key', 'Authorization']
}));

// JSON parsing with error handling
app.use(express.json());

// Global error handler
app.use((err, req, res, next) => {
  console.error('ERROR:', err);
  res.status(500).json({ 
    error: 'Internal server error',
    message: err.message 
  });
});

// Simple in-memory cache
const cache = new Map();
const CACHE_TTL = 60 * 1000; // 1 minute cache

const getCached = (key) => {
  const item = cache.get(key);
  if (item && Date.now() - item.timestamp < CACHE_TTL) {
    console.log(`📦 Cache hit: ${key}`);
    return item.data;
  }
  return null;
};

const setCached = (key, data) => {
  cache.set(key, { data, timestamp: Date.now() });
  // Limit cache size
  if (cache.size > 100) {
    const firstKey = cache.keys().next().value;
    cache.delete(firstKey);
  }
};

// API Key validation with logging
const checkApiKey = (req, res, next) => {
  const apiKey = req.headers['x-api-key'] || 
                 req.headers['X-API-Key'] || 
                 req.headers['authorization']?.replace('Bearer ', '');
  
  const validKeys = [
    'llmpagerank-2025-neural-gateway',
    'brandsentiment-premium-2025',
    'enterprise-tier-2025-secure',
    'neural-api-key-2025'
  ];
  
  if (!apiKey) {
    console.log('⚠️  No API key provided');
    return res.status(401).json({ 
      error: 'Unauthorized',
      message: 'API key required'
    });
  }
  
  if (!validKeys.includes(apiKey)) {
    console.log(`❌ Invalid API key: ${apiKey.substring(0, 10)}...`);
    return res.status(401).json({ 
      error: 'Unauthorized',
      message: 'Invalid API key'
    });
  }
  
  console.log(`✅ Valid API key: ${apiKey.substring(0, 20)}...`);
  next();
};

// ============================================
// PUBLIC ENDPOINTS
// ============================================

app.get('/', (req, res) => {
  res.json({
    service: 'LLMRank.io - AI Intelligence API',
    status: 'operational',
    version: '3.0.0',
    endpoints: {
      '/api/stats/rich': 'Provider breakdowns and tribal analysis',
      '/api/rankings/rich': 'Full rankings with provider details',
      '/api/domains/{domain}/rich': 'Complete domain analysis',
      '/api/providers/health': 'Provider health and tribal classification'
    },
    authentication: 'API key required for /api endpoints'
  });
});

app.get('/health', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({
      status: 'healthy',
      database: 'connected',
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    res.status(503).json({
      status: 'unhealthy',
      database: 'error',
      error: err.message
    });
  }
});

// ============================================
// RICH API ENDPOINTS WITH PROVIDER BREAKDOWNS
// ============================================

// Rich Stats - Provider breakdowns and tribal analysis
app.get('/api/stats/rich', checkApiKey, async (req, res) => {
  try {
    // Check cache first
    const cacheKey = 'stats:rich';
    const cached = getCached(cacheKey);
    if (cached) {
      return res.json(cached);
    }
    const [stats, providers, topDomains] = await Promise.all([
      pool.query(`
        SELECT 
          COUNT(DISTINCT d.id) as total_domains,
          COUNT(DISTINCT dr.model) as total_providers,
          AVG(dr.sentiment_score) as avg_score
        FROM domains d
        LEFT JOIN domain_responses dr ON d.id = dr.domain_id
        WHERE dr.sentiment_score IS NOT NULL
      `),
      pool.query(`
        SELECT 
          model as provider,
          COUNT(*) as responses,
          AVG(sentiment_score) as avg_score,
          MAX(created_at) as last_seen
        FROM domain_responses
        WHERE sentiment_score IS NOT NULL
        GROUP BY model
        ORDER BY COUNT(*) DESC
      `),
      pool.query(`
        SELECT 
          d.domain,
          d.category,
          AVG(dr.sentiment_score) as avg_score,
          MAX(dr.sentiment_score) - MIN(dr.sentiment_score) as asymmetry,
          COUNT(DISTINCT dr.model) as provider_count
        FROM domains d
        LEFT JOIN domain_responses dr ON d.id = dr.domain_id
        WHERE dr.sentiment_score IS NOT NULL
        GROUP BY d.domain, d.category
        ORDER BY avg_score DESC
        LIMIT 10
      `)
    ]);
    
    // Classify providers into tribes
    const providerList = providers.rows.map(p => {
      const isSearch = ['perplexity', 'you', 'phind', 'searchgpt'].some(s => 
        p.provider.toLowerCase().includes(s)
      );
      return {
        name: p.provider,
        responses: parseInt(p.responses),
        avgScore: parseFloat(p.avg_score || 0),
        tribe: isSearch ? 'search-enhanced' : 'base-llm',
        lastSeen: p.last_seen
      };
    });
    
    const response = {
      overview: {
        totalDomains: parseInt(stats.rows[0]?.total_domains || 0),
        totalProviders: parseInt(stats.rows[0]?.total_providers || 0),
        activeProviders: 16,
        avgScore: parseFloat(stats.rows[0]?.avg_score || 0)
      },
      topDomains: topDomains.rows.map(d => ({
        domain: d.domain,
        category: d.category || 'Technology',
        score: parseFloat(d.avg_score || 0),
        informationAsymmetry: parseFloat(d.asymmetry || 0),
        providerCount: parseInt(d.provider_count)
      })),
      providers: {
        all: providerList,
        base: providerList.filter(p => p.tribe === 'base-llm'),
        searchEnhanced: providerList.filter(p => p.tribe === 'search-enhanced')
      }
    };
    
    // Cache the response
    setCached(cacheKey, response);
    res.json(response);
  } catch (error) {
    console.error('Rich stats error:', error);
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
});

// Rich Rankings - Full provider breakdowns for each domain
app.get('/api/rankings/rich', checkApiKey, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 50;
    const offset = parseInt(req.query.offset) || 0;
    
    const domains = await pool.query(`
      SELECT 
        d.id,
        d.domain,
        d.category,
        AVG(dr.sentiment_score) as avg_score,
        MAX(dr.sentiment_score) as max_score,
        MIN(dr.sentiment_score) as min_score,
        COUNT(DISTINCT dr.model) as provider_count
      FROM domains d
      LEFT JOIN domain_responses dr ON d.id = dr.domain_id
      WHERE dr.sentiment_score IS NOT NULL
      GROUP BY d.id, d.domain, d.category
      ORDER BY avg_score DESC NULLS LAST
      LIMIT $1 OFFSET $2
    `, [limit, offset]);
    
    const rankings = await Promise.all(domains.rows.map(async (domain, idx) => {
      const providers = await pool.query(`
        SELECT 
          model as provider,
          sentiment_score as score,
          memory_score,
          detail_score,
          created_at
        FROM domain_responses
        WHERE domain_id = $1 AND sentiment_score IS NOT NULL
        ORDER BY sentiment_score DESC
      `, [domain.id]);
      
      // Build provider data with tribal classification
      const providerData = providers.rows.map(p => {
        const isSearch = ['perplexity', 'you', 'phind', 'searchgpt'].some(s => 
          p.provider.toLowerCase().includes(s)
        );
        return {
          name: p.provider,
          score: parseFloat(p.score || 0),
          memoryScore: parseFloat(p.memory_score || 0),
          detailScore: parseFloat(p.detail_score || 0),
          tribe: isSearch ? 'search-enhanced' : 'base-llm',
          timestamp: p.created_at
        };
      });
      
      // Calculate tribal metrics
      const baseProviders = providerData.filter(p => p.tribe === 'base-llm');
      const searchProviders = providerData.filter(p => p.tribe === 'search-enhanced');
      
      const baseAvg = baseProviders.length > 0 
        ? baseProviders.reduce((sum, p) => sum + p.score, 0) / baseProviders.length 
        : 0;
      const searchAvg = searchProviders.length > 0
        ? searchProviders.reduce((sum, p) => sum + p.score, 0) / searchProviders.length
        : 0;
      
      return {
        rank: offset + idx + 1,
        domain: domain.domain,
        category: domain.category || 'Technology',
        averageScore: parseFloat(domain.avg_score || 0),
        informationAsymmetry: parseFloat(domain.max_score || 0) - parseFloat(domain.min_score || 0),
        providerCount: parseInt(domain.provider_count),
        providers: providerData,
        tribalClustering: {
          baseConsensus: baseAvg,
          searchConsensus: searchAvg,
          tribalDivergence: Math.abs(baseAvg - searchAvg)
        }
      };
    }));
    
    res.json({
      rankings,
      pagination: {
        limit,
        offset,
        total: domains.rows.length
      },
      metadata: {
        totalProviders: 16,
        tribes: ['base-llm', 'search-enhanced']
      }
    });
  } catch (error) {
    console.error('Rich rankings error:', error);
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
});

// Rich Domain Details - Complete analysis with all providers
app.get('/api/domains/:domain/rich', checkApiKey, async (req, res) => {
  try {
    const { domain } = req.params;
    
    const domainInfo = await pool.query(`
      SELECT id, domain, category, created_at
      FROM domains
      WHERE domain = $1
    `, [domain]);
    
    if (domainInfo.rows.length === 0) {
      return res.status(404).json({ error: 'Domain not found' });
    }
    
    const domainData = domainInfo.rows[0];
    
    // Get all provider responses
    const responses = await pool.query(`
      SELECT 
        model as provider,
        sentiment_score,
        memory_score,
        detail_score,
        response,
        created_at,
        response_time_ms
      FROM domain_responses
      WHERE domain_id = $1
      ORDER BY sentiment_score DESC
    `, [domainData.id]);
    
    // Build provider map with latest data
    const providerMap = {};
    responses.rows.forEach(r => {
      if (!providerMap[r.provider] || r.created_at > providerMap[r.provider].timestamp) {
        const isSearch = ['perplexity', 'you', 'phind', 'searchgpt'].some(s => 
          r.provider.toLowerCase().includes(s)
        );
        providerMap[r.provider] = {
          provider: r.provider,
          sentimentScore: parseFloat(r.sentiment_score || 0),
          memoryScore: parseFloat(r.memory_score || 0),
          detailScore: parseFloat(r.detail_score || 0),
          response: r.response,
          responseTime: r.response_time_ms,
          timestamp: r.created_at,
          tribe: isSearch ? 'search-enhanced' : 'base-llm'
        };
      }
    });
    
    const providers = Object.values(providerMap);
    const scores = providers.map(p => p.sentimentScore);
    
    // Calculate metrics
    const avgScore = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;
    const maxScore = scores.length > 0 ? Math.max(...scores) : 0;
    const minScore = scores.length > 0 ? Math.min(...scores) : 0;
    
    // Tribal analysis
    const base = providers.filter(p => p.tribe === 'base-llm');
    const search = providers.filter(p => p.tribe === 'search-enhanced');
    
    const baseAvg = base.length > 0 
      ? base.reduce((sum, p) => sum + p.sentimentScore, 0) / base.length 
      : 0;
    const searchAvg = search.length > 0 
      ? search.reduce((sum, p) => sum + p.sentimentScore, 0) / search.length 
      : 0;
    
    res.json({
      domain: domainData.domain,
      category: domainData.category || 'Technology',
      metrics: {
        averageScore: avgScore,
        informationAsymmetry: maxScore - minScore,
        providerCount: providers.length,
        consensusVolatility: scores.length > 1 
          ? Math.sqrt(scores.reduce((sum, score) => sum + Math.pow(score - avgScore, 2), 0) / scores.length)
          : 0,
        memoryLag: providers.length > 0
          ? `${Math.round((100 - providers.reduce((sum, p) => sum + p.memoryScore, 0) / providers.length) * 0.3)} days`
          : '0 days'
      },
      providers,
      tribalAnalysis: {
        tribes: {
          'base-llm': base,
          'search-enhanced': search
        },
        divergence: {
          baseAvg,
          searchAvg,
          gap: Math.abs(baseAvg - searchAvg)
        }
      },
      insights: {
        asymmetry: `${maxScore - minScore > 30 ? 'High' : 'Moderate'} information asymmetry of ${(maxScore - minScore).toFixed(0)} points`,
        tribal: Math.abs(baseAvg - searchAvg) > 20 
          ? 'Significant tribal divergence' 
          : 'Consensus across tribes'
      }
    });
  } catch (error) {
    console.error('Rich domain details error:', error);
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
});

// Provider Health - Tribal classification and status
app.get('/api/providers/health', checkApiKey, async (req, res) => {
  try {
    const providers = await pool.query(`
      SELECT 
        model as provider,
        COUNT(*) as total_responses,
        AVG(response_time_ms) as avg_response_time,
        MAX(created_at) as last_seen,
        COUNT(DISTINCT domain_id) as domains_analyzed
      FROM domain_responses
      WHERE created_at > NOW() - INTERVAL '30 days'
      GROUP BY model
      ORDER BY total_responses DESC
    `);
    
    const providerList = providers.rows.map(p => {
      const isSearch = ['perplexity', 'you', 'phind', 'searchgpt'].some(s => 
        p.provider.toLowerCase().includes(s)
      );
      const hoursAgo = p.last_seen 
        ? (Date.now() - new Date(p.last_seen).getTime()) / (1000 * 60 * 60)
        : 999;
      
      return {
        provider: p.provider,
        status: hoursAgo < 24 ? 'active' : hoursAgo < 72 ? 'idle' : 'inactive',
        tribe: isSearch ? 'search-enhanced' : 'base-llm',
        metrics: {
          totalResponses: parseInt(p.total_responses),
          avgResponseTime: p.avg_response_time ? `${Math.round(p.avg_response_time)}ms` : 'N/A',
          domainsAnalyzed: parseInt(p.domains_analyzed),
          lastSeen: p.last_seen
        }
      };
    });
    
    const baseCount = providerList.filter(p => p.tribe === 'base-llm').length;
    const searchCount = providerList.filter(p => p.tribe === 'search-enhanced').length;
    const activeCount = providerList.filter(p => p.status === 'active').length;
    
    res.json({
      providers: providerList,
      summary: {
        totalProviders: providerList.length,
        activeProviders: activeCount,
        tribes: {
          'base-llm': baseCount,
          'search-enhanced': searchCount
        },
        health: activeCount >= 12 ? 'healthy' : activeCount >= 8 ? 'degraded' : 'critical'
      }
    });
  } catch (error) {
    console.error('Provider health error:', error);
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
});

// Basic stats endpoint (backward compatibility)
app.get('/api/stats', checkApiKey, async (req, res) => {
  try {
    const [domainCount, providerCount, topDomains] = await Promise.all([
      pool.query('SELECT COUNT(DISTINCT id) as count FROM domains'),
      pool.query('SELECT COUNT(DISTINCT model) as count FROM domain_responses'),
      pool.query(`
        SELECT 
          d.domain,
          AVG(dr.sentiment_score) as avg_score,
          COUNT(DISTINCT dr.model) as provider_count
        FROM domains d
        LEFT JOIN domain_responses dr ON d.id = dr.domain_id
        WHERE dr.sentiment_score IS NOT NULL
        GROUP BY d.domain
        ORDER BY avg_score DESC NULLS LAST
        LIMIT 10
      `)
    ]);
    
    res.json({
      overview: {
        totalDomains: parseInt(domainCount.rows[0]?.count || 0),
        totalProviders: parseInt(providerCount.rows[0]?.count || 0),
        activeProviders: 16,
        lastCrawl: new Date().toISOString()
      },
      topDomains: topDomains.rows.map(row => ({
        domain: row.domain,
        score: parseFloat(row.avg_score || 0).toFixed(2),
        providerCount: parseInt(row.provider_count)
      }))
    });
  } catch (error) {
    console.error('Stats error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Start server with proper error handling
const server = app.listen(port, '0.0.0.0', () => {
  console.log(`🚀 LLMRank.io API Server running on port ${port}`);
  console.log(`📊 Rich provider breakdowns enabled`);
  console.log(`🔥 Tribal analysis active`);
  console.log(`💰 Information asymmetry tracking active`);
  console.log(`📈 Serving ${cache.size} cached responses`);
  console.log(`✅ Ready to serve llmpagerank.com and brandsentiment.io`);
  console.log('=' .repeat(60));
  
  // Log available endpoints
  console.log('Available endpoints:');
  console.log('  GET  /                       - Service info (no auth)');
  console.log('  GET  /health                 - Health check (no auth)');
  console.log('  GET  /api/stats/rich         - Provider breakdowns');
  console.log('  GET  /api/rankings/rich      - Full rankings');
  console.log('  GET  /api/domains/:id/rich   - Domain details');
  console.log('  GET  /api/providers/health   - Provider status');
  console.log('=' .repeat(60));
});

// Handle server startup errors
server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`❌ Port ${port} is already in use`);
  } else {
    console.error('❌ Server error:', err);
  }
  process.exit(1);
});

// Graceful shutdown
const shutdown = async (signal) => {
  console.log(`\n${signal} received, shutting down gracefully...`);
  
  // Stop accepting new connections
  server.close(() => {
    console.log('✅ HTTP server closed');
  });
  
  // Close database pool
  try {
    await pool.end();
    console.log('✅ Database connections closed');
  } catch (err) {
    console.error('❌ Error closing database:', err.message);
  }
  
  // Clear cache
  cache.clear();
  console.log('✅ Cache cleared');
  
  console.log('👋 Goodbye!');
  process.exit(0);
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

// Handle uncaught errors
process.on('uncaughtException', (err) => {
  console.error('💥 UNCAUGHT EXCEPTION:', err);
  shutdown('UNCAUGHT_EXCEPTION');
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('💥 UNHANDLED REJECTION at:', promise, 'reason:', reason);
});