import { Pool } from 'pg';
import winston from 'winston';
import express, { Request, Response } from 'express';
import cors from 'cors';

// Import tensor components
import { MemoryTensor, MemoryTensorResult } from './tensors/MemoryTensor';
import { SentimentTensor, SentimentTensorResult } from './tensors/SentimentTensor';
import { GroundingTensor, GroundingTensorResult } from './tensors/GroundingTensor';

// Import algorithms
import { DriftDetector, DriftMetrics } from './algorithms/DriftDetector';
import { ConsensusScorer, ConsensusMetrics } from './algorithms/ConsensusScorer';

export interface MemoryOracleConfig {
  databaseUrl: string;
  port?: number;
  logLevel?: string;
  tensorComputeInterval?: number; // minutes
  driftDetectionInterval?: number; // minutes
  consensusComputeInterval?: number; // minutes
}

export interface TensorQuery {
  domainId: string;
  tensorTypes?: ('memory' | 'sentiment' | 'grounding')[];
  includeHistory?: boolean;
  timeRange?: {
    start: Date;
    end: Date;
  };
}

export interface CompositeTensorResult {
  domainId: string;
  memory?: MemoryTensorResult;
  sentiment?: SentimentTensorResult;
  grounding?: GroundingTensorResult;
  drift?: DriftMetrics;
  consensus?: ConsensusMetrics;
  compositeScore: number;
  insights: string[];
  computedAt: Date;
}

export class MemoryOracleService {
  private app!: express.Application;
  private pool!: Pool;
  private logger!: winston.Logger;
  private config: MemoryOracleConfig;

  // Tensor components
  private memoryTensor!: MemoryTensor;
  private sentimentTensor!: SentimentTensor;
  private groundingTensor!: GroundingTensor;

  // Algorithm components
  private driftDetector!: DriftDetector;
  private consensusScorer!: ConsensusScorer;

  // Service state
  private isInitialized = false;
  private computeQueues = new Map<string, any[]>();

  constructor(config: MemoryOracleConfig) {
    this.config = {
      port: 3006,
      logLevel: 'info',
      tensorComputeInterval: 60,
      driftDetectionInterval: 120,
      consensusComputeInterval: 90,
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
        service: 'memory-oracle-tensors',
        version: '2.0.0'
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
      ssl: this.config.databaseUrl.includes('onrender.com') || this.config.databaseUrl.includes('render.com') ? {
        rejectUnauthorized: false
      } : false,
      max: 50,
      min: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 30000
    });

    // Test connection
    this.pool.query('SELECT NOW()', (err, res) => {
      if (err) {
        this.logger.error('Database connection failed:', err);
      } else {
        this.logger.info('✅ Database connected successfully');
      }
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

  // Initialize all tensor and algorithm components
  async initialize(): Promise<void> {
    try {
      this.logger.info('🧠 Initializing Memory Oracle Service with Tensors...');

      // Initialize tensor components
      this.memoryTensor = new MemoryTensor(this.pool, this.logger);
      this.sentimentTensor = new SentimentTensor(this.pool, this.logger);
      this.groundingTensor = new GroundingTensor(this.pool, this.logger);

      // Initialize algorithm components
      this.driftDetector = new DriftDetector(this.pool, this.logger);
      this.consensusScorer = new ConsensusScorer(this.pool, this.logger);

      // Start scheduled computations
      this.startScheduledComputations();

      this.isInitialized = true;
      this.logger.info('✅ Memory Oracle Service with Tensors initialized successfully');

    } catch (error) {
      this.logger.error('Failed to initialize Memory Oracle Service:', error);
      throw error;
    }
  }

  private setupRoutes() {
    // Health check
    this.app.get('/health', (req: Request, res: Response) => {
      res.json({
        status: this.isInitialized ? 'healthy' : 'initializing',
        service: 'memory-oracle-tensors',
        version: '2.0.0',
        timestamp: new Date().toISOString(),
        components: {
          memoryTensor: !!this.memoryTensor,
          sentimentTensor: !!this.sentimentTensor,
          groundingTensor: !!this.groundingTensor,
          driftDetector: !!this.driftDetector,
          consensusScorer: !!this.consensusScorer
        }
      });
    });

    // Compute all tensors for a domain
    this.app.post('/tensors/compute', async (req: Request, res: Response) => {
      try {
        const { domainId } = req.body;
        const result = await this.computeAllTensors(domainId);
        res.json(result);
      } catch (error) {
        this.logger.error('Tensor computation failed:', error);
        res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
      }
    });

    // Query tensors
    this.app.post('/tensors/query', async (req: Request, res: Response) => {
      try {
        const query: TensorQuery = req.body;
        const results = await this.queryTensors(query);
        res.json(results);
      } catch (error) {
        this.logger.error('Tensor query failed:', error);
        res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
      }
    });

    // Memory tensor endpoints
    this.app.get('/tensors/memory/:domainId', async (req: Request, res: Response) => {
      try {
        const result = await this.memoryTensor.computeMemoryTensor(req.params.domainId);
        res.json(result);
      } catch (error) {
        this.logger.error('Memory tensor computation failed:', error);
        res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
      }
    });

    this.app.post('/tensors/memory/track-access', async (req: Request, res: Response) => {
      try {
        const { domainId, accessType, context } = req.body;
        await this.memoryTensor.trackMemoryAccess(domainId, accessType, context);
        res.json({ success: true });
      } catch (error) {
        this.logger.error('Memory access tracking failed:', error);
        res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
      }
    });

    this.app.get('/tensors/memory/top/:limit?', async (req: Request, res: Response) => {
      try {
        const limit = parseInt(req.params.limit) || 10;
        const results = await this.memoryTensor.getTopMemories(limit);
        res.json(results);
      } catch (error) {
        this.logger.error('Top memories query failed:', error);
        res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
      }
    });

    // Sentiment tensor endpoints
    this.app.get('/tensors/sentiment/:domainId', async (req: Request, res: Response) => {
      try {
        const result = await this.sentimentTensor.computeSentimentTensor(req.params.domainId);
        res.json(result);
      } catch (error) {
        this.logger.error('Sentiment tensor computation failed:', error);
        res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
      }
    });

    this.app.get('/tensors/sentiment/:domainId/trends/:days?', async (req: Request, res: Response) => {
      try {
        const days = parseInt(req.params.days) || 30;
        const trends = await this.sentimentTensor.getSentimentTrends(req.params.domainId, days);
        res.json(trends);
      } catch (error) {
        this.logger.error('Sentiment trends query failed:', error);
        res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
      }
    });

    this.app.get('/tensors/sentiment/market/distribution', async (req: Request, res: Response) => {
      try {
        const distribution = await this.sentimentTensor.getMarketSentimentDistribution();
        res.json(distribution);
      } catch (error) {
        this.logger.error('Market sentiment distribution query failed:', error);
        res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
      }
    });

    // Grounding tensor endpoints
    this.app.get('/tensors/grounding/:domainId', async (req: Request, res: Response) => {
      try {
        const result = await this.groundingTensor.computeGroundingTensor(req.params.domainId);
        res.json(result);
      } catch (error) {
        this.logger.error('Grounding tensor computation failed:', error);
        res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
      }
    });

    this.app.post('/tensors/grounding/verify-fact', async (req: Request, res: Response) => {
      try {
        const { domainId, factStatement, sourceModels } = req.body;
        await this.groundingTensor.verifyFact(domainId, factStatement, sourceModels);
        res.json({ success: true });
      } catch (error) {
        this.logger.error('Fact verification failed:', error);
        res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
      }
    });

    this.app.get('/tensors/grounding/ungrounded/:threshold?', async (req: Request, res: Response) => {
      try {
        const threshold = parseFloat(req.params.threshold) || 0.5;
        const results = await this.groundingTensor.findUngroundedDomains(threshold);
        res.json(results);
      } catch (error) {
        this.logger.error('Ungrounded domains query failed:', error);
        res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
      }
    });

    // Drift detection endpoints
    this.app.get('/drift/detect/:domainId', async (req: Request, res: Response) => {
      try {
        const result = await this.driftDetector.detectDrift(req.params.domainId);
        res.json(result);
      } catch (error) {
        this.logger.error('Drift detection failed:', error);
        res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
      }
    });

    this.app.get('/drift/alerts', async (req: Request, res: Response) => {
      try {
        const alerts = await this.driftDetector.getActiveDriftAlerts();
        res.json(alerts);
      } catch (error) {
        this.logger.error('Drift alerts query failed:', error);
        res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
      }
    });

    this.app.post('/drift/alerts/:alertId/acknowledge', async (req: Request, res: Response) => {
      try {
        await this.driftDetector.acknowledgeAlert(req.params.alertId);
        res.json({ success: true });
      } catch (error) {
        this.logger.error('Alert acknowledgment failed:', error);
        res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
      }
    });

    this.app.get('/drift/sectors/:threshold?', async (req: Request, res: Response) => {
      try {
        const threshold = parseFloat(req.params.threshold) || 0.5;
        const sectors = await this.driftDetector.getDriftingSectors(threshold);
        res.json(sectors);
      } catch (error) {
        this.logger.error('Drifting sectors query failed:', error);
        res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
      }
    });

    // Consensus scoring endpoints
    this.app.get('/consensus/compute/:domainId', async (req: Request, res: Response) => {
      try {
        const result = await this.consensusScorer.computeConsensus(req.params.domainId);
        res.json(result);
      } catch (error) {
        this.logger.error('Consensus computation failed:', error);
        res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
      }
    });

    this.app.get('/consensus/insights/:domainId?', async (req: Request, res: Response) => {
      try {
        const insights = await this.consensusScorer.getConsensusInsights(req.params.domainId);
        res.json(insights);
      } catch (error) {
        this.logger.error('Consensus insights query failed:', error);
        res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
      }
    });

    this.app.get('/consensus/conflicted/:limit?', async (req: Request, res: Response) => {
      try {
        const limit = parseInt(req.params.limit) || 20;
        const domains = await this.consensusScorer.findConflictedDomains(limit);
        res.json(domains);
      } catch (error) {
        this.logger.error('Conflicted domains query failed:', error);
        res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
      }
    });

    this.app.get('/consensus/sectors', async (req: Request, res: Response) => {
      try {
        const sectors = await this.consensusScorer.getSectorConsensus();
        res.json(sectors);
      } catch (error) {
        this.logger.error('Sector consensus query failed:', error);
        res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
      }
    });

    // Composite analysis endpoints
    this.app.get('/analysis/domain/:domainId', async (req: Request, res: Response) => {
      try {
        const analysis = await this.performComprehensiveAnalysis(req.params.domainId);
        res.json(analysis);
      } catch (error) {
        this.logger.error('Comprehensive analysis failed:', error);
        res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
      }
    });

    this.app.post('/analysis/batch', async (req: Request, res: Response) => {
      try {
        const { domainIds } = req.body;
        const results = await Promise.all(
          domainIds.map((id: string) => this.computeAllTensors(id))
        );
        res.json(results);
      } catch (error) {
        this.logger.error('Batch analysis failed:', error);
        res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
      }
    });
  }

  private async computeAllTensors(domainId: string): Promise<CompositeTensorResult> {
    try {
      // Compute all tensors in parallel
      const [memory, sentiment, grounding, drift, consensus] = await Promise.all([
        this.memoryTensor.computeMemoryTensor(domainId),
        this.sentimentTensor.computeSentimentTensor(domainId),
        this.groundingTensor.computeGroundingTensor(domainId),
        this.driftDetector.detectDrift(domainId),
        this.consensusScorer.computeConsensus(domainId)
      ]);

      // Calculate composite score
      const compositeScore = this.calculateCompositeScore({
        memory: memory.memoryScore,
        sentiment: sentiment.sentimentScore,
        grounding: grounding.groundingScore,
        drift: 1 - drift.driftScore, // Invert drift score
        consensus: consensus.consensusScore
      });

      // Generate insights
      const insights = this.generateInsights({
        memory, sentiment, grounding, drift, consensus
      });

      return {
        domainId,
        memory,
        sentiment,
        grounding,
        drift,
        consensus,
        compositeScore,
        insights,
        computedAt: new Date()
      };

    } catch (error) {
      this.logger.error(`Failed to compute all tensors for ${domainId}:`, error);
      throw error;
    }
  }

  private async queryTensors(query: TensorQuery): Promise<any> {
    const results: any = {
      domainId: query.domainId
    };

    const tensorTypes = query.tensorTypes || ['memory', 'sentiment', 'grounding'];

    // Fetch requested tensor types
    const promises = [];
    
    if (tensorTypes.includes('memory')) {
      promises.push(this.memoryTensor.computeMemoryTensor(query.domainId)
        .then(r => results.memory = r));
    }
    
    if (tensorTypes.includes('sentiment')) {
      promises.push(this.sentimentTensor.computeSentimentTensor(query.domainId)
        .then(r => results.sentiment = r));
    }
    
    if (tensorTypes.includes('grounding')) {
      promises.push(this.groundingTensor.computeGroundingTensor(query.domainId)
        .then(r => results.grounding = r));
    }

    await Promise.all(promises);

    // Include history if requested
    if (query.includeHistory) {
      results.history = await this.getTensorHistory(query.domainId, query.timeRange);
    }

    return results;
  }

  private async getTensorHistory(domainId: string, timeRange?: any): Promise<any> {
    const whereClause = timeRange 
      ? `AND created_at BETWEEN $2 AND $3`
      : `AND created_at > NOW() - INTERVAL '30 days'`;

    const params = timeRange 
      ? [domainId, timeRange.start, timeRange.end]
      : [domainId];

    const query = `
      SELECT 
        'memory' as tensor_type,
        composite_score as score,
        created_at
      FROM memory_tensors
      WHERE domain_id = $1 ${whereClause}
      UNION ALL
      SELECT 
        'sentiment' as tensor_type,
        composite_sentiment as score,
        created_at
      FROM sentiment_tensors
      WHERE domain_id = $1 ${whereClause}
      UNION ALL
      SELECT 
        'grounding' as tensor_type,
        composite_grounding as score,
        created_at
      FROM grounding_tensors
      WHERE domain_id = $1 ${whereClause}
      ORDER BY created_at DESC
    `;

    const result = await this.pool.query(query, params);
    return result.rows;
  }

  private calculateCompositeScore(scores: {
    memory: number;
    sentiment: number;
    grounding: number;
    drift: number;
    consensus: number;
  }): number {
    // Weighted combination of all tensor scores
    const weighted = 
      scores.memory * 0.25 +
      scores.sentiment * 0.15 +
      scores.grounding * 0.3 +
      scores.drift * 0.15 +
      scores.consensus * 0.15;

    // Apply sigmoid for bounded output
    return 1 / (1 + Math.exp(-4 * (weighted - 0.5)));
  }

  private generateInsights(tensors: any): string[] {
    const insights: string[] = [];

    // Memory insights
    if (tensors.memory.memoryScore < 0.3) {
      insights.push('Low memory retention detected - increase monitoring frequency');
    } else if (tensors.memory.memoryScore > 0.8) {
      insights.push('Strong memory patterns established - high domain significance');
    }

    // Sentiment insights
    if (tensors.sentiment.marketSentiment === 'volatile') {
      insights.push('High sentiment volatility - monitor for rapid changes');
    } else if (tensors.sentiment.marketSentiment === 'bullish') {
      insights.push('Positive sentiment trend - potential growth opportunity');
    }

    // Grounding insights
    if (tensors.grounding.groundingStrength === 'weak' || tensors.grounding.groundingStrength === 'unstable') {
      insights.push('Weak data grounding - verify sources and increase validation');
    }

    // Drift insights
    if (tensors.drift.severity === 'critical') {
      insights.push(`Critical ${tensors.drift.driftType} drift detected - immediate attention required`);
    } else if (tensors.drift.driftScore > 0.5) {
      insights.push(`${tensors.drift.driftDirection} drift trend emerging`);
    }

    // Consensus insights
    if (tensors.consensus.agreementLevel === 'conflicted') {
      insights.push('Model consensus conflict - review divergent predictions');
    } else if (tensors.consensus.agreementLevel === 'strong') {
      insights.push('Strong model consensus - high confidence in predictions');
    }

    return insights;
  }

  private async performComprehensiveAnalysis(domainId: string): Promise<any> {
    // Get all tensor data
    const tensorData = await this.computeAllTensors(domainId);

    // Get historical trends
    const memoryTrends = await this.memoryTensor.getTopMemories(5);
    const sentimentTrends = await this.sentimentTensor.getSentimentTrends(domainId, 30);
    const driftHistory = await this.driftDetector.getDriftHistory(domainId, 30);
    const consensusHistory = await this.consensusScorer.getConsensusHistory(domainId, 30);

    // Get similar domains
    const similarByMemory = await this.memoryTensor.findSimilarMemories(domainId, 0.8);
    const similarBySentiment = await this.sentimentTensor.findSentimentCorrelations(domainId, 0.7);

    // Get domain details
    const domainQuery = `SELECT domain, industry_category FROM domains WHERE id = $1`;
    const domainResult = await this.pool.query(domainQuery, [domainId]);
    const domainInfo = domainResult.rows[0];

    return {
      domain: domainInfo,
      current: tensorData,
      trends: {
        memory: memoryTrends,
        sentiment: sentimentTrends,
        drift: driftHistory,
        consensus: consensusHistory
      },
      similar: {
        byMemory: similarByMemory,
        bySentiment: similarBySentiment
      },
      recommendations: this.generateRecommendations(tensorData)
    };
  }

  private generateRecommendations(tensorData: CompositeTensorResult): string[] {
    const recommendations: string[] = [];

    // Based on composite score
    if (tensorData.compositeScore < 0.4) {
      recommendations.push('Domain requires immediate attention - multiple tensor alerts');
    }

    // Based on specific tensor combinations
    if (tensorData.drift?.driftScore && tensorData.drift.driftScore > 0.6 && tensorData.consensus?.consensusScore && tensorData.consensus.consensusScore < 0.5) {
      recommendations.push('High drift with low consensus - consider model recalibration');
    }

    if (tensorData.sentiment?.marketSentiment === 'bearish' && tensorData.grounding?.groundingStrength === 'strong') {
      recommendations.push('Strong negative signals with high confidence - risk mitigation advised');
    }

    if (tensorData.memory?.memoryScore && tensorData.memory.memoryScore > 0.7 && tensorData.sentiment?.sentimentScore && tensorData.sentiment.sentimentScore > 0.7) {
      recommendations.push('High memory and positive sentiment - leverage for strategic advantage');
    }

    return recommendations;
  }

  private startScheduledComputations() {
    // Schedule tensor computations
    setInterval(async () => {
      try {
        await this.computeTensorsForActiveDomains();
      } catch (error) {
        this.logger.error('Scheduled tensor computation failed:', error);
      }
    }, this.config.tensorComputeInterval! * 60 * 1000);

    // Schedule drift detection
    setInterval(async () => {
      try {
        await this.detectDriftForAllDomains();
      } catch (error) {
        this.logger.error('Scheduled drift detection failed:', error);
      }
    }, this.config.driftDetectionInterval! * 60 * 1000);

    // Schedule consensus computation
    setInterval(async () => {
      try {
        await this.computeConsensusForAllDomains();
      } catch (error) {
        this.logger.error('Scheduled consensus computation failed:', error);
      }
    }, this.config.consensusComputeInterval! * 60 * 1000);

    // Schedule memory decay
    setInterval(async () => {
      try {
        await this.memoryTensor.applyMemoryDecay();
      } catch (error) {
        this.logger.error('Memory decay application failed:', error);
      }
    }, 24 * 60 * 60 * 1000); // Daily

    this.logger.info('🔄 Scheduled computations started');
  }

  private async computeTensorsForActiveDomains(): Promise<void> {
    const query = `
      SELECT DISTINCT d.id
      FROM domains d
      JOIN domain_responses dr ON dr.domain_id = d.id
      WHERE dr.created_at > NOW() - INTERVAL '7 days'
      AND d.status = 'active'
      LIMIT 100
    `;

    const result = await this.pool.query(query);
    
    for (const row of result.rows) {
      try {
        await this.computeAllTensors(row.id);
      } catch (error) {
        this.logger.error(`Failed to compute tensors for domain ${row.id}:`, error);
      }
    }
  }

  private async detectDriftForAllDomains(): Promise<void> {
    const query = `
      SELECT id FROM domains WHERE status = 'active' LIMIT 50
    `;

    const result = await this.pool.query(query);
    
    for (const row of result.rows) {
      try {
        await this.driftDetector.detectDrift(row.id);
      } catch (error) {
        this.logger.error(`Failed to detect drift for domain ${row.id}:`, error);
      }
    }
  }

  private async computeConsensusForAllDomains(): Promise<void> {
    const query = `
      SELECT DISTINCT domain_id 
      FROM domain_responses 
      WHERE created_at > NOW() - INTERVAL '24 hours'
      LIMIT 50
    `;

    const result = await this.pool.query(query);
    
    for (const row of result.rows) {
      try {
        await this.consensusScorer.computeConsensus(row.domain_id);
      } catch (error) {
        this.logger.error(`Failed to compute consensus for domain ${row.domain_id}:`, error);
      }
    }
  }

  // Start the service
  async start(): Promise<void> {
    try {
      await this.initialize();
      
      const server = this.app.listen(this.config.port, () => {
        this.logger.info(`🚀 Memory Oracle Tensor Service running on port ${this.config.port}`, {
          port: this.config.port,
          endpoints: {
            health: 'GET /health',
            computeAll: 'POST /tensors/compute',
            query: 'POST /tensors/query',
            memory: 'GET /tensors/memory/:domainId',
            sentiment: 'GET /tensors/sentiment/:domainId',
            grounding: 'GET /tensors/grounding/:domainId',
            drift: 'GET /drift/detect/:domainId',
            consensus: 'GET /consensus/compute/:domainId',
            analysis: 'GET /analysis/domain/:domainId'
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

