/**
 * AI Zeitgeist Tracker API Routes
 * RESTful endpoints for zeitgeist operations
 */

import { Router, Request, Response, NextFunction } from 'express';
import { Logger } from '../../utils/logger';
import { AIZeitgeistEngine } from './zeitgeist-engine';
import { ZeitgeistQuery, ZeitgeistSubscription, ZeitgeistWebSocketMessage } from './interfaces';
import WebSocket from 'ws';
import { validationResult, body, query, param } from 'express-validator';

export class ZeitgeistAPIRoutes {
  private router: Router;
  private logger: Logger;
  private zeitgeistEngine: AIZeitgeistEngine;
  private wss: WebSocket.Server;

  constructor(zeitgeistEngine: AIZeitgeistEngine, logger: Logger) {
    this.zeitgeistEngine = zeitgeistEngine;
    this.logger = logger.child('zeitgeist-api');
    this.router = Router();
    this.wss = new WebSocket.Server({ noServer: true });
    
    this.initializeRoutes();
    this.initializeWebSocket();
  }

  private initializeRoutes() {
    // Health check
    this.router.get('/health', this.handleHealth.bind(this));

    // Get current zeitgeist snapshot
    this.router.get('/snapshot', this.handleGetSnapshot.bind(this));

    // Query trends
    this.router.get(
      '/trends',
      [
        query('timeRange').optional().isIn(['hour', 'day', 'week', 'month', 'all']),
        query('categories').optional().isString(),
        query('minMomentum').optional().isFloat({ min: 0, max: 100 }),
        query('providers').optional().isString(),
        query('keywords').optional().isString(),
        query('sentiment').optional().isIn(['positive', 'negative', 'neutral', 'all']),
        query('limit').optional().isInt({ min: 1, max: 100 }),
        query('includeVisualization').optional().isBoolean()
      ],
      this.validateRequest.bind(this),
      this.handleGetTrends.bind(this)
    );

    // Get trend by ID
    this.router.get(
      '/trends/:id',
      [
        param('id').isString().notEmpty()
      ],
      this.validateRequest.bind(this),
      this.handleGetTrendById.bind(this)
    );

    // Get emerging topics
    this.router.get(
      '/emerging',
      [
        query('limit').optional().isInt({ min: 1, max: 50 })
      ],
      this.validateRequest.bind(this),
      this.handleGetEmergingTopics.bind(this)
    );

    // Analyze trend trajectory
    this.router.get(
      '/trends/:id/trajectory',
      [
        param('id').isString().notEmpty()
      ],
      this.validateRequest.bind(this),
      this.handleAnalyzeTrajectory.bind(this)
    );

    // Compare provider perspectives
    this.router.get(
      '/perspectives/:topic',
      [
        param('topic').isString().notEmpty()
      ],
      this.validateRequest.bind(this),
      this.handleComparePerspectives.bind(this)
    );

    // Get historical trends
    this.router.get(
      '/history/:topic',
      [
        param('topic').isString().notEmpty(),
        query('days').optional().isInt({ min: 1, max: 365 })
      ],
      this.validateRequest.bind(this),
      this.handleGetHistory.bind(this)
    );

    // Subscribe to alerts
    this.router.post(
      '/subscribe',
      [
        body('filters').optional().isObject(),
        body('alertTypes').isArray().notEmpty(),
        body('webhookUrl').optional().isURL(),
        body('email').optional().isEmail(),
        body('realtime').optional().isBoolean()
      ],
      this.validateRequest.bind(this),
      this.handleSubscribe.bind(this)
    );

    // Unsubscribe
    this.router.delete(
      '/subscribe/:id',
      [
        param('id').isString().notEmpty()
      ],
      this.validateRequest.bind(this),
      this.handleUnsubscribe.bind(this)
    );

    // Force refresh
    this.router.post('/refresh', this.handleForceRefresh.bind(this));

    // Get engine metrics
    this.router.get('/metrics', this.handleGetMetrics.bind(this));

    // WebSocket endpoint
    this.router.get('/ws', (req, res) => {
      res.status(426).send('Upgrade to WebSocket required');
    });

    // Visualization data endpoint
    this.router.get(
      '/visualization/:id',
      [
        param('id').isString().notEmpty()
      ],
      this.validateRequest.bind(this),
      this.handleGetVisualization.bind(this)
    );

    // Export trends data
    this.router.get(
      '/export',
      [
        query('format').optional().isIn(['json', 'csv']),
        query('timeRange').optional().isIn(['hour', 'day', 'week', 'month', 'all'])
      ],
      this.validateRequest.bind(this),
      this.handleExport.bind(this)
    );
  }

  private initializeWebSocket() {
    this.wss.on('connection', (ws: WebSocket, req: any) => {
      const clientId = `zeitgeist_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      this.logger.info('WebSocket client connected', { clientId });

      // Send welcome message
      this.sendWebSocketMessage(ws, {
        type: 'snapshot:update',
        data: { connected: true, clientId },
        timestamp: new Date()
      });

      // Set up trend streaming
      const streamCallback = (trend: any) => {
        this.sendWebSocketMessage(ws, {
          type: 'trend:update',
          data: trend,
          timestamp: new Date()
        });
      };

      this.zeitgeistEngine.streamTrends(streamCallback);

      // Store callback reference for cleanup
      (ws as any).streamCallback = streamCallback;

      ws.on('message', (message: string) => {
        this.handleWebSocketMessage(ws, message, clientId);
      });

      ws.on('close', () => {
        // Clean up stream callback
        if ((ws as any).streamCallback) {
          // In production, implement removeStreamCallback method
          this.logger.info('WebSocket client disconnected', { clientId });
        }
      });

      ws.on('error', (error) => {
        this.logger.error('WebSocket error', { clientId, error });
      });
    });

    // Listen to engine events
    this.zeitgeistEngine.on('alert:generated', (alert) => {
      this.broadcast({
        type: 'trend:alert',
        data: alert,
        timestamp: new Date()
      });
    });
  }

  /**
   * Request validation middleware
   */
  private validateRequest(req: Request, res: Response, next: NextFunction) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }
    next();
  }

  /**
   * Health check handler
   */
  private async handleHealth(req: Request, res: Response) {
    try {
      const metrics = await this.zeitgeistEngine.getEngineMetrics();
      
      res.json({
        success: true,
        status: 'healthy',
        timestamp: new Date().toISOString(),
        metrics: {
          activeTrackings: metrics.activeTrackings,
          subscriptions: metrics.subscriptionCount,
          lastUpdate: metrics.lastUpdate
        }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Health check failed'
      });
    }
  }

  /**
   * Get zeitgeist snapshot handler
   */
  private async handleGetSnapshot(req: Request, res: Response) {
    try {
      const snapshot = await this.zeitgeistEngine.getCurrentZeitgeist();
      
      res.json({
        success: true,
        data: snapshot
      });
    } catch (error) {
      this.logger.error('Failed to get zeitgeist snapshot', { error });
      
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve zeitgeist snapshot'
      });
    }
  }

  /**
   * Get trends handler
   */
  private async handleGetTrends(req: Request, res: Response) {
    try {
      const query: ZeitgeistQuery = {
        timeRange: req.query.timeRange as any,
        categories: req.query.categories ? (req.query.categories as string).split(',') as any : undefined,
        minMomentum: req.query.minMomentum ? parseFloat(req.query.minMomentum as string) : undefined,
        providers: req.query.providers ? (req.query.providers as string).split(',') : undefined,
        keywords: req.query.keywords ? (req.query.keywords as string).split(',') : undefined,
        sentiment: req.query.sentiment as any,
        limit: req.query.limit ? parseInt(req.query.limit as string) : undefined,
        includeVisualization: req.query.includeVisualization === 'true'
      };

      const trends = await this.zeitgeistEngine.getTrends(query);

      res.json({
        success: true,
        count: trends.length,
        data: trends
      });
    } catch (error) {
      this.logger.error('Failed to get trends', { error });
      
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve trends'
      });
    }
  }

  /**
   * Get trend by ID handler
   */
  private async handleGetTrendById(req: Request, res: Response) {
    try {
      const trend = await this.zeitgeistEngine.getTrendById(req.params.id);
      
      if (!trend) {
        return res.status(404).json({
          success: false,
          error: 'Trend not found'
        });
      }

      res.json({
        success: true,
        data: trend
      });
    } catch (error) {
      this.logger.error('Failed to get trend', { error });
      
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve trend'
      });
    }
  }

  /**
   * Get emerging topics handler
   */
  private async handleGetEmergingTopics(req: Request, res: Response) {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 10;
      const topics = await this.zeitgeistEngine.getEmergingTopics(limit);

      res.json({
        success: true,
        count: topics.length,
        data: topics
      });
    } catch (error) {
      this.logger.error('Failed to get emerging topics', { error });
      
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve emerging topics'
      });
    }
  }

  /**
   * Analyze trajectory handler
   */
  private async handleAnalyzeTrajectory(req: Request, res: Response) {
    try {
      const prediction = await this.zeitgeistEngine.analyzeTrendTrajectory(req.params.id);

      res.json({
        success: true,
        data: prediction
      });
    } catch (error) {
      this.logger.error('Failed to analyze trajectory', { error });
      
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to analyze trajectory'
      });
    }
  }

  /**
   * Compare perspectives handler
   */
  private async handleComparePerspectives(req: Request, res: Response) {
    try {
      const divergence = await this.zeitgeistEngine.compareProviderPerspectives(req.params.topic);

      res.json({
        success: true,
        data: divergence
      });
    } catch (error) {
      this.logger.error('Failed to compare perspectives', { error });
      
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to compare perspectives'
      });
    }
  }

  /**
   * Get history handler
   */
  private async handleGetHistory(req: Request, res: Response) {
    try {
      const days = req.query.days ? parseInt(req.query.days as string) : 30;
      const history = await this.zeitgeistEngine.getHistoricalTrends(req.params.topic, days);

      res.json({
        success: true,
        data: history
      });
    } catch (error) {
      this.logger.error('Failed to get history', { error });
      
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve history'
      });
    }
  }

  /**
   * Subscribe handler
   */
  private async handleSubscribe(req: Request, res: Response) {
    try {
      const subscription: ZeitgeistSubscription = {
        id: '',
        userId: 'anonymous', // In production, get from auth
        filters: req.body.filters || {},
        alertTypes: req.body.alertTypes,
        webhookUrl: req.body.webhookUrl,
        email: req.body.email,
        realtime: req.body.realtime || false,
        created: new Date()
      };

      const subscriptionId = await this.zeitgeistEngine.subscribeToAlerts(subscription);

      res.json({
        success: true,
        subscriptionId,
        message: 'Subscription created successfully'
      });
    } catch (error) {
      this.logger.error('Failed to create subscription', { error });
      
      res.status(500).json({
        success: false,
        error: 'Failed to create subscription'
      });
    }
  }

  /**
   * Unsubscribe handler
   */
  private async handleUnsubscribe(req: Request, res: Response) {
    try {
      await this.zeitgeistEngine.unsubscribe(req.params.id);

      res.json({
        success: true,
        message: 'Unsubscribed successfully'
      });
    } catch (error) {
      this.logger.error('Failed to unsubscribe', { error });
      
      res.status(500).json({
        success: false,
        error: 'Failed to unsubscribe'
      });
    }
  }

  /**
   * Force refresh handler
   */
  private async handleForceRefresh(req: Request, res: Response) {
    try {
      await this.zeitgeistEngine.forceRefresh();

      res.json({
        success: true,
        message: 'Refresh initiated',
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      this.logger.error('Failed to force refresh', { error });
      
      res.status(500).json({
        success: false,
        error: 'Failed to initiate refresh'
      });
    }
  }

  /**
   * Get metrics handler
   */
  private async handleGetMetrics(req: Request, res: Response) {
    try {
      const metrics = await this.zeitgeistEngine.getEngineMetrics();

      res.json({
        success: true,
        data: metrics
      });
    } catch (error) {
      this.logger.error('Failed to get metrics', { error });
      
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve metrics'
      });
    }
  }

  /**
   * Get visualization data handler
   */
  private async handleGetVisualization(req: Request, res: Response) {
    try {
      const trend = await this.zeitgeistEngine.getTrendById(req.params.id);
      
      if (!trend) {
        return res.status(404).json({
          success: false,
          error: 'Trend not found'
        });
      }

      // Get trend with visualization data
      const trends = await this.zeitgeistEngine.getTrends({
        includeVisualization: true,
        limit: 1
      });

      const trendWithViz = trends.find(t => t.id === req.params.id);

      res.json({
        success: true,
        data: trendWithViz?.visualizationData || {}
      });
    } catch (error) {
      this.logger.error('Failed to get visualization', { error });
      
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve visualization data'
      });
    }
  }

  /**
   * Export handler
   */
  private async handleExport(req: Request, res: Response) {
    try {
      const format = req.query.format || 'json';
      const timeRange = req.query.timeRange as any;

      const trends = await this.zeitgeistEngine.getTrends({ timeRange });

      if (format === 'csv') {
        // Convert to CSV
        const csv = this.convertToCSV(trends);
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename=zeitgeist-export.csv');
        res.send(csv);
      } else {
        // JSON format
        res.json({
          success: true,
          format: 'json',
          timestamp: new Date().toISOString(),
          count: trends.length,
          data: trends
        });
      }
    } catch (error) {
      this.logger.error('Failed to export data', { error });
      
      res.status(500).json({
        success: false,
        error: 'Failed to export data'
      });
    }
  }

  /**
   * Handle WebSocket messages
   */
  private handleWebSocketMessage(ws: WebSocket, message: string, clientId: string) {
    try {
      const data = JSON.parse(message);
      
      switch (data.type) {
        case 'ping':
          this.sendWebSocketMessage(ws, {
            type: 'snapshot:update',
            data: { pong: true },
            timestamp: new Date()
          });
          break;
        case 'subscribe:metrics':
          // Start sending periodic metrics
          const metricsInterval = setInterval(async () => {
            if (ws.readyState === WebSocket.OPEN) {
              const metrics = await this.zeitgeistEngine.getEngineMetrics();
              this.sendWebSocketMessage(ws, {
                type: 'metrics:update',
                data: metrics,
                timestamp: new Date()
              });
            } else {
              clearInterval(metricsInterval);
            }
          }, 5000);
          break;
        default:
          this.sendWebSocketMessage(ws, {
            type: 'snapshot:update',
            data: { error: 'Unknown message type' },
            timestamp: new Date()
          });
      }
    } catch (error) {
      this.logger.error('Failed to handle WebSocket message', { clientId, error });
    }
  }

  /**
   * Send WebSocket message
   */
  private sendWebSocketMessage(ws: WebSocket, message: ZeitgeistWebSocketMessage) {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(message));
    }
  }

  /**
   * Broadcast to all WebSocket clients
   */
  private broadcast(message: ZeitgeistWebSocketMessage) {
    const payload = JSON.stringify(message);
    
    this.wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(payload);
      }
    });
  }

  /**
   * Convert trends to CSV
   */
  private convertToCSV(trends: any[]): string {
    const headers = [
      'ID', 'Topic', 'Category', 'Momentum', 'Velocity', 
      'Volume', 'Sentiment', 'First Detected', 'Last Updated'
    ];
    
    const rows = trends.map(t => [
      t.id,
      t.topic,
      t.category,
      t.momentum,
      t.velocity,
      t.volume,
      t.sentiment,
      t.firstDetected,
      t.lastUpdated
    ]);
    
    const csv = [
      headers.join(','),
      ...rows.map(r => r.map(v => `"${v}"`).join(','))
    ].join('\n');
    
    return csv;
  }

  /**
   * Get router instance
   */
  getRouter(): Router {
    return this.router;
  }

  /**
   * Handle WebSocket upgrade
   */
  handleWebSocketUpgrade(request: any, socket: any, head: any) {
    this.wss.handleUpgrade(request, socket, head, (ws) => {
      this.wss.emit('connection', ws, request);
    });
  }
}