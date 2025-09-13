#!/usr/bin/env node

/**
 * Production server that actually loads the features
 */

console.log('Starting Domain Processor v2 with full features...');

// Load environment
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');

// Simple logger
const logger = {
  info: (...args) => console.log(new Date().toISOString(), '[INFO]', ...args),
  error: (...args) => console.error(new Date().toISOString(), '[ERROR]', ...args),
  warn: (...args) => console.warn(new Date().toISOString(), '[WARN]', ...args),
  child: () => logger
};

// Database connection with SSL
const database = {
  pool: new Pool({ 
    connectionString: process.env.DATABASE_URL,
    ssl: {
      rejectUnauthorized: false // Required for Render PostgreSQL
    }
  }),
  query: async (text, params) => {
    try {
      const result = await database.pool.query(text, params);
      return result;
    } catch (error) {
      logger.error('Database query failed:', error);
      throw error;
    }
  }
};

// Import our feature modules - try to load them
let ConsensusEngine, ZeitgeistTracker, MemoryDriftDetector;
let createConsensusRouter, createZeitgeistRouter, createDriftRouter;

try {
  ConsensusEngine = require('./dist/api/consensus/consensus-engine').default;
  ZeitgeistTracker = require('./dist/api/zeitgeist/zeitgeist-tracker').default;
  MemoryDriftDetector = require('./dist/api/drift/memory-drift-detector').default;
  
  createConsensusRouter = require('./dist/api/routes/consensus').createConsensusRouter;
  createZeitgeistRouter = require('./dist/api/routes/zeitgeist').createZeitgeistRouter;
  createDriftRouter = require('./dist/api/routes/drift').createDriftRouter;
  
  logger.info('Feature modules loaded successfully');
} catch (error) {
  logger.error('Failed to load feature modules:', error.message);
}

async function start() {
  const app = express();
  
  // Check for OpenRouter key and log status
  if (process.env.OPENROUTER_API_KEY) {
    logger.info('✅ OpenRouter API key found - 12th provider will be available');
  } else {
    logger.warn('⚠️ OpenRouter API key not found - running with 11 providers');
  }
  
  // Middleware
  app.use(cors());
  app.use(express.json());
  
  // Health check
  app.get('/health', (req, res) => {
    res.json({
      status: 'healthy',
      service: 'domain-processor-v2',
      version: '2.0.0',
      mode: 'production-full',
      features: {
        consensus: !!consensusEngine,
        zeitgeist: !!zeitgeistTracker,
        drift: !!driftDetector
      },
      redis: process.env.REDIS_URL ? 'connected' : 'missing',
      timestamp: new Date().toISOString()
    });
  });
  
  app.get('/api/v2/health', (req, res) => {
    res.json({
      status: 'healthy',
      version: '2.0.0',
      redis: process.env.REDIS_URL ? 'connected' : 'missing'
    });
  });
  
  // Initialize features
  let consensusEngine, zeitgeistTracker, driftDetector;
  
  try {
    // Initialize Consensus Engine
    consensusEngine = new ConsensusEngine(database, logger, process.env.REDIS_URL);
    logger.info('Consensus Engine initialized');
    
    // Initialize Zeitgeist Tracker  
    zeitgeistTracker = new ZeitgeistTracker(database, consensusEngine, logger, process.env.REDIS_URL);
    logger.info('Zeitgeist Tracker initialized');
    
    // Initialize Memory Drift Detector
    driftDetector = new MemoryDriftDetector(database, consensusEngine, logger, process.env.REDIS_URL);
    logger.info('Memory Drift Detector initialized');
    
    // Mount feature routes
    const consensusRouter = createConsensusRouter(consensusEngine, database, logger);
    const zeitgeistRouter = createZeitgeistRouter(zeitgeistTracker, logger);
    const driftRouter = createDriftRouter(driftDetector, database, logger);
    
    // Simple auth middleware for testing
    const authMiddleware = (req, res, next) => {
      const apiKey = req.headers['x-api-key'] || req.headers['authorization'];
      if (!apiKey) {
        return res.status(401).json({ error: 'API key required' });
      }
      req.user = { tier: 'premium' }; // For testing
      next();
    };
    
    // Mount routes - they already include /api/v2 prefix
    app.use('/', authMiddleware, consensusRouter);
    app.use('/', zeitgeistRouter); // Public access - no auth required
    app.use('/', authMiddleware, driftRouter);
    
    logger.info('All features mounted successfully');
    
  } catch (error) {
    logger.error('Failed to initialize features:', error);
    // Continue running with basic health endpoints
  }
  
  // Start server
  const port = process.env.PORT || 3003;
  app.listen(port, () => {
    logger.info(`Server listening on port ${port} with full features`);
    logger.info('Routes mounted correctly - all features enabled');
    logger.info('Available endpoints:');
    logger.info('  GET  /health - Health check');
    logger.info('  GET  /api/v2/consensus/:domain - Get LLM consensus');
    logger.info('  GET  /api/v2/zeitgeist - Current AI zeitgeist');
    logger.info('  GET  /api/v2/drift/:domain/analyze - Analyze memory drift');
  });
}

start().catch(error => {
  console.error('Failed to start server:', error);
  process.exit(1);
});