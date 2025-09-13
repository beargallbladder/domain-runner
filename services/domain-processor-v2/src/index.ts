import 'dotenv/config';
import express, { Application } from 'express';
import cors from 'cors';
import { DIContainer } from './core/container';
import { ConfigLoader } from './config/config-loader';
import { createDomainsRouter } from './api/routes/domains';
import { createHealthRouter } from './api/routes/health';
import { createLegacyRouter } from './api/routes/legacy';
import { createPublicRealRouter } from './api/routes/public-real';
import { createPremiumRouter } from './api/routes/premium';
import { createJuiceFeedbackRouter } from './api/juice-feedback';
import { createConsensusRouter } from './api/routes/consensus';
import { createZeitgeistRouter } from './api/routes/zeitgeist';
import { createDriftRouter } from './api/routes/drift';
import { EnterpriseNeuralGateway } from './api/enterprise-gateway';
import ConsensusEngine from './api/consensus/consensus-engine';
import ZeitgeistTracker from './api/zeitgeist/zeitgeist-tracker';
import MemoryDriftDetector from './api/drift/memory-drift-detector';
import ClosedLoopEngine from './core/closed-loop-engine';
import { AuthMiddleware } from './middleware/auth';
import { RateLimiter } from './middleware/rate-limit';
import { SecurityMiddleware } from './middleware/security';
import * as http from 'http';

async function bootstrap() {
  // Load configuration
  const config = ConfigLoader.load(process.env.CONFIG_PATH);
  
  // Validate configuration
  const configErrors = ConfigLoader.validate(config);
  if (configErrors.length > 0) {
    console.error('Configuration errors:', configErrors);
    process.exit(1);
  }

  // Initialize dependency injection container
  const container = await DIContainer.initialize(config);
  const { logger, monitoring, database, providerRegistry, jobQueue, domainProcessor } = container;

  logger.info('Starting Domain Processor v2 (Production-Ready)');
  
  // Get Redis config (fallback to localhost for dev)
  logger.info('Redis URL from env:', { status: process.env.REDIS_URL ? 'Found' : 'Not found' });
  
  const redisConfig = process.env.REDIS_URL || 'redis://localhost:6379';
  logger.info('Using Redis config:', { host: typeof redisConfig === 'string' ? redisConfig.split('@')[1] || 'localhost' : redisConfig });
  
  // Check if we're in production without Redis
  const isProduction = process.env.NODE_ENV === 'production';
  const hasRedis = process.env.REDIS_URL && process.env.REDIS_URL !== '';
  
  if (isProduction && !hasRedis) {
    logger.warn('Running in production without Redis - features will be limited');
  }

  // Initialize services with try-catch to allow startup even if Redis fails
  let neuralGateway: any, closedLoopEngine: any, consensusEngine: any, zeitgeistTracker: any, driftDetector: any;
  
  // Only initialize Redis-dependent services if Redis is available
  if (!isProduction || hasRedis) {
    try {
      // Initialize Enterprise Neural Gateway
      neuralGateway = new EnterpriseNeuralGateway(
        database, 
        logger,
        redisConfig
      );
      logger.info('Enterprise Neural Gateway initialized');
    } catch (error) {
      logger.error('Failed to initialize Enterprise Neural Gateway', error);
    }
  } else {
    logger.warn('Skipping Enterprise Neural Gateway initialization - no Redis');
  }
  
  if (!isProduction || hasRedis) {
    try {
      // Initialize Closed-Loop Engine
      closedLoopEngine = new ClosedLoopEngine(
        database,
        logger,
        redisConfig
      );
      logger.info('Closed-Loop Engine initialized');
    } catch (error) {
      logger.error('Failed to initialize Closed-Loop Engine', error);
    }
  } else {
    logger.warn('Skipping Closed-Loop Engine initialization - no Redis');
  }
  
  if (!isProduction || hasRedis) {
    try {
      // Initialize Consensus Engine
      consensusEngine = new ConsensusEngine(
        database,
        logger,
        redisConfig
      );
      logger.info('Consensus Engine initialized');
    } catch (error) {
      logger.error('Failed to initialize Consensus Engine', error);
    }
  } else {
    logger.warn('Skipping Consensus Engine initialization - no Redis');
  }
  
  if (!isProduction || hasRedis) {
    try {
      // Initialize Zeitgeist Tracker
      zeitgeistTracker = new ZeitgeistTracker(
        database,
        consensusEngine!,
        logger,
        redisConfig
      );
      logger.info('Zeitgeist Tracker initialized');
    } catch (error) {
      logger.error('Failed to initialize Zeitgeist Tracker', error);
    }
  } else {
    logger.warn('Skipping Zeitgeist Tracker initialization - no Redis');
  }
  
  if (!isProduction || hasRedis) {
    try {
      // Initialize Memory Drift Detector
      driftDetector = new MemoryDriftDetector(
        database,
        consensusEngine!,
        logger,
        redisConfig
      );
      logger.info('Memory Drift Detector initialized');
    } catch (error) {
      logger.error('Failed to initialize Memory Drift Detector', error);
    }
  } else {
    logger.warn('Skipping Memory Drift Detector initialization - no Redis');
  }
  
  // Connect engines for coordination (only if initialized)
  if (closedLoopEngine) {
    closedLoopEngine.on('crawl:immediate', (domain: string) => {
      logger.info('Immediate crawl triggered by juice spike', { domain });
      domainProcessor.processDomain({ domain } as any);
    });
    
    closedLoopEngine.on('crawl:batch', (domains: string[]) => {
      logger.info('Batch crawl triggered', { count: domains.length });
      domains.forEach(domain => {
        jobQueue.add({ type: 'crawl', data: { domain } } as any);
      });
    });
  }

  // Initialize middleware
  const auth = new AuthMiddleware(logger);
  const rateLimiter = new RateLimiter(logger);
  const security = new SecurityMiddleware(logger);

  // Create Express app
  const app: Application = express();
  
  // Security middleware - MUST be first
  app.disable('x-powered-by');
  app.use(security.headers());
  app.use(security.cors());
  
  // Body parsing with size limits
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: false, limit: '10mb' }));

  // Request logging and monitoring
  app.use(security.requestLogger());

  // Input validation and security checks
  app.use(security.validateInput());
  app.use(security.preventSQLInjection());

  // Health check endpoint (public, high rate limit)
  app.use('/health', rateLimiter.create(RateLimiter.configs.health));
  app.use('/api/v2/health', rateLimiter.create(RateLimiter.configs.health));
  
  // API v2 routes with authentication and rate limiting
  const domainsRouter = createDomainsRouter(database, domainProcessor, jobQueue, logger);
  const healthRouter = createHealthRouter(monitoring, providerRegistry, database);
  const publicRouter = createPublicRealRouter(database, logger);
  const premiumRouter = neuralGateway ? createPremiumRouter(neuralGateway, database, logger) : express.Router();
  const juiceFeedbackRouter = createJuiceFeedbackRouter(database, logger);
  const consensusRouter = consensusEngine ? createConsensusRouter(consensusEngine, database, logger) : express.Router();
  const zeitgeistRouter = zeitgeistTracker ? createZeitgeistRouter(zeitgeistTracker, logger) : express.Router();
  const driftRouter = driftDetector ? createDriftRouter(driftDetector, database, logger) : express.Router();
  
  // Public endpoints for llmpagerank.com (require special API key)
  app.use('/', 
    auth.authenticate,
    auth.requirePartner,
    rateLimiter.create(RateLimiter.configs.api),
    publicRouter
  );
  
  // Premium endpoints for brandsentiment.io (require premium auth)
  app.use('/', 
    auth.authenticate,
    auth.requirePremium,
    rateLimiter.create(RateLimiter.configs.api),
    premiumRouter
  );
  
  // Juice feedback endpoints (closed-loop system)
  app.use('/',
    auth.authenticate,
    auth.requirePremium,
    rateLimiter.create(RateLimiter.configs.api),
    juiceFeedbackRouter
  );
  
  // Consensus API endpoints (tiered access)
  app.use('/',
    auth.authenticate,
    auth.optional, // Allow all tiers but track usage
    rateLimiter.create(RateLimiter.configs.api),
    consensusRouter
  );
  
  // Zeitgeist API endpoints (public with higher rate limits)
  app.use('/',
    auth.optional, // Public access for viral content
    rateLimiter.create(RateLimiter.configs.public),
    zeitgeistRouter
  );
  
  // Memory Drift API endpoints (enterprise only)
  app.use('/',
    auth.authenticate,
    auth.requireEnterprise,
    rateLimiter.create(RateLimiter.configs.api),
    driftRouter
  );
  
  // Public endpoints (no auth required but rate limited)
  app.use('/api/v2/health', healthRouter);
  app.use('/api/v2/api-keys', 
    auth.public,
    rateLimiter.create(RateLimiter.configs.public),
    healthRouter
  );
  
  // Protected endpoints (require API key)
  app.use('/api/v2/process-pending-domains',
    auth.authenticate,
    rateLimiter.create(RateLimiter.configs.processing),
    domainsRouter
  );
  
  app.use('/api/v2/ultra-fast-process',
    auth.authenticate,
    rateLimiter.create(RateLimiter.configs.processing),
    domainsRouter
  );
  
  app.use('/api/v2/domains',
    auth.authenticate,
    rateLimiter.create(RateLimiter.configs.api),
    domainsRouter
  );
  
  app.use('/api/v2/stats',
    auth.optional,
    rateLimiter.create(RateLimiter.configs.api),
    domainsRouter
  );
  
  app.use('/api/v2/provider-usage',
    auth.optional,
    rateLimiter.create(RateLimiter.configs.api),
    healthRouter
  );
  
  app.use('/api/v2/metrics',
    auth.authenticate,
    rateLimiter.create(RateLimiter.configs.api),
    healthRouter
  );
  
  app.use('/api/v2/alerts',
    auth.authenticate,
    auth.requireAdmin,
    rateLimiter.create(RateLimiter.configs.admin),
    healthRouter
  );
  
  // Legacy routes (backward compatibility) - require auth
  app.use('/', 
    auth.authenticate,
    rateLimiter.create(RateLimiter.configs.api),
    createLegacyRouter(database, domainProcessor, providerRegistry, logger)
  );

  // Error handling middleware - use security error handler
  app.use(security.errorHandler());

  // Start server with WebSocket support
  const port = process.env.PORT || 3003;
  const server = http.createServer(app);
  
  // Attach WebSocket server for real-time updates (only if closedLoopEngine exists)
  if (closedLoopEngine) {
    server.on('upgrade', (request, socket, head) => {
      const pathname = request.url;
      
      if (pathname === '/ws/realtime') {
        closedLoopEngine.handleWebSocketUpgrade(request, socket, head);
      } else {
        socket.destroy();
      }
    });
  }
  
  server.listen(port, () => {
    logger.info(`Server listening on port ${port}`);
    logger.info('Endpoints:');
    logger.info(`  POST /api/v2/process-pending-domains - Process domains`);
    logger.info(`  POST /api/v2/ultra-fast-process - Ultra-fast processing`);
    logger.info(`  GET  /api/v2/domains/:id - Get domain info`);
    logger.info(`  POST /api/v2/domains/:id/retry - Retry failed domain`);
    logger.info(`  GET  /api/v2/stats - Domain statistics`);
    logger.info(`  GET  /api/v2/health - Health check`);
    logger.info(`  GET  /api/v2/api-keys - API key status`);
    logger.info(`  GET  /api/v2/provider-usage - Provider metrics`);
    logger.info(`  GET  /api/v2/metrics - System metrics`);
    logger.info(`  GET  /api/v2/alerts - Active alerts`);
    logger.info('Closed-Loop Endpoints:');
    logger.info(`  POST /api/v2/juice-feedback - Receive juice scores`);
    logger.info(`  POST /api/v2/juice-feedback/batch - Batch juice feedback`);
    logger.info(`  GET  /api/v2/crawl-priorities - Current priorities`);
    logger.info(`  POST /api/v2/request-grounding - Request grounding`);
    logger.info(`  WS   /ws/realtime - WebSocket real-time updates`);
    logger.info('Consensus API Endpoints:');
    logger.info(`  GET  /api/v2/consensus/:domain - Get LLM consensus`);
    logger.info(`  POST /api/v2/consensus/batch - Batch consensus`);
    logger.info(`  GET  /api/v2/consensus/:domain/trend - Historical trend`);
    logger.info(`  GET  /api/v2/consensus/providers - List providers`);
    logger.info(`  GET  /api/v2/consensus/search - Search with consensus`);
    logger.info('Zeitgeist API Endpoints:');
    logger.info(`  GET  /api/v2/zeitgeist - Current AI zeitgeist`);
    logger.info(`  GET  /api/v2/zeitgeist/trending - Trending domains`);
    logger.info(`  GET  /api/v2/zeitgeist/viral-content - Ready viral content`);
    logger.info(`  GET  /api/v2/zeitgeist/insights - AI insights`);
    logger.info(`  GET  /api/v2/zeitgeist/feed - Real-time feed`);
    logger.info('Memory Drift API Endpoints (Enterprise):');
    logger.info(`  GET  /api/v2/drift/:domain/analyze - Analyze drift`);
    logger.info(`  GET  /api/v2/drift/alerts - Get active alerts`);
    logger.info(`  POST /api/v2/drift/subscribe - Subscribe to alerts`);
    logger.info(`  GET  /api/v2/drift/:domain/report - Full drift report`);
    logger.info(`  POST /api/v2/drift/:domain/alert - Create manual alert`);
    logger.info(`  GET  /api/v2/drift/:domain/timeline - Drift timeline`);
    logger.info(`  POST /api/v2/drift/batch - Batch analysis`);
  });

  // Graceful shutdown
  const shutdown = async (signal: string) => {
    logger.info(`Received ${signal}, starting graceful shutdown`);
    
    // Stop accepting new connections
    server.close(() => {
      logger.info('HTTP server closed');
    });

    // Shutdown engines (only if they exist)
    if (closedLoopEngine) {
      await closedLoopEngine.shutdown();
      logger.info('Closed-Loop Engine shutdown complete');
    }
    
    if (consensusEngine) {
      await consensusEngine.shutdown();
      logger.info('Consensus Engine shutdown complete');
    }
    
    if (zeitgeistTracker) {
      await zeitgeistTracker.shutdown();
      logger.info('Zeitgeist Tracker shutdown complete');
    }
    
    if (driftDetector) {
      await driftDetector.shutdown();
      logger.info('Memory Drift Detector shutdown complete');
    }
    
    // Shutdown container
    await DIContainer.shutdown();
    
    process.exit(0);
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));

  // Periodic tasks
  setInterval(async () => {
    // Check for alerts
    const alerts = await monitoring.checkAlerts();
    if (alerts.length > 0) {
      logger.warn(`Active alerts: ${alerts.length}`, { alerts });
    }

    // Log queue stats
    const queueStats = jobQueue.getStats();
    logger.info('Queue statistics', queueStats);
    
    // Log closed-loop metrics (only if engine exists)
    if (closedLoopEngine) {
      const loopMetrics = closedLoopEngine.getMetrics();
      logger.info('Closed-loop metrics', loopMetrics);
    }
  }, 60000); // Every minute

  return app;
}

// Start the application
bootstrap().catch((error) => {
  console.error('Failed to start application:', error);
  process.exit(1);
});// Force redeploy: Fri Aug  1 20:21:13 PDT 2025
