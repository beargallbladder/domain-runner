/**
 * LLM Consensus API Routes
 * RESTful endpoints for consensus operations
 */

import { Router, Request, Response, NextFunction } from 'express';
import { Logger } from '../../utils/logger';
import { LLMConsensusEngine } from './consensus-engine';
import { ConsensusRequest, ConsensusWebSocketMessage } from './interfaces';
import WebSocket from 'ws';
import { validationResult, body, query } from 'express-validator';

export class ConsensusAPIRoutes {
  private router: Router;
  private logger: Logger;
  private consensusEngine: LLMConsensusEngine;
  private wss: WebSocket.Server;

  constructor(consensusEngine: LLMConsensusEngine, logger: Logger) {
    this.consensusEngine = consensusEngine;
    this.logger = logger.child('consensus-api');
    this.router = Router();
    this.wss = new WebSocket.Server({ noServer: true });
    
    this.initializeRoutes();
    this.initializeWebSocket();
  }

  private initializeRoutes() {
    // Health check
    this.router.get('/health', this.handleHealth.bind(this));

    // Get consensus for a domain
    this.router.post(
      '/consensus',
      [
        body('domain').isString().notEmpty().trim(),
        body('promptType').optional().isIn(['brand', 'technical', 'financial', 'sentiment', 'all']),
        body('includeProviders').optional().isArray(),
        body('excludeProviders').optional().isArray(),
        body('timeout').optional().isInt({ min: 1000, max: 60000 }),
        body('includeMetadata').optional().isBoolean(),
        body('realtime').optional().isBoolean()
      ],
      this.validateRequest.bind(this),
      this.handleGetConsensus.bind(this)
    );

    // Get provider statuses
    this.router.get('/providers/status', this.handleProviderStatus.bind(this));

    // Get consensus history
    this.router.get(
      '/consensus/history/:domain',
      [
        query('limit').optional().isInt({ min: 1, max: 100 })
      ],
      this.validateRequest.bind(this),
      this.handleGetHistory.bind(this)
    );

    // Invalidate cache
    this.router.delete(
      '/consensus/cache/:domain',
      this.handleInvalidateCache.bind(this)
    );

    // Batch consensus requests
    this.router.post(
      '/consensus/batch',
      [
        body('domains').isArray({ min: 1, max: 50 }),
        body('domains.*.domain').isString().notEmpty(),
        body('domains.*.promptType').optional().isIn(['brand', 'technical', 'financial', 'sentiment', 'all'])
      ],
      this.validateRequest.bind(this),
      this.handleBatchConsensus.bind(this)
    );

    // WebSocket upgrade endpoint
    this.router.get('/ws', (req, res) => {
      res.status(426).send('Upgrade to WebSocket required');
    });

    // Metrics endpoint
    this.router.get('/metrics', this.handleMetrics.bind(this));

    // Memory drift detection endpoint
    this.router.get(
      '/drift/:domain',
      this.handleDriftDetection.bind(this)
    );

    // Real-time subscription management
    this.router.post(
      '/subscribe',
      [
        body('domain').isString().notEmpty(),
        body('events').optional().isArray()
      ],
      this.validateRequest.bind(this),
      this.handleSubscribe.bind(this)
    );
  }

  private initializeWebSocket() {
    this.wss.on('connection', (ws: WebSocket, req: any) => {
      const clientId = `client_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      this.logger.info('WebSocket client connected', { clientId });

      // Send welcome message
      this.sendWebSocketMessage(ws, {
        type: 'consensus:status',
        data: { connected: true, clientId },
        timestamp: new Date().toISOString()
      });

      ws.on('message', (message: string) => {
        this.handleWebSocketMessage(ws, message, clientId);
      });

      ws.on('close', () => {
        this.logger.info('WebSocket client disconnected', { clientId });
      });

      ws.on('error', (error) => {
        this.logger.error('WebSocket error', { clientId, error });
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
      const metrics = this.consensusEngine.getMetrics();
      const providerStatuses = await this.consensusEngine.getProviderStatuses();
      
      res.json({
        success: true,
        status: 'healthy',
        timestamp: new Date().toISOString(),
        metrics,
        providers: {
          total: providerStatuses.size,
          available: Array.from(providerStatuses.values()).filter(p => p.available).length
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
   * Get consensus handler
   */
  private async handleGetConsensus(req: Request, res: Response) {
    try {
      const request: ConsensusRequest = req.body;
      
      this.logger.info('Processing consensus request', {
        domain: request.domain,
        promptType: request.promptType
      });

      const response = await this.consensusEngine.getConsensus(request);

      // Remove detailed content if metadata not requested
      if (!request.includeMetadata) {
        response.providers = response.providers.map(p => ({
          ...p,
          content: undefined // Remove full content to reduce payload
        }));
      }

      res.json({
        success: true,
        data: response
      });
    } catch (error) {
      this.logger.error('Consensus request failed', { error });
      
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Consensus generation failed'
      });
    }
  }

  /**
   * Get provider status handler
   */
  private async handleProviderStatus(req: Request, res: Response) {
    try {
      const statuses = await this.consensusEngine.getProviderStatuses();
      
      const response = {
        success: true,
        timestamp: new Date().toISOString(),
        providers: Array.from(statuses.entries()).map(([name, status]) => ({
          name,
          ...status
        }))
      };

      res.json(response);
    } catch (error) {
      this.logger.error('Failed to get provider status', { error });
      
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve provider status'
      });
    }
  }

  /**
   * Get consensus history handler
   */
  private async handleGetHistory(req: Request, res: Response) {
    try {
      const domain = req.params.domain;
      const limit = parseInt(req.query.limit as string) || 10;

      const history = await this.consensusEngine.getConsensusHistory(domain, limit);

      res.json({
        success: true,
        domain,
        count: history.length,
        history
      });
    } catch (error) {
      this.logger.error('Failed to get consensus history', { error });
      
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve consensus history'
      });
    }
  }

  /**
   * Invalidate cache handler
   */
  private async handleInvalidateCache(req: Request, res: Response) {
    try {
      const domain = req.params.domain;
      
      await this.consensusEngine.invalidateCache(domain);

      res.json({
        success: true,
        message: `Cache invalidated for domain: ${domain}`,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      this.logger.error('Failed to invalidate cache', { error });
      
      res.status(500).json({
        success: false,
        error: 'Failed to invalidate cache'
      });
    }
  }

  /**
   * Batch consensus handler
   */
  private async handleBatchConsensus(req: Request, res: Response) {
    try {
      const { domains } = req.body;
      
      this.logger.info('Processing batch consensus request', {
        count: domains.length
      });

      // Process in parallel with concurrency limit
      const results = await Promise.allSettled(
        domains.map((domain: any) => 
          this.consensusEngine.getConsensus(domain)
        )
      );

      const responses = results.map((result, index) => {
        if (result.status === 'fulfilled') {
          return {
            domain: domains[index].domain,
            success: true,
            data: result.value
          };
        } else {
          return {
            domain: domains[index].domain,
            success: false,
            error: result.reason?.message || 'Processing failed'
          };
        }
      });

      res.json({
        success: true,
        processed: domains.length,
        successful: responses.filter(r => r.success).length,
        failed: responses.filter(r => !r.success).length,
        results: responses
      });
    } catch (error) {
      this.logger.error('Batch consensus failed', { error });
      
      res.status(500).json({
        success: false,
        error: 'Batch processing failed'
      });
    }
  }

  /**
   * Metrics handler
   */
  private async handleMetrics(req: Request, res: Response) {
    try {
      const engineMetrics = this.consensusEngine.getMetrics();
      const providerStatuses = await this.consensusEngine.getProviderStatuses();

      const metrics = {
        engine: engineMetrics,
        providers: {
          total: providerStatuses.size,
          available: Array.from(providerStatuses.values()).filter(p => p.available).length,
          averageHealth: this.calculateAverageHealth(providerStatuses)
        },
        websocket: {
          connections: this.wss.clients.size
        },
        timestamp: new Date().toISOString()
      };

      res.json({
        success: true,
        metrics
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
   * Drift detection handler
   */
  private async handleDriftDetection(req: Request, res: Response) {
    try {
      const domain = req.params.domain;
      
      // Force a fresh consensus check
      const consensus = await this.consensusEngine.getConsensus({
        domain,
        realtime: true,
        includeMetadata: true
      });

      const drift = consensus.memoryDrift;

      res.json({
        success: true,
        domain,
        drift: drift || {
          detected: false,
          severity: 'low',
          driftScore: 0,
          affectedProviders: [],
          suggestedAction: 'monitor'
        },
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      this.logger.error('Drift detection failed', { error });
      
      res.status(500).json({
        success: false,
        error: 'Drift detection failed'
      });
    }
  }

  /**
   * Subscription handler
   */
  private async handleSubscribe(req: Request, res: Response) {
    try {
      const { domain, events } = req.body;
      const subscriptionId = `sub_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      // In production, store subscription in database
      this.logger.info('Subscription created', {
        subscriptionId,
        domain,
        events
      });

      res.json({
        success: true,
        subscriptionId,
        domain,
        events: events || ['all'],
        websocketUrl: `/api/consensus/ws`,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      this.logger.error('Subscription failed', { error });
      
      res.status(500).json({
        success: false,
        error: 'Subscription creation failed'
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
        case 'subscribe':
          this.handleWebSocketSubscribe(ws, data, clientId);
          break;
        case 'unsubscribe':
          this.handleWebSocketUnsubscribe(ws, data, clientId);
          break;
        case 'ping':
          this.sendWebSocketMessage(ws, {
            type: 'consensus:status',
            data: { pong: true },
            timestamp: new Date().toISOString()
          });
          break;
        default:
          this.sendWebSocketMessage(ws, {
            type: 'consensus:error',
            data: { error: 'Unknown message type' },
            timestamp: new Date().toISOString()
          });
      }
    } catch (error) {
      this.logger.error('Failed to handle WebSocket message', { clientId, error });
      
      this.sendWebSocketMessage(ws, {
        type: 'consensus:error',
        data: { error: 'Invalid message format' },
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Handle WebSocket subscription
   */
  private handleWebSocketSubscribe(ws: WebSocket, data: any, clientId: string) {
    const { domain } = data;
    
    if (!domain) {
      this.sendWebSocketMessage(ws, {
        type: 'consensus:error',
        data: { error: 'Domain required for subscription' },
        timestamp: new Date().toISOString()
      });
      return;
    }

    // Subscribe to consensus updates
    const callback = (response: any) => {
      this.sendWebSocketMessage(ws, {
        type: 'consensus:update',
        domain,
        data: response,
        timestamp: new Date().toISOString()
      });
    };

    this.consensusEngine.subscribeToUpdates(domain, callback);

    // Store subscription reference on WebSocket
    (ws as any).subscriptions = (ws as any).subscriptions || new Map();
    (ws as any).subscriptions.set(domain, callback);

    this.sendWebSocketMessage(ws, {
      type: 'consensus:status',
      data: { subscribed: true, domain },
      timestamp: new Date().toISOString()
    });

    this.logger.info('WebSocket subscription created', { clientId, domain });
  }

  /**
   * Handle WebSocket unsubscription
   */
  private handleWebSocketUnsubscribe(ws: WebSocket, data: any, clientId: string) {
    const { domain } = data;
    
    if (!domain) {
      return;
    }

    const subscriptions = (ws as any).subscriptions;
    if (subscriptions && subscriptions.has(domain)) {
      const callback = subscriptions.get(domain);
      this.consensusEngine.unsubscribe(domain, callback);
      subscriptions.delete(domain);
    }

    this.sendWebSocketMessage(ws, {
      type: 'consensus:status',
      data: { unsubscribed: true, domain },
      timestamp: new Date().toISOString()
    });

    this.logger.info('WebSocket subscription removed', { clientId, domain });
  }

  /**
   * Send WebSocket message
   */
  private sendWebSocketMessage(ws: WebSocket, message: ConsensusWebSocketMessage) {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(message));
    }
  }

  /**
   * Calculate average health score
   */
  private calculateAverageHealth(statuses: Map<string, any>): number {
    const scores = Array.from(statuses.values()).map(s => s.healthScore);
    if (scores.length === 0) return 0;
    
    return Math.round(scores.reduce((sum, score) => sum + score, 0) / scores.length);
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

  /**
   * Broadcast to all WebSocket clients
   */
  broadcast(message: ConsensusWebSocketMessage) {
    const payload = JSON.stringify(message);
    
    this.wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(payload);
      }
    });
  }
}