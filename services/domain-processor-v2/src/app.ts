/**
 * Domain Processor v2 - Main Application
 * Integrates LLM Consensus API, AI Zeitgeist Tracker, and Memory Drift Alert System
 */

import express, { Application, Request, Response } from 'express';
import { createServer } from 'http';
import helmet from 'helmet';
import cors from 'cors';
import compression from 'compression';
import { Logger } from './utils/logger';
import { PostgresService } from './modules/database/postgres-service';
import { ProviderRegistry } from './modules/llm-providers/provider-registry';
import { MonitoringService } from './modules/monitoring/monitoring-service';
import { ClosedLoopEngine } from './core/closed-loop-engine';
import { EnterpriseNeuralGateway } from './api/enterprise-gateway';

// New Week 1 Features
import { 
  LLMConsensusEngine, 
  ConsensusAPIRoutes, 
  DEFAULT_CONSENSUS_CONFIG 
} from './modules/consensus-api';
import { 
  AIZeitgeistEngine, 
  ZeitgeistAPIRoutes, 
  DEFAULT_ZEITGEIST_CONFIG 
} from './modules/zeitgeist-tracker';
import { 
  MemoryDriftAlertEngine, 
  DriftAlertAPIRoutes, 
  DEFAULT_DRIFT_CONFIG 
} from './modules/drift-alert';

// Import all providers
import { OpenAIProvider } from './modules/llm-providers/providers/openai-provider';
import { AnthropicProvider } from './modules/llm-providers/providers/anthropic-provider';
import { GoogleProvider } from './modules/llm-providers/providers/google-provider';
import { DeepSeekProvider } from './modules/llm-providers/providers/deepseek-provider';
import { MistralProvider } from './modules/llm-providers/providers/mistral-provider';
import { XAIProvider } from './modules/llm-providers/providers/xai-provider';
import { TogetherProvider } from './modules/llm-providers/providers/together-provider';
import { PerplexityProvider } from './modules/llm-providers/providers/perplexity-provider';
import { CohereProvider } from './modules/llm-providers/providers/cohere-provider';
import { AI21Provider } from './modules/llm-providers/providers/ai21-provider';
import { GroqProvider } from './modules/llm-providers/providers/groq-provider';

export class DomainProcessorApp {
  private app: Application;
  private server: any;
  private logger: Logger;
  private database: PostgresService;
  private providerRegistry: ProviderRegistry;
  private monitoringService: MonitoringService;
  private closedLoopEngine: ClosedLoopEngine;
  private enterpriseGateway: EnterpriseNeuralGateway;
  
  // Week 1 Features
  private consensusEngine: LLMConsensusEngine;
  private zeitgeistEngine: AIZeitgeistEngine;
  private driftAlertEngine: MemoryDriftAlertEngine;

  constructor() {
    this.app = express();
    this.logger = new Logger();
    this.initializeServices();
  }

  private async initializeServices() {
    try {
      // Initialize database
      this.database = new PostgresService(this.logger, {
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT || '5432'),
        database: process.env.DB_NAME || 'domain_processor',
        user: process.env.DB_USER || 'postgres',
        password: process.env.DB_PASSWORD || 'postgres',
        ssl: process.env.DB_SSL === 'true'
      });
      await this.database.connect();

      // Initialize provider registry
      this.providerRegistry = new ProviderRegistry(this.logger);
      await this.registerProviders();

      // Initialize monitoring
      this.monitoringService = new MonitoringService(this.logger);

      // Get Redis config (same as index.ts)
      const redisConfig = process.env.REDIS_URL 
        ? process.env.REDIS_URL.startsWith('redis://') 
          ? process.env.REDIS_URL 
          : { url: process.env.REDIS_URL }
        : { host: 'localhost', port: 6379 };

      // Initialize core engines
      this.closedLoopEngine = new ClosedLoopEngine(
        this.database,
        this.logger,
        redisConfig
      );

      this.enterpriseGateway = new EnterpriseNeuralGateway(
        this.database,
        this.logger,
        redisConfig
      );

      // Initialize Week 1 Features
      await this.initializeWeek1Features(redisConfig);

      // Setup middleware
      this.setupMiddleware();

      // Setup routes
      this.setupRoutes();

      // Create HTTP server
      this.server = createServer(this.app);

      // Setup WebSocket handling
      this.setupWebSocketHandling();

      this.logger.info('All services initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize services', { error });
      throw error;
    }
  }

  private async registerProviders() {
    // Register all 11 providers
    const providers = [
      new OpenAIProvider(this.logger),
      new AnthropicProvider(this.logger),
      new GoogleProvider(this.logger),
      new DeepSeekProvider(this.logger),
      new MistralProvider(this.logger),
      new XAIProvider(this.logger),
      new TogetherProvider(this.logger),
      new PerplexityProvider(this.logger),
      new CohereProvider(this.logger),
      new AI21Provider(this.logger),
      new GroqProvider(this.logger)
    ];

    for (const provider of providers) {
      this.providerRegistry.registerProvider(provider);
    }

    this.logger.info('Registered all LLM providers', {
      count: providers.length
    });
  }

  private async initializeWeek1Features(redisConfig: any) {
    // Initialize Consensus Engine
    this.consensusEngine = new LLMConsensusEngine(
      this.providerRegistry,
      this.database,
      this.logger,
      {
        ...DEFAULT_CONSENSUS_CONFIG,
        maxConcurrentRequests: parseInt(process.env.CONSENSUS_MAX_CONCURRENT || '50'),
        defaultTimeout: parseInt(process.env.CONSENSUS_TIMEOUT || '30000'),
        cacheEnabled: process.env.CONSENSUS_CACHE_ENABLED !== 'false',
        driftDetectionEnabled: process.env.DRIFT_DETECTION_ENABLED !== 'false'
      },
      redisConfig
    );

    // Initialize Zeitgeist Engine
    this.zeitgeistEngine = new AIZeitgeistEngine(
      this.consensusEngine,
      this.database,
      this.logger,
      {
        ...DEFAULT_ZEITGEIST_CONFIG,
        updateInterval: parseInt(process.env.ZEITGEIST_UPDATE_INTERVAL || '300000'),
        enableRealtime: process.env.ZEITGEIST_REALTIME !== 'false'
      },
      redisConfig
    );

    // Initialize Drift Alert Engine
    this.driftAlertEngine = new MemoryDriftAlertEngine(
      this.consensusEngine,
      this.database,
      this.logger,
      {
        ...DEFAULT_DRIFT_CONFIG,
        enabled: process.env.DRIFT_ALERTS_ENABLED !== 'false',
        checkInterval: parseInt(process.env.DRIFT_CHECK_INTERVAL || '900000'),
        domains: this.loadDomainConfig()
      },
      redisConfig
    );

    // Connect engines to ClosedLoopEngine
    this.connectEnginesToClosedLoop();

    this.logger.info('Week 1 features initialized successfully');
  }

  private connectEnginesToClosedLoop() {
    // Connect Consensus Engine to Closed Loop
    this.consensusEngine.on('consensus:generated', (response) => {
      // Feed consensus data to closed loop for priority calculation
      if (response.domain) {
        const juiceSignal = {
          guid: `consensus_${response.domain}_${Date.now()}`,
          domain: response.domain,
          juice_score: response.consensusScore / 100,
          components: {
            reddit_volatility: 0,
            news_coverage: 0,
            market_movement: 0,
            competitor_activity: 0,
            social_virality: response.aggregatedContent.sentiment.overall
          },
          timestamp: response.timestamp,
          reason: 'Consensus analysis completed'
        };
        
        this.closedLoopEngine.processJuiceFeedback(juiceSignal);
      }
    });

    // Connect Zeitgeist to provide trending signals
    this.zeitgeistEngine.on('trend:update', (trend) => {
      // High momentum trends increase crawl priority
      if (trend.momentum > 50) {
        trend.domains.forEach(domainMention => {
          const juiceSignal = {
            guid: `zeitgeist_${domainMention.domain}_${Date.now()}`,
            domain: domainMention.domain,
            juice_score: trend.momentum / 100,
            components: {
              reddit_volatility: 0,
              news_coverage: trend.volume / 100,
              market_movement: 0,
              competitor_activity: 0,
              social_virality: trend.sentiment
            },
            timestamp: new Date().toISOString(),
            reason: `Trending topic: ${trend.topic}`
          };
          
          this.closedLoopEngine.processJuiceFeedback(juiceSignal);
        });
      }
    });

    // Connect Drift Alerts to trigger immediate crawls
    this.driftAlertEngine.on('alert:generated', (alert) => {
      if (alert.severity === 'critical' || alert.severity === 'high') {
        this.closedLoopEngine.emit('crawl:immediate', alert.domain);
      }
    });

    // Feed Closed Loop priority updates to Drift Alert Engine
    this.closedLoopEngine.on('priority:updated', (priority) => {
      // High priority domains should be monitored more frequently
      if (priority.priority_score > 0.8) {
        this.driftAlertEngine.addDomain({
          domain: priority.domain,
          priority: 'high',
          checkFrequency: 300000 // 5 minutes for high priority
        });
      }
    });
  }

  private loadDomainConfig(): any[] {
    // Load domain configuration from environment or database
    // For now, return default high-priority domains
    return [
      { domain: 'openai.com', priority: 'critical', checkFrequency: 300000 },
      { domain: 'anthropic.com', priority: 'critical', checkFrequency: 300000 },
      { domain: 'google.com', priority: 'high', checkFrequency: 600000 },
      { domain: 'microsoft.com', priority: 'high', checkFrequency: 600000 },
      { domain: 'meta.com', priority: 'high', checkFrequency: 600000 }
    ];
  }

  private setupMiddleware() {
    // Security
    this.app.use(helmet());
    
    // CORS
    this.app.use(cors({
      origin: process.env.CORS_ORIGIN?.split(',') || '*',
      credentials: true
    }));

    // Body parsing
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));

    // Compression
    this.app.use(compression());

    // Request logging
    this.app.use((req, res, next) => {
      this.logger.info('Incoming request', {
        method: req.method,
        path: req.path,
        ip: req.ip
      });
      next();
    });

    // Error handling
    this.app.use((err: any, req: Request, res: Response, next: any) => {
      this.logger.error('Unhandled error', { error: err });
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    });
  }

  private setupRoutes() {
    // Health check
    this.app.get('/health', (req, res) => {
      res.json({
        success: true,
        status: 'healthy',
        timestamp: new Date().toISOString(),
        services: {
          database: this.database.isHealthy(),
          redis: true, // Would check Redis connection
          providers: this.providerRegistry.getAvailableProviders().length
        }
      });
    });

    // API routes
    const apiRouter = express.Router();

    // Week 1 Feature Routes
    const consensusRoutes = new ConsensusAPIRoutes(this.consensusEngine, this.logger);
    apiRouter.use('/consensus', consensusRoutes.getRouter());

    const zeitgeistRoutes = new ZeitgeistAPIRoutes(this.zeitgeistEngine, this.logger);
    apiRouter.use('/zeitgeist', zeitgeistRoutes.getRouter());

    const driftRoutes = new DriftAlertAPIRoutes(this.driftAlertEngine, this.logger);
    apiRouter.use('/drift', driftRoutes.getRouter());

    // Legacy routes (existing functionality)
    apiRouter.get('/providers', (req, res) => {
      const providers = this.providerRegistry.getAllProviders().map(p => ({
        name: p.name,
        model: p.model,
        available: p.isAvailable(),
        tier: p.tier
      }));
      
      res.json({
        success: true,
        count: providers.length,
        providers
      });
    });

    // Mount API routes
    this.app.use('/api/v1', apiRouter);

    // 404 handler
    this.app.use((req, res) => {
      res.status(404).json({
        success: false,
        error: 'Route not found'
      });
    });

    this.logger.info('Routes configured successfully');
  }

  private setupWebSocketHandling() {
    // Handle WebSocket upgrades
    this.server.on('upgrade', (request: any, socket: any, head: any) => {
      const pathname = request.url;

      if (pathname === '/api/v1/consensus/ws') {
        const consensusRoutes = new ConsensusAPIRoutes(this.consensusEngine, this.logger);
        consensusRoutes.handleWebSocketUpgrade(request, socket, head);
      } else if (pathname === '/api/v1/zeitgeist/ws') {
        const zeitgeistRoutes = new ZeitgeistAPIRoutes(this.zeitgeistEngine, this.logger);
        zeitgeistRoutes.handleWebSocketUpgrade(request, socket, head);
      } else if (pathname === '/api/v1/drift/ws') {
        const driftRoutes = new DriftAlertAPIRoutes(this.driftAlertEngine, this.logger);
        driftRoutes.handleWebSocketUpgrade(request, socket, head);
      } else if (pathname === '/ws/closed-loop') {
        this.closedLoopEngine.handleWebSocketUpgrade(request, socket, head);
      } else {
        socket.destroy();
      }
    });
  }

  public async start() {
    const port = parseInt(process.env.PORT || '3000');
    
    this.server.listen(port, () => {
      this.logger.info(`Domain Processor v2 started on port ${port}`, {
        nodeEnv: process.env.NODE_ENV,
        features: {
          consensus: true,
          zeitgeist: true,
          driftAlert: true,
          closedLoop: true,
          enterpriseGateway: true
        }
      });
    });
  }

  public async shutdown() {
    this.logger.info('Shutting down Domain Processor v2...');

    // Shutdown all engines
    await Promise.all([
      this.consensusEngine.shutdown(),
      this.zeitgeistEngine.shutdown(),
      this.driftAlertEngine.shutdown(),
      this.closedLoopEngine.shutdown()
    ]);

    // Close database connection
    await this.database.disconnect();

    // Close server
    this.server.close();

    this.logger.info('Domain Processor v2 shutdown complete');
  }
}

// Start application if run directly
if (require.main === module) {
  const app = new DomainProcessorApp();
  
  app.start().catch(error => {
    console.error('Failed to start application:', error);
    process.exit(1);
  });

  // Graceful shutdown
  process.on('SIGINT', async () => {
    await app.shutdown();
    process.exit(0);
  });

  process.on('SIGTERM', async () => {
    await app.shutdown();
    process.exit(0);
  });
}