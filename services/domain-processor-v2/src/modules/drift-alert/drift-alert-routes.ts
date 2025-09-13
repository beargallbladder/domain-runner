/**
 * Memory Drift Alert API Routes
 * RESTful endpoints for drift alert operations
 */

import { Router, Request, Response, NextFunction } from 'express';
import { Logger } from '../../utils/logger';
import { MemoryDriftAlertEngine } from './drift-alert-engine';
import { DomainMonitoringConfig, AlertChannel, DriftResolution, DriftWebSocketMessage } from './interfaces';
import WebSocket from 'ws';
import { validationResult, body, query, param } from 'express-validator';

export class DriftAlertAPIRoutes {
  private router: Router;
  private logger: Logger;
  private driftEngine: MemoryDriftAlertEngine;
  private wss: WebSocket.Server;

  constructor(driftEngine: MemoryDriftAlertEngine, logger: Logger) {
    this.driftEngine = driftEngine;
    this.logger = logger.child('drift-alert-api');
    this.router = Router();
    this.wss = new WebSocket.Server({ noServer: true });
    
    this.initializeRoutes();
    this.initializeWebSocket();
  }

  private initializeRoutes() {
    // Health check
    this.router.get('/health', this.handleHealth.bind(this));

    // Check specific domain
    this.router.post(
      '/check/:domain',
      [
        param('domain').isString().notEmpty()
      ],
      this.validateRequest.bind(this),
      this.handleCheckDomain.bind(this)
    );

    // Check all domains
    this.router.post('/check-all', this.handleCheckAll.bind(this));

    // Get active alerts
    this.router.get('/alerts', this.handleGetActiveAlerts.bind(this));

    // Get specific alert
    this.router.get(
      '/alerts/:id',
      [
        param('id').isString().notEmpty()
      ],
      this.validateRequest.bind(this),
      this.handleGetAlert.bind(this)
    );

    // Acknowledge alert
    this.router.post(
      '/alerts/:id/acknowledge',
      [
        param('id').isString().notEmpty(),
        body('acknowledgedBy').isString().notEmpty()
      ],
      this.validateRequest.bind(this),
      this.handleAcknowledgeAlert.bind(this)
    );

    // Resolve alert
    this.router.post(
      '/alerts/:id/resolve',
      [
        param('id').isString().notEmpty(),
        body('resolvedBy').isString().notEmpty(),
        body('method').isIn(['content_published', 'api_updated', 'provider_refreshed', 'manual_correction', 'auto_corrected', 'false_positive_marked']),
        body('notes').optional().isString()
      ],
      this.validateRequest.bind(this),
      this.handleResolveAlert.bind(this)
    );

    // Subscribe to alerts
    this.router.post(
      '/subscribe',
      [
        body('type').isIn(['webhook', 'email', 'slack', 'pagerduty', 'sms']),
        body('config').isObject(),
        body('severityFilter').optional().isArray(),
        body('typeFilter').optional().isArray()
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

    // Domain management
    this.router.post(
      '/domains',
      [
        body('domain').isString().notEmpty(),
        body('priority').isIn(['low', 'medium', 'high', 'critical']),
        body('checkFrequency').optional().isInt({ min: 60000 }),
        body('specificChecks').optional().isArray()
      ],
      this.validateRequest.bind(this),
      this.handleAddDomain.bind(this)
    );

    this.router.delete(
      '/domains/:domain',
      [
        param('domain').isString().notEmpty()
      ],
      this.validateRequest.bind(this),
      this.handleRemoveDomain.bind(this)
    );

    // Analytics endpoints
    this.router.get(
      '/trends/:domain',
      [
        param('domain').isString().notEmpty(),
        query('days').optional().isInt({ min: 1, max: 90 })
      ],
      this.validateRequest.bind(this),
      this.handleGetTrends.bind(this)
    );

    this.router.get(
      '/report',
      [
        query('startDate').isISO8601(),
        query('endDate').isISO8601()
      ],
      this.validateRequest.bind(this),
      this.handleGetReport.bind(this)
    );

    this.router.get(
      '/top-drifted',
      [
        query('limit').optional().isInt({ min: 1, max: 100 })
      ],
      this.validateRequest.bind(this),
      this.handleGetTopDrifted.bind(this)
    );

    // Engine status
    this.router.get('/status', this.handleGetStatus.bind(this));

    // Configuration
    this.router.patch(
      '/config',
      [
        body('enabled').optional().isBoolean(),
        body('checkInterval').optional().isInt({ min: 60000 }),
        body('thresholds').optional().isObject()
      ],
      this.validateRequest.bind(this),
      this.handleUpdateConfig.bind(this)
    );

    // WebSocket endpoint
    this.router.get('/ws', (req, res) => {
      res.status(426).send('Upgrade to WebSocket required');
    });

    // Batch operations
    this.router.post(
      '/batch-check',
      [
        body('domains').isArray({ min: 1, max: 50 }),
        body('domains.*').isString()
      ],
      this.validateRequest.bind(this),
      this.handleBatchCheck.bind(this)
    );
  }

  private initializeWebSocket() {
    this.wss.on('connection', (ws: WebSocket, req: any) => {
      const clientId = `drift_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      this.logger.info('WebSocket client connected', { clientId });

      // Send welcome message
      this.sendWebSocketMessage(ws, {
        type: 'status:update',
        data: { connected: true, clientId },
        timestamp: new Date()
      });

      // Set up alert streaming
      const streamCallback = (alert: any) => {
        this.sendWebSocketMessage(ws, {
          type: 'drift:detected',
          data: alert,
          timestamp: new Date()
        });
      };

      this.driftEngine.streamAlerts(streamCallback);

      // Store callback reference for cleanup
      (ws as any).streamCallback = streamCallback;

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

    // Listen to engine events
    this.driftEngine.on('alert:resolved', (data) => {
      this.broadcast({
        type: 'drift:resolved',
        data,
        timestamp: new Date()
      });
    });

    this.driftEngine.on('update', (data) => {
      this.broadcast(data);
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
      const status = await this.driftEngine.getEngineStatus();
      
      res.json({
        success: true,
        status: 'healthy',
        timestamp: new Date().toISOString(),
        engine: {
          running: status.running,
          activeMonitors: status.activeMonitors,
          lastCheck: status.lastCheck
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
   * Check domain handler
   */
  private async handleCheckDomain(req: Request, res: Response) {
    try {
      const result = await this.driftEngine.checkDomain(req.params.domain);
      
      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      this.logger.error('Domain check failed', { error });
      
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Domain check failed'
      });
    }
  }

  /**
   * Check all domains handler
   */
  private async handleCheckAll(req: Request, res: Response) {
    try {
      const results = await this.driftEngine.checkAllDomains();
      
      res.json({
        success: true,
        count: results.length,
        data: results
      });
    } catch (error) {
      this.logger.error('Check all failed', { error });
      
      res.status(500).json({
        success: false,
        error: 'Failed to check all domains'
      });
    }
  }

  /**
   * Get active alerts handler
   */
  private async handleGetActiveAlerts(req: Request, res: Response) {
    try {
      const alerts = await this.driftEngine.getActiveAlerts();
      
      res.json({
        success: true,
        count: alerts.length,
        data: alerts
      });
    } catch (error) {
      this.logger.error('Failed to get active alerts', { error });
      
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve active alerts'
      });
    }
  }

  /**
   * Get alert handler
   */
  private async handleGetAlert(req: Request, res: Response) {
    try {
      const alert = await this.driftEngine.getAlert(req.params.id);
      
      if (!alert) {
        return res.status(404).json({
          success: false,
          error: 'Alert not found'
        });
      }

      res.json({
        success: true,
        data: alert
      });
    } catch (error) {
      this.logger.error('Failed to get alert', { error });
      
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve alert'
      });
    }
  }

  /**
   * Acknowledge alert handler
   */
  private async handleAcknowledgeAlert(req: Request, res: Response) {
    try {
      await this.driftEngine.acknowledgeAlert(req.params.id, req.body.acknowledgedBy);
      
      res.json({
        success: true,
        message: 'Alert acknowledged successfully'
      });
    } catch (error) {
      this.logger.error('Failed to acknowledge alert', { error });
      
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to acknowledge alert'
      });
    }
  }

  /**
   * Resolve alert handler
   */
  private async handleResolveAlert(req: Request, res: Response) {
    try {
      const resolution: DriftResolution = {
        resolvedAt: new Date(),
        resolvedBy: req.body.resolvedBy,
        method: req.body.method,
        verificationStatus: 'pending',
        notes: req.body.notes
      };

      await this.driftEngine.resolveAlert(req.params.id, resolution);
      
      res.json({
        success: true,
        message: 'Alert resolved successfully'
      });
    } catch (error) {
      this.logger.error('Failed to resolve alert', { error });
      
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to resolve alert'
      });
    }
  }

  /**
   * Subscribe handler
   */
  private async handleSubscribe(req: Request, res: Response) {
    try {
      const channel: AlertChannel = req.body;
      const subscriptionId = await this.driftEngine.subscribe(channel);
      
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
      await this.driftEngine.unsubscribe(req.params.id);
      
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
   * Add domain handler
   */
  private async handleAddDomain(req: Request, res: Response) {
    try {
      const config: DomainMonitoringConfig = req.body;
      await this.driftEngine.addDomain(config);
      
      res.json({
        success: true,
        message: `Domain ${config.domain} added to monitoring`
      });
    } catch (error) {
      this.logger.error('Failed to add domain', { error });
      
      res.status(500).json({
        success: false,
        error: 'Failed to add domain'
      });
    }
  }

  /**
   * Remove domain handler
   */
  private async handleRemoveDomain(req: Request, res: Response) {
    try {
      await this.driftEngine.removeDomain(req.params.domain);
      
      res.json({
        success: true,
        message: `Domain ${req.params.domain} removed from monitoring`
      });
    } catch (error) {
      this.logger.error('Failed to remove domain', { error });
      
      res.status(500).json({
        success: false,
        error: 'Failed to remove domain'
      });
    }
  }

  /**
   * Get trends handler
   */
  private async handleGetTrends(req: Request, res: Response) {
    try {
      const days = parseInt(req.query.days as string) || 30;
      const trends = await this.driftEngine.getDriftTrends(req.params.domain, days);
      
      res.json({
        success: true,
        domain: req.params.domain,
        days,
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
   * Get report handler
   */
  private async handleGetReport(req: Request, res: Response) {
    try {
      const startDate = new Date(req.query.startDate as string);
      const endDate = new Date(req.query.endDate as string);
      
      const report = await this.driftEngine.getDriftReport(startDate, endDate);
      
      res.json({
        success: true,
        data: report
      });
    } catch (error) {
      this.logger.error('Failed to get report', { error });
      
      res.status(500).json({
        success: false,
        error: 'Failed to generate report'
      });
    }
  }

  /**
   * Get top drifted handler
   */
  private async handleGetTopDrifted(req: Request, res: Response) {
    try {
      const limit = parseInt(req.query.limit as string) || 10;
      const domains = await this.driftEngine.getMostDriftedDomains(limit);
      
      res.json({
        success: true,
        count: domains.length,
        data: domains
      });
    } catch (error) {
      this.logger.error('Failed to get top drifted', { error });
      
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve top drifted domains'
      });
    }
  }

  /**
   * Get status handler
   */
  private async handleGetStatus(req: Request, res: Response) {
    try {
      const status = await this.driftEngine.getEngineStatus();
      
      res.json({
        success: true,
        data: status
      });
    } catch (error) {
      this.logger.error('Failed to get status', { error });
      
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve engine status'
      });
    }
  }

  /**
   * Update config handler
   */
  private async handleUpdateConfig(req: Request, res: Response) {
    try {
      await this.driftEngine.updateConfig(req.body);
      
      res.json({
        success: true,
        message: 'Configuration updated successfully'
      });
    } catch (error) {
      this.logger.error('Failed to update config', { error });
      
      res.status(500).json({
        success: false,
        error: 'Failed to update configuration'
      });
    }
  }

  /**
   * Batch check handler
   */
  private async handleBatchCheck(req: Request, res: Response) {
    try {
      const { domains } = req.body;
      
      const results = await Promise.allSettled(
        domains.map((domain: string) => this.driftEngine.checkDomain(domain))
      );

      const response = results.map((result, index) => {
        if (result.status === 'fulfilled') {
          return {
            domain: domains[index],
            success: true,
            data: result.value
          };
        } else {
          return {
            domain: domains[index],
            success: false,
            error: result.reason?.message || 'Check failed'
          };
        }
      });

      res.json({
        success: true,
        processed: domains.length,
        successful: response.filter(r => r.success).length,
        failed: response.filter(r => !r.success).length,
        results: response
      });
    } catch (error) {
      this.logger.error('Batch check failed', { error });
      
      res.status(500).json({
        success: false,
        error: 'Batch check failed'
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
            type: 'status:update',
            data: { pong: true },
            timestamp: new Date()
          });
          break;
        case 'subscribe:status':
          // Start sending periodic status updates
          const statusInterval = setInterval(async () => {
            if (ws.readyState === WebSocket.OPEN) {
              const status = await this.driftEngine.getEngineStatus();
              this.sendWebSocketMessage(ws, {
                type: 'status:update',
                data: status,
                timestamp: new Date()
              });
            } else {
              clearInterval(statusInterval);
            }
          }, 5000);
          break;
        default:
          this.sendWebSocketMessage(ws, {
            type: 'status:update',
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
  private sendWebSocketMessage(ws: WebSocket, message: DriftWebSocketMessage) {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(message));
    }
  }

  /**
   * Broadcast to all WebSocket clients
   */
  private broadcast(message: DriftWebSocketMessage) {
    const payload = JSON.stringify(message);
    
    this.wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(payload);
      }
    });
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