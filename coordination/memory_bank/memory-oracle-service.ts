import { Pool } from 'pg';
import winston from 'winston';
import express, { Request, Response } from 'express';
import cors from 'cors';

// Import all memory oracle components
import { MemoryOracle, CompetitiveMemory, PatternMemory, PredictionMemory, SynthesisMemory } from './memory-oracle-core';
import { NeuralLearningSystem, LearningMetrics } from './neural-learning-system';
import { IntelligenceGraphSystem, IntelligenceNode, GraphInsight } from './intelligence-graph-system';
import { AlertPrioritizationSystem, MemoryAlert } from './alert-prioritization-system';

export interface MemoryOracleConfig {
  databaseUrl: string;
  port?: number;
  logLevel?: string;
  enableAutoLearning?: boolean;
  enableGraphAnalysis?: boolean;
  enableAlertSystem?: boolean;
  learningCycleInterval?: number; // minutes
  graphAnalysisInterval?: number; // minutes
  alertProcessingInterval?: number; // minutes
}

export interface IntelligenceQuery {
  type: 'competitive_analysis' | 'pattern_detection' | 'prediction_generation' | 'synthesis_creation' | 'alert_prioritization';
  domain?: string;
  domains?: string[];
  filters?: Record<string, any>;
  timeframe?: 'hour' | 'day' | 'week' | 'month';
  confidence_threshold?: number;
  limit?: number;
}

export interface IntelligenceResponse {
  query: IntelligenceQuery;
  results: any;
  metadata: {
    totalResults: number;
    processingTime: number;
    confidence: number;
    memorySourceCount: number;
    graphNodesInvolved: number;
    learningInsights: string[];
  };
  recommendations: string[];
  timestamp: Date;
}

export class MemoryOracleService {
  private app: express.Application;
  private pool: Pool;
  private logger: winston.Logger;
  private config: MemoryOracleConfig;

  // Core memory oracle components
  private memoryOracle: MemoryOracle;
  private neuralLearning: NeuralLearningSystem;
  private intelligenceGraph: IntelligenceGraphSystem;
  private alertSystem: AlertPrioritizationSystem;

  // Service state
  private isInitialized = false;
  private processingQueues = new Map<string, any[]>();
  private performanceMetrics = new Map<string, number>();

  constructor(config: MemoryOracleConfig) {
    this.config = {
      port: 3005,
      logLevel: 'info',
      enableAutoLearning: true,
      enableGraphAnalysis: true,
      enableAlertSystem: true,
      learningCycleInterval: 60,
      graphAnalysisInterval: 240,
      alertProcessingInterval: 15,
      ...config
    };

    this.initializeLogger();
    this.initializeDatabase();
    this.initializeExpress();
  }

  private initializeLogger() {
    this.logger = winston.createLogger({
      level: this.config.logLevel,
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        winston.format.json()
      ),
      defaultMeta: { 
        service: 'memory-oracle',
        version: '1.0.0'
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
  }

  private initializeDatabase() {
    this.pool = new Pool({
      connectionString: this.config.databaseUrl,
      ssl: process.env.NODE_ENV === 'production' ? {
        rejectUnauthorized: true
      } : false,
      max: 50,
      min: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 30000
    });
  }

  private initializeExpress() {
    this.app = express();

    // CORS configuration
    this.app.use(cors({
      origin: [
        'https://llmrank.io',
        'https://www.llmrank.io',
        'https://llm-pagerank-frontend.onrender.com',
        'http://localhost:3000'
      ],
      credentials: true
    }));

    this.app.use(express.json({ limit: '10mb' }));

    // Request logging
    this.app.use((req, res, next) => {
      const start = Date.now();
      res.on('finish', () => {
        const duration = Date.now() - start;
        this.logger.info('HTTP Request', {
          method: req.method,
          url: req.url,
          status: res.statusCode,
          duration: `${duration}ms`
        });
      });
      next();
    });

    this.setupRoutes();
  }

  // Initialize all memory oracle components
  async initialize(): Promise<void> {
    try {
      this.logger.info('🧠 Initializing Memory Oracle Service...');

      // Initialize core memory oracle
      this.memoryOracle = new MemoryOracle(this.pool, this.logger);
      
      // Initialize neural learning system
      if (this.config.enableAutoLearning) {
        this.neuralLearning = new NeuralLearningSystem(this.pool, this.logger, this.memoryOracle);
      }

      // Initialize intelligence graph system
      if (this.config.enableGraphAnalysis) {
        this.intelligenceGraph = new IntelligenceGraphSystem(this.pool, this.logger, this.memoryOracle);
      }

      // Initialize alert prioritization system
      if (this.config.enableAlertSystem) {
        this.alertSystem = new AlertPrioritizationSystem(
          this.pool, 
          this.logger, 
          this.memoryOracle, 
          this.neuralLearning, 
          this.intelligenceGraph
        );
      }

      // Build initial intelligence graph
      if (this.intelligenceGraph) {
        await this.intelligenceGraph.buildIntelligenceGraph();
      }

      // Start orchestration cycles
      this.startOrchestrationCycles();

      this.isInitialized = true;
      this.logger.info('✅ Memory Oracle Service initialized successfully');

    } catch (error) {
      this.logger.error('Failed to initialize Memory Oracle Service:', error);
      throw error;
    }
  }

  // Setup Express routes for the Memory Oracle API
  private setupRoutes() {
    // Health check endpoint
    this.app.get('/health', (req: Request, res: Response) => {
      res.json({
        status: this.isInitialized ? 'healthy' : 'initializing',
        service: 'memory-oracle',
        version: '1.0.0',
        timestamp: new Date().toISOString(),
        components: {
          memoryOracle: !!this.memoryOracle,
          neuralLearning: !!this.neuralLearning,
          intelligenceGraph: !!this.intelligenceGraph,
          alertSystem: !!this.alertSystem
        },
        metrics: Object.fromEntries(this.performanceMetrics)
      });
    });

    // Intelligence query endpoint
    this.app.post('/intelligence/query', async (req: Request, res: Response) => {
      try {
        const query: IntelligenceQuery = req.body;
        const startTime = Date.now();

        const response = await this.processIntelligenceQuery(query);
        
        const processingTime = Date.now() - startTime;
        response.metadata.processingTime = processingTime;

        res.json(response);

      } catch (error) {
        this.logger.error('Intelligence query failed:', error);
        res.status(500).json({ error: error.message });
      }
    });

    // Memory storage endpoint
    this.app.post('/memory/store', async (req: Request, res: Response) => {
      try {
        const memoryData = req.body;
        const memoryId = await this.memoryOracle.storeCompetitiveMemory(memoryData);
        
        res.json({ 
          success: true, 
          memoryId,
          message: 'Memory stored successfully' 
        });

      } catch (error) {
        this.logger.error('Memory storage failed:', error);
        res.status(500).json({ error: error.message });
      }
    });

    // Pattern detection endpoint
    this.app.post('/patterns/detect', async (req: Request, res: Response) => {
      try {
        const { domainResponses } = req.body;
        const patterns = await this.memoryOracle.detectAndStorePatterns(domainResponses);
        
        res.json({
          success: true,
          patternsDetected: patterns.length,
          patterns: patterns.slice(0, 10) // Return top 10
        });

      } catch (error) {
        this.logger.error('Pattern detection failed:', error);
        res.status(500).json({ error: error.message });
      }
    });

    // Prediction generation endpoint
    this.app.post('/predictions/generate', async (req: Request, res: Response) => {
      try {
        const { targetDomain } = req.body;
        const predictions = await this.memoryOracle.generatePredictions(targetDomain);
        
        res.json({
          success: true,
          predictionsGenerated: predictions.length,
          predictions
        });

      } catch (error) {
        this.logger.error('Prediction generation failed:', error);
        res.status(500).json({ error: error.message });
      }
    });

    // Prediction validation endpoint
    this.app.post('/predictions/:id/validate', async (req: Request, res: Response) => {
      try {
        const { id } = req.params;
        const { outcome, accuracy } = req.body;
        
        await this.memoryOracle.validatePrediction(id, outcome, accuracy);
        
        res.json({
          success: true,
          message: 'Prediction validated successfully'
        });

      } catch (error) {
        this.logger.error('Prediction validation failed:', error);
        res.status(500).json({ error: error.message });
      }
    });

    // Intelligence synthesis endpoint
    this.app.post('/synthesis/create', async (req: Request, res: Response) => {
      try {
        const { domains, synthesisType } = req.body;
        const synthesis = await this.memoryOracle.synthesizeIntelligence(domains, synthesisType);
        
        res.json({
          success: true,
          synthesis
        });

      } catch (error) {
        this.logger.error('Intelligence synthesis failed:', error);
        res.status(500).json({ error: error.message });
      }
    });

    // Alert management endpoints
    this.app.get('/alerts/active', async (req: Request, res: Response) => {
      try {
        const filters = req.query as any;
        const alerts = await this.alertSystem.getActiveAlerts(filters);
        
        res.json({
          success: true,
          totalAlerts: alerts.length,
          alerts
        });

      } catch (error) {
        this.logger.error('Alert retrieval failed:', error);
        res.status(500).json({ error: error.message });
      }
    });

    this.app.post('/alerts/create', async (req: Request, res: Response) => {
      try {
        const alertData = req.body;
        const alert = await this.alertSystem.processAlert(alertData);
        
        res.json({
          success: true,
          alert
        });

      } catch (error) {
        this.logger.error('Alert creation failed:', error);
        res.status(500).json({ error: error.message });
      }
    });

    this.app.post('/alerts/:id/feedback', async (req: Request, res: Response) => {
      try {
        const { id } = req.params;
        const feedback = req.body;
        
        await this.alertSystem.processAlertFeedback(id, feedback);
        
        res.json({
          success: true,
          message: 'Alert feedback processed successfully'
        });

      } catch (error) {
        this.logger.error('Alert feedback failed:', error);
        res.status(500).json({ error: error.message });
      }
    });

    // Learning metrics endpoint
    this.app.get('/learning/metrics', async (req: Request, res: Response) => {
      try {
        const timeWindow = req.query.timeWindow as 'hour' | 'day' | 'week' | 'month' || 'day';
        const metrics = await this.neuralLearning.calculateLearningMetrics(timeWindow);
        
        res.json({
          success: true,
          timeWindow,
          metrics
        });

      } catch (error) {
        this.logger.error('Learning metrics failed:', error);
        res.status(500).json({ error: error.message });
      }
    });

    // Graph intelligence endpoint
    this.app.get('/graph/intelligence/:domain', async (req: Request, res: Response) => {
      try {
        const { domain } = req.params;
        const intelligence = await this.intelligenceGraph.getCompetitiveIntelligence(domain);
        
        res.json({
          success: true,
          domain,
          intelligence
        });

      } catch (error) {
        this.logger.error('Graph intelligence failed:', error);
        res.status(500).json({ error: error.message });
      }
    });

    // Graph insights endpoint
    this.app.get('/graph/insights', async (req: Request, res: Response) => {
      try {
        const insights = await this.intelligenceGraph.detectGraphInsights();
        
        res.json({
          success: true,
          totalInsights: insights.length,
          insights
        });

      } catch (error) {
        this.logger.error('Graph insights failed:', error);
        res.status(500).json({ error: error.message });
      }
    });

    // Training endpoint for manual neural learning
    this.app.post('/learning/train', async (req: Request, res: Response) => {
      try {
        const { componentType, componentId, feedback, context } = req.body;
        
        await this.neuralLearning.trainFromFeedback(
          componentType,
          componentId,
          feedback,
          context
        );
        
        res.json({
          success: true,
          message: 'Neural learning training completed'
        });

      } catch (error) {
        this.logger.error('Neural learning training failed:', error);
        res.status(500).json({ error: error.message });
      }
    });
  }

  // Process complex intelligence queries
  private async processIntelligenceQuery(query: IntelligenceQuery): Promise<IntelligenceResponse> {
    const startTime = Date.now();
    let results: any;
    let memorySourceCount = 0;
    let graphNodesInvolved = 0;
    let learningInsights: string[] = [];
    let recommendations: string[] = [];

    try {
      switch (query.type) {
        case 'competitive_analysis':
          results = await this.processCompetitiveAnalysisQuery(query);
          break;
        
        case 'pattern_detection':
          results = await this.processPatternDetectionQuery(query);
          break;
        
        case 'prediction_generation':
          results = await this.processPredictionGenerationQuery(query);
          break;
        
        case 'synthesis_creation':
          results = await this.processSynthesisCreationQuery(query);
          break;
        
        case 'alert_prioritization':
          results = await this.processAlertPrioritizationQuery(query);
          break;
        
        default:
          throw new Error(`Unsupported query type: ${query.type}`);
      }

      // Calculate metadata
      memorySourceCount = await this.getMemorySourceCount(query);
      graphNodesInvolved = await this.getGraphNodesInvolved(query);
      learningInsights = await this.generateLearningInsights(query, results);
      recommendations = await this.generateRecommendations(query, results);

      const response: IntelligenceResponse = {
        query,
        results,
        metadata: {
          totalResults: Array.isArray(results) ? results.length : 1,
          processingTime: Date.now() - startTime,
          confidence: this.calculateQueryConfidence(results),
          memorySourceCount,
          graphNodesInvolved,
          learningInsights
        },
        recommendations,
        timestamp: new Date()
      };

      return response;

    } catch (error) {
      this.logger.error('Intelligence query processing failed:', error);
      throw error;
    }
  }

  // Start orchestration cycles for continuous intelligence improvement
  private startOrchestrationCycles() {
    // Neural learning cycle
    if (this.config.enableAutoLearning && this.neuralLearning) {
      setInterval(async () => {
        try {
          await this.neuralLearning.improvePredictionAccuracy();
          await this.neuralLearning.enhancePatternDetection();
          await this.neuralLearning.optimizeMemoryRelevance();
          this.logger.info('🧠 Neural learning cycle completed');
        } catch (error) {
          this.logger.error('Neural learning cycle failed:', error);
        }
      }, this.config.learningCycleInterval! * 60 * 1000);
    }

    // Graph analysis cycle
    if (this.config.enableGraphAnalysis && this.intelligenceGraph) {
      setInterval(async () => {
        try {
          await this.intelligenceGraph.buildIntelligenceGraph();
          await this.intelligenceGraph.detectGraphInsights();
          this.logger.info('🕸️ Graph analysis cycle completed');
        } catch (error) {
          this.logger.error('Graph analysis cycle failed:', error);
        }
      }, this.config.graphAnalysisInterval! * 60 * 1000);
    }

    // Performance monitoring cycle
    setInterval(async () => {
      try {
        await this.updatePerformanceMetrics();
      } catch (error) {
        this.logger.error('Performance monitoring failed:', error);
      }
    }, 5 * 60 * 1000); // Every 5 minutes

    this.logger.info('🔄 Memory Oracle orchestration cycles started');
  }

  // Query processing methods (simplified implementations)
  private async processCompetitiveAnalysisQuery(query: IntelligenceQuery): Promise<any> {
    if (query.domain) {
      return await this.intelligenceGraph.getCompetitiveIntelligence(query.domain);
    }
    throw new Error('Domain required for competitive analysis');
  }

  private async processPatternDetectionQuery(query: IntelligenceQuery): Promise<any> {
    // Implementation would detect patterns based on query filters
    return { patterns: [], totalPatterns: 0 };
  }

  private async processPredictionGenerationQuery(query: IntelligenceQuery): Promise<any> {
    if (query.domain) {
      return await this.memoryOracle.generatePredictions(query.domain);
    }
    throw new Error('Domain required for prediction generation');
  }

  private async processSynthesisCreationQuery(query: IntelligenceQuery): Promise<any> {
    if (query.domains && query.filters?.synthesisType) {
      return await this.memoryOracle.synthesizeIntelligence(query.domains, query.filters.synthesisType);
    }
    throw new Error('Domains and synthesis type required');
  }

  private async processAlertPrioritizationQuery(query: IntelligenceQuery): Promise<any> {
    return await this.alertSystem.getActiveAlerts(query.filters);
  }

  // Metadata calculation methods
  private async getMemorySourceCount(query: IntelligenceQuery): Promise<number> {
    // Implementation would count relevant memory sources
    return 0;
  }

  private async getGraphNodesInvolved(query: IntelligenceQuery): Promise<number> {
    // Implementation would count graph nodes involved
    return 0;
  }

  private async generateLearningInsights(query: IntelligenceQuery, results: any): Promise<string[]> {
    // Implementation would generate learning insights
    return ['Memory oracle is continuously learning from this query'];
  }

  private async generateRecommendations(query: IntelligenceQuery, results: any): Promise<string[]> {
    // Implementation would generate actionable recommendations
    return ['Monitor competitive developments closely', 'Update strategic response plans'];
  }

  private calculateQueryConfidence(results: any): number {
    // Implementation would calculate confidence based on results
    return 0.85;
  }

  private async updatePerformanceMetrics(): Promise<void> {
    try {
      // Query processing metrics
      const queryCount = await this.getQueryCount();
      this.performanceMetrics.set('queries_processed_last_hour', queryCount);

      // Memory metrics
      const memoryCount = await this.getMemoryCount();
      this.performanceMetrics.set('total_memories', memoryCount);

      // Learning metrics if available
      if (this.neuralLearning) {
        const learningMetrics = await this.neuralLearning.calculateLearningMetrics('hour');
        this.performanceMetrics.set('learning_intelligence_score', learningMetrics.overallIntelligenceScore);
      }

      // Alert metrics if available
      if (this.alertSystem) {
        const activeAlerts = await this.alertSystem.getActiveAlerts();
        this.performanceMetrics.set('active_alerts', activeAlerts.length);
      }

    } catch (error) {
      this.logger.error('Performance metrics update failed:', error);
    }
  }

  private async getQueryCount(): Promise<number> {
    // Implementation would count queries in the last hour
    return 0;
  }

  private async getMemoryCount(): Promise<number> {
    const result = await this.pool.query('SELECT COUNT(*) FROM competitive_memories');
    return parseInt(result.rows[0].count);
  }

  // Start the Memory Oracle Service
  async start(): Promise<void> {
    try {
      await this.initialize();
      
      const server = this.app.listen(this.config.port, () => {
        this.logger.info(`🚀 Memory Oracle Service running on port ${this.config.port}`, {
          port: this.config.port,
          endpoints: {
            health: 'GET /health',
            intelligence: 'POST /intelligence/query',
            memory: 'POST /memory/store',
            patterns: 'POST /patterns/detect',
            predictions: 'POST /predictions/generate',
            synthesis: 'POST /synthesis/create',
            alerts: 'GET /alerts/active',
            learning: 'GET /learning/metrics',
            graph: 'GET /graph/intelligence/:domain'
          },
          configuration: {
            autoLearning: this.config.enableAutoLearning,
            graphAnalysis: this.config.enableGraphAnalysis,
            alertSystem: this.config.enableAlertSystem
          }
        });
      });

      // Graceful shutdown
      process.on('SIGTERM', () => this.gracefulShutdown(server));
      process.on('SIGINT', () => this.gracefulShutdown(server));

    } catch (error) {
      this.logger.error('Failed to start Memory Oracle Service:', error);
      throw error;
    }
  }

  private async gracefulShutdown(server: any): Promise<void> {
    this.logger.info('🛑 Starting graceful shutdown...');
    
    server.close(async () => {
      try {
        await this.pool.end();
        this.logger.info('✅ Memory Oracle Service shutdown completed');
        process.exit(0);
      } catch (error) {
        this.logger.error('Error during shutdown:', error);
        process.exit(1);
      }
    });
  }
}

// Export for use in other services
export { MemoryOracleService, MemoryOracleConfig, IntelligenceQuery, IntelligenceResponse };