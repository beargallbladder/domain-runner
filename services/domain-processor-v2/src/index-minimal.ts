import 'dotenv/config';
import express, { Application } from 'express';
import cors from 'cors';
import { DIContainer } from './core/container';
import { ConfigLoader } from './config/config-loader';
import { createHealthRouter } from './api/routes/health';
import { AuthMiddleware } from './middleware/auth';
import { RateLimiter } from './middleware/rate-limit';
import { SecurityMiddleware } from './middleware/security';
import * as http from 'http';

async function bootstrap() {
  console.log('Starting minimal Domain Processor v2...');
  console.log('Environment:', {
    NODE_ENV: process.env.NODE_ENV,
    PORT: process.env.PORT,
    REDIS_URL: process.env.REDIS_URL ? 'Set' : 'Not set',
    DATABASE_URL: process.env.DATABASE_URL ? 'Set' : 'Not set'
  });

  // Load configuration
  const config = ConfigLoader.load(process.env.CONFIG_PATH);
  
  // Initialize minimal container
  const container = await DIContainer.initialize(config);
  const { logger, monitoring, database, providerRegistry } = container;

  logger.info('Starting Domain Processor v2 (Minimal Mode)');

  // Initialize middleware
  const auth = new AuthMiddleware(logger);
  const rateLimiter = new RateLimiter(logger);
  const security = new SecurityMiddleware(logger);

  // Create Express app
  const app: Application = express();
  
  // Security middleware
  app.disable('x-powered-by');
  app.use(security.headers());
  app.use(security.cors());
  
  // Body parsing
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: false, limit: '10mb' }));

  // Request logging
  app.use(security.requestLogger());

  // Health check endpoint
  const healthRouter = createHealthRouter(monitoring, providerRegistry, database);
  app.use('/api/v2/health', healthRouter);
  app.use('/health', healthRouter);
  
  // Basic info endpoint
  app.get('/', (req, res) => {
    res.json({
      service: 'Domain Processor v2',
      version: '2.0.0',
      status: 'running',
      mode: 'minimal',
      features: [
        'LLM Consensus API (Redis required)',
        'AI Zeitgeist Tracker (Redis required)', 
        'Memory Drift Alert System (Redis required)'
      ],
      message: 'Service is running in minimal mode. Redis connection required for full features.'
    });
  });

  // Error handling
  app.use(security.errorHandler());

  // Start server
  const port = process.env.PORT || 3003;
  const server = http.createServer(app);
  
  server.listen(port, () => {
    logger.info(`Server listening on port ${port} (Minimal Mode)`);
    logger.info('Health check available at /health and /api/v2/health');
  });

  // Graceful shutdown
  const shutdown = async (signal: string) => {
    logger.info(`Received ${signal}, starting graceful shutdown`);
    
    server.close(() => {
      logger.info('HTTP server closed');
    });
    
    await DIContainer.shutdown();
    process.exit(0);
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));

  return app;
}

// Start the application
bootstrap().catch((error) => {
  console.error('Failed to start application:', error);
  process.exit(1);
});