import express, { Request, Response } from 'express';
import cors from 'cors';
import { Pool } from 'pg';
import winston from 'winston';
import { PredictiveAnalyticsEngine } from './PredictiveAnalyticsEngine';
import { MarketPositionPredictor } from './models/MarketPositionPredictor';
import { ThreatEarlyWarningSystem } from './models/ThreatEarlyWarningSystem';
import { BrandTrajectoryAnalyzer } from './models/BrandTrajectoryAnalyzer';
import { DisruptionPredictionEngine } from './models/DisruptionPredictionEngine';
import { ResourceAllocationOptimizer } from './models/ResourceAllocationOptimizer';
import { ConfidenceScoringSystem } from './models/ConfidenceScoringSystem';
import { TemporalAnalysisEngine } from './models/TemporalAnalysisEngine';

// Production logging configuration
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { 
    service: 'predictive-analytics',
    version: '1.0.0',
    environment: process.env.NODE_ENV || 'development'
  },
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    })
  ]
});

const app = express();
const port = process.env.PORT || 3007;

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? {
    rejectUnauthorized: true,
    ca: process.env.DATABASE_CA_CERT,
  } : false,
  max: 20,
  min: 5,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 30000
});

// CORS Configuration
const allowedOrigins = [
  'https://llmrank.io',
  'https://www.llmrank.io', 
  'https://llm-pagerank-frontend.onrender.com',
  'http://localhost:3000',
  'https://localhost:3000'
];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

app.use(express.json());

// Request logging middleware
app.use((req: Request, res: Response, next: any) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.info('HTTP Request', {
      method: req.method,
      url: req.url,
      status: res.statusCode,
      duration: `${duration}ms`,
      userAgent: req.get('User-Agent'),
      ip: req.ip
    });
  });
  next();
});

// Initialize Predictive Analytics Engine
const predictiveEngine = new PredictiveAnalyticsEngine(pool, logger);

logger.info('🔮 Starting Predictive Analytics Service...', {
  port,
  nodeEnv: process.env.NODE_ENV,
  serviceMode: 'predictive-analytics'
});

// Health check endpoint
app.get('/health', async (req: Request, res: Response) => {
  try {
    const healthStatus = {
      status: 'healthy',
      service: 'predictive-analytics',
      version: '1.0.0',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      environment: process.env.NODE_ENV,
      database: 'unknown',
      predictionModels: {
        marketPosition: true,
        threatWarning: true,
        brandTrajectory: true,
        disruption: true,
        resourceAllocation: true,
        confidenceScoring: true,
        temporalAnalysis: true
      }
    };

    // Database health check
    try {
      const dbResult = await pool.query('SELECT NOW()');
      healthStatus.database = 'connected';
    } catch (error) {
      healthStatus.database = 'error';
      healthStatus.status = 'degraded';
      logger.warn('Database health check failed', { error: error.message });
    }

    res.json(healthStatus);
    
  } catch (error) {
    logger.error('Health check failed', { error: error.message });
    res.status(503).json({
      status: 'unhealthy',
      service: 'predictive-analytics',
      timestamp: new Date().toISOString(),
      error: error.message
    });
  }
});

// Market Position Prediction API
app.post('/api/predictions/market-position', async (req: Request, res: Response) => {
  try {
    const { domain, timeframe, categories } = req.body;
    
    if (!domain) {
      return res.status(400).json({ error: 'Domain is required' });
    }

    const predictions = await predictiveEngine.predictMarketPosition(domain, {
      timeframe: timeframe || '3months',
      categories: categories || ['all'],
      includeConfidence: true,
      includeTrends: true
    });

    res.json({
      success: true,
      predictions,
      metadata: {
        generated_at: new Date().toISOString(),
        model: 'market-position-v1.0',
        confidence_method: 'multi-model-consensus'
      }
    });

  } catch (error) {
    logger.error('Market position prediction failed', { error: error.message, domain: req.body.domain });
    res.status(500).json({ error: 'Prediction generation failed' });
  }
});

// Competitive Threat Early Warning API
app.post('/api/predictions/threat-warning', async (req: Request, res: Response) => {
  try {
    const { domain, sensitivity } = req.body;
    
    if (!domain) {
      return res.status(400).json({ error: 'Domain is required' });
    }

    const threats = await predictiveEngine.generateThreatWarnings(domain, {
      sensitivity: sensitivity || 'medium',
      lookAhead: '30days',
      includeEmergingCompetitors: true,
      riskThreshold: 0.7
    });

    res.json({
      success: true,
      threats,
      metadata: {
        generated_at: new Date().toISOString(),
        model: 'threat-warning-v1.0',
        sensitivity_level: sensitivity || 'medium'
      }
    });

  } catch (error) {
    logger.error('Threat warning generation failed', { error: error.message, domain: req.body.domain });
    res.status(500).json({ error: 'Threat analysis failed' });
  }
});

// Brand Trajectory Analysis API
app.post('/api/predictions/brand-trajectory', async (req: Request, res: Response) => {
  try {
    const { domain, analysisDepth } = req.body;
    
    if (!domain) {
      return res.status(400).json({ error: 'Domain is required' });
    }

    const trajectory = await predictiveEngine.analyzeBrandTrajectory(domain, {
      depth: analysisDepth || 'comprehensive',
      timeHorizon: '12months',
      includeInflectionPoints: true,
      includeMomentumScores: true
    });

    res.json({
      success: true,
      trajectory,
      metadata: {
        generated_at: new Date().toISOString(),
        model: 'brand-trajectory-v1.0',
        analysis_depth: analysisDepth || 'comprehensive'
      }
    });

  } catch (error) {
    logger.error('Brand trajectory analysis failed', { error: error.message, domain: req.body.domain });
    res.status(500).json({ error: 'Trajectory analysis failed' });
  }
});

// Disruption Prediction API
app.post('/api/predictions/disruption-forecast', async (req: Request, res: Response) => {
  try {
    const { category, timeframe, riskFactors } = req.body;
    
    if (!category) {
      return res.status(400).json({ error: 'Category is required' });
    }

    const disruptions = await predictiveEngine.predictDisruptions(category, {
      timeframe: timeframe || '6months',
      riskFactors: riskFactors || ['technology', 'market', 'regulatory'],
      confidenceThreshold: 0.6,
      includeEarlySignals: true
    });

    res.json({
      success: true,
      disruptions,
      metadata: {
        generated_at: new Date().toISOString(),
        model: 'disruption-prediction-v1.0',
        category,
        timeframe: timeframe || '6months'
      }
    });

  } catch (error) {
    logger.error('Disruption prediction failed', { error: error.message, category: req.body.category });
    res.status(500).json({ error: 'Disruption analysis failed' });
  }
});

// Resource Allocation Recommendations API
app.post('/api/predictions/resource-allocation', async (req: Request, res: Response) => {
  try {
    const { domain, budget, objectives } = req.body;
    
    if (!domain || !budget) {
      return res.status(400).json({ error: 'Domain and budget are required' });
    }

    const recommendations = await predictiveEngine.optimizeResourceAllocation(domain, {
      budget,
      objectives: objectives || ['growth', 'defense', 'innovation'],
      timeframe: '12months',
      riskTolerance: 'medium',
      includeROIProjections: true
    });

    res.json({
      success: true,
      recommendations,
      metadata: {
        generated_at: new Date().toISOString(),
        model: 'resource-allocation-v1.0',
        budget,
        timeframe: '12months'
      }
    });

  } catch (error) {
    logger.error('Resource allocation optimization failed', { error: error.message, domain: req.body.domain });
    res.status(500).json({ error: 'Resource optimization failed' });
  }
});

// Confidence Scoring API
app.get('/api/predictions/confidence/:predictionId', async (req: Request, res: Response) => {
  try {
    const { predictionId } = req.params;
    const { includeBreakdown } = req.query;
    
    const confidence = await predictiveEngine.calculateConfidenceScore(predictionId, {
      includeFactorBreakdown: includeBreakdown === 'true',
      includeHistoricalAccuracy: true,
      includeDataQuality: true
    });

    res.json({
      success: true,
      confidence,
      metadata: {
        generated_at: new Date().toISOString(),
        model: 'confidence-scoring-v1.0',
        prediction_id: predictionId
      }
    });

  } catch (error) {
    logger.error('Confidence scoring failed', { error: error.message, predictionId: req.params.predictionId });
    res.status(500).json({ error: 'Confidence calculation failed' });
  }
});

// Temporal Analysis API
app.post('/api/predictions/temporal-analysis', async (req: Request, res: Response) => {
  try {
    const { domain, timeHorizons } = req.body;
    
    if (!domain) {
      return res.status(400).json({ error: 'Domain is required' });
    }

    const analysis = await predictiveEngine.performTemporalAnalysis(domain, {
      shortTerm: '1month',
      mediumTerm: '6months', 
      longTerm: '2years',
      customHorizons: timeHorizons || [],
      includeUncertaintyBands: true,
      includeScenarioModeling: true
    });

    res.json({
      success: true,
      analysis,
      metadata: {
        generated_at: new Date().toISOString(),
        model: 'temporal-analysis-v1.0',
        time_horizons: ['1month', '6months', '2years']
      }
    });

  } catch (error) {
    logger.error('Temporal analysis failed', { error: error.message, domain: req.body.domain });
    res.status(500).json({ error: 'Temporal analysis failed' });
  }
});

// Comprehensive Prediction Dashboard API
app.post('/api/predictions/dashboard', async (req: Request, res: Response) => {
  try {
    const { domain, includeAll } = req.body;
    
    if (!domain) {
      return res.status(400).json({ error: 'Domain is required' });
    }

    const dashboard = await predictiveEngine.generatePredictionDashboard(domain, {
      includeMarketPosition: true,
      includeThreatWarnings: true,
      includeBrandTrajectory: true,
      includeDisruptions: true,
      includeResourceOptimization: true,
      includeConfidenceMetrics: true,
      includeTemporalAnalysis: true,
      maxAge: '1hour' // Cache for 1 hour
    });

    res.json({
      success: true,
      dashboard,
      metadata: {
        generated_at: new Date().toISOString(),
        model: 'comprehensive-dashboard-v1.0',
        cache_duration: '1hour',
        domain
      }
    });

  } catch (error) {
    logger.error('Dashboard generation failed', { error: error.message, domain: req.body.domain });
    res.status(500).json({ error: 'Dashboard generation failed' });
  }
});

// Real-time Prediction Updates API (Server-Sent Events)
app.get('/api/predictions/stream/:domain', (req: Request, res: Response) => {
  const { domain } = req.params;
  
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Cache-Control'
  });

  // Send initial connection confirmation
  res.write(`data: ${JSON.stringify({ 
    type: 'connection', 
    message: `Connected to predictions for ${domain}`,
    timestamp: new Date().toISOString()
  })}\n\n`);

  // Set up real-time prediction updates
  const updateInterval = setInterval(async () => {
    try {
      const quickUpdate = await predictiveEngine.getQuickPredictionUpdate(domain);
      res.write(`data: ${JSON.stringify({
        type: 'prediction_update',
        domain,
        data: quickUpdate,
        timestamp: new Date().toISOString()
      })}\n\n`);
    } catch (error) {
      logger.error('Prediction stream update failed', { error: error.message, domain });
    }
  }, 30000); // Update every 30 seconds

  // Clean up on client disconnect
  req.on('close', () => {
    clearInterval(updateInterval);
    logger.info('Prediction stream closed', { domain });
  });
});

// Batch Prediction Analysis API
app.post('/api/predictions/batch', async (req: Request, res: Response) => {
  try {
    const { domains, analysisTypes } = req.body;
    
    if (!domains || !Array.isArray(domains)) {
      return res.status(400).json({ error: 'Domains array is required' });
    }

    const batchResults = await predictiveEngine.performBatchAnalysis(domains, {
      analysisTypes: analysisTypes || ['market_position', 'threat_warning', 'trajectory'],
      parallelProcessing: true,
      maxConcurrency: 10,
      timeoutPerDomain: 30000
    });

    res.json({
      success: true,
      results: batchResults,
      metadata: {
        generated_at: new Date().toISOString(),
        total_domains: domains.length,
        analysis_types: analysisTypes || ['market_position', 'threat_warning', 'trajectory']
      }
    });

  } catch (error) {
    logger.error('Batch prediction analysis failed', { error: error.message });
    res.status(500).json({ error: 'Batch analysis failed' });
  }
});

// Graceful shutdown handling
let isShuttingDown = false;
let server: any;

const gracefulShutdown = async (signal: string) => {
  if (isShuttingDown) {
    logger.warn('Shutdown already in progress, forcing exit');
    process.exit(1);
  }
  
  isShuttingDown = true;
  logger.info(`${signal} received, starting graceful shutdown`);

  if (server) {
    server.close(async () => {
      logger.info('HTTP server closed');
      
      try {
        await pool.end();
        logger.info('Database connections closed');
        
        setTimeout(() => {
          logger.warn('Forced shutdown after timeout');
          process.exit(1);
        }, 10000);
        
        logger.info('Graceful shutdown completed');
        process.exit(0);
      } catch (error) {
        logger.error('Error during shutdown', { error: error.message });
        process.exit(1);
      }
    });
  }
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception', { error: error.message, stack: error.stack });
  gracefulShutdown('UNCAUGHT_EXCEPTION');
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection', { reason, promise });
  gracefulShutdown('UNHANDLED_REJECTION');
});

server = app.listen(port, () => {
  logger.info(`🔮 Predictive Analytics Service running on port ${port}`, {
    port,
    endpoints: {
      marketPosition: 'POST /api/predictions/market-position',
      threatWarning: 'POST /api/predictions/threat-warning', 
      brandTrajectory: 'POST /api/predictions/brand-trajectory',
      disruptionForecast: 'POST /api/predictions/disruption-forecast',
      resourceAllocation: 'POST /api/predictions/resource-allocation',
      confidenceScoring: 'GET /api/predictions/confidence/:id',
      temporalAnalysis: 'POST /api/predictions/temporal-analysis',
      dashboard: 'POST /api/predictions/dashboard',
      realTimeStream: 'GET /api/predictions/stream/:domain',
      batchAnalysis: 'POST /api/predictions/batch',
      health: 'GET /health'
    }
  });
});