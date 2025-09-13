/**
 * Memory Drift Alert System API Routes
 * Enterprise-tier feature for reputation management
 */

import { Router, Request, Response } from 'express';
import { body, param, query, validationResult } from 'express-validator';
import { MemoryDriftDetector } from '../drift/memory-drift-detector';
import { IDatabaseService } from '../../modules/database/interfaces';
import { Logger } from '../../utils/logger';

export function createDriftRouter(
  driftDetector: MemoryDriftDetector,
  database: IDatabaseService,
  logger: Logger
): Router {
  const router = Router();
  const log = logger.child('drift-routes');

  /**
   * Analyze drift for a specific domain
   * GET /api/v2/drift/:domain/analyze
   */
  router.get('/api/v2/drift/:domain/analyze',
    param('domain').isString().trim().notEmpty(),
    async (req: Request, res: Response) => {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ 
          success: false, 
          errors: errors.array() 
        });
      }

      try {
        const { domain } = req.params;
        const userTier = (req as any).user?.tier || 'free';
        
        // Enterprise only feature
        if (userTier !== 'enterprise') {
          return res.status(403).json({
            success: false,
            error: 'Memory drift analysis requires enterprise tier',
            upgrade: 'https://llmrank.io/pricing'
          });
        }

        log.info('Analyzing drift', { domain, user: (req as any).user?.id });
        
        const analysis = await driftDetector.analyzeDrift(domain);
        
        res.json({
          success: true,
          data: analysis,
          timestamp: new Date()
        });
        
      } catch (error) {
        log.error('Drift analysis failed', { error });
        res.status(500).json({ 
          success: false, 
          error: 'Failed to analyze drift' 
        });
      }
    }
  );

  /**
   * Get active drift alerts
   * GET /api/v2/drift/alerts
   */
  router.get('/api/v2/drift/alerts',
    query('domain').optional().isString(),
    query('severity').optional().isIn(['critical', 'high', 'medium', 'low']),
    query('limit').optional().isInt({ min: 1, max: 100 }),
    async (req: Request, res: Response) => {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ 
          success: false, 
          errors: errors.array() 
        });
      }

      try {
        const { domain, severity, limit = 50 } = req.query;
        const userTier = (req as any).user?.tier || 'free';
        
        // Enterprise only
        if (userTier !== 'enterprise') {
          return res.status(403).json({
            success: false,
            error: 'Drift alerts require enterprise tier',
            upgrade: 'https://llmrank.io/pricing'
          });
        }

        let alerts = await driftDetector.getActiveAlerts(domain as string);
        
        // Filter by severity if requested
        if (severity) {
          alerts = alerts.filter(a => a.severity === severity);
        }
        
        // Apply limit
        alerts = alerts.slice(0, parseInt(limit as string));
        
        res.json({
          success: true,
          data: {
            alerts,
            total: alerts.length,
            critical: alerts.filter(a => a.severity === 'critical').length,
            high: alerts.filter(a => a.severity === 'high').length
          },
          timestamp: new Date()
        });
        
      } catch (error) {
        log.error('Failed to get alerts', { error });
        res.status(500).json({ 
          success: false, 
          error: 'Failed to retrieve alerts' 
        });
      }
    }
  );

  /**
   * Subscribe to drift alerts
   * POST /api/v2/drift/subscribe
   */
  router.post('/api/v2/drift/subscribe',
    body('domain').isString().trim().notEmpty(),
    body('threshold').isFloat({ min: 0, max: 100 }),
    body('frequency').isIn(['realtime', 'hourly', 'daily']),
    body('email').optional().isEmail(),
    body('webhook').optional().isURL(),
    async (req: Request, res: Response) => {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ 
          success: false, 
          errors: errors.array() 
        });
      }

      try {
        const { domain, threshold, frequency, email, webhook } = req.body;
        const userTier = (req as any).user?.tier || 'free';
        
        // Enterprise only
        if (userTier !== 'enterprise') {
          return res.status(403).json({
            success: false,
            error: 'Drift subscriptions require enterprise tier',
            upgrade: 'https://llmrank.io/pricing'
          });
        }
        
        // Must provide at least one notification method
        if (!email && !webhook) {
          return res.status(400).json({
            success: false,
            error: 'Must provide either email or webhook for notifications'
          });
        }

        log.info('Creating drift subscription', { 
          domain, 
          threshold, 
          frequency,
          user: (req as any).user?.id 
        });
        
        const subscription = await driftDetector.subscribe({
          domain,
          threshold,
          frequency,
          email,
          webhook,
          tier: 'enterprise',
          active: true
        });
        
        res.json({
          success: true,
          data: subscription,
          message: 'Drift alert subscription created successfully'
        });
        
      } catch (error) {
        log.error('Failed to create subscription', { error });
        res.status(500).json({ 
          success: false, 
          error: 'Failed to create subscription' 
        });
      }
    }
  );

  /**
   * Get drift report for a domain
   * GET /api/v2/drift/:domain/report
   */
  router.get('/api/v2/drift/:domain/report',
    param('domain').isString().trim().notEmpty(),
    async (req: Request, res: Response) => {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ 
          success: false, 
          errors: errors.array() 
        });
      }

      try {
        const { domain } = req.params;
        const userTier = (req as any).user?.tier || 'free';
        
        // Enterprise only
        if (userTier !== 'enterprise') {
          return res.status(403).json({
            success: false,
            error: 'Drift reports require enterprise tier',
            upgrade: 'https://llmrank.io/pricing'
          });
        }

        log.info('Generating drift report', { domain, user: (req as any).user?.id });
        
        const report = await driftDetector.getDriftReport(domain);
        
        res.json({
          success: true,
          data: report,
          generated: new Date()
        });
        
      } catch (error) {
        log.error('Failed to generate report', { error });
        res.status(500).json({ 
          success: false, 
          error: 'Failed to generate drift report' 
        });
      }
    }
  );

  /**
   * Create manual drift alert
   * POST /api/v2/drift/:domain/alert
   */
  router.post('/api/v2/drift/:domain/alert',
    param('domain').isString().trim().notEmpty(),
    body('severity').optional().isIn(['critical', 'high', 'medium', 'low']),
    async (req: Request, res: Response) => {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ 
          success: false, 
          errors: errors.array() 
        });
      }

      try {
        const { domain } = req.params;
        const userTier = (req as any).user?.tier || 'free';
        
        // Enterprise only
        if (userTier !== 'enterprise') {
          return res.status(403).json({
            success: false,
            error: 'Creating alerts requires enterprise tier',
            upgrade: 'https://llmrank.io/pricing'
          });
        }

        log.info('Creating manual drift alert', { domain, user: (req as any).user?.id });
        
        // First analyze drift
        const analysis = await driftDetector.analyzeDrift(domain);
        
        // Override severity if provided
        if (req.body.severity) {
          analysis.riskLevel = req.body.severity;
        }
        
        // Create alert
        const alert = await driftDetector.createAlert(domain, analysis);
        
        res.json({
          success: true,
          data: alert,
          message: 'Drift alert created successfully'
        });
        
      } catch (error) {
        log.error('Failed to create alert', { error });
        res.status(500).json({ 
          success: false, 
          error: 'Failed to create drift alert' 
        });
      }
    }
  );

  /**
   * Get drift timeline for a domain
   * GET /api/v2/drift/:domain/timeline
   */
  router.get('/api/v2/drift/:domain/timeline',
    param('domain').isString().trim().notEmpty(),
    query('days').optional().isInt({ min: 1, max: 90 }),
    async (req: Request, res: Response) => {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ 
          success: false, 
          errors: errors.array() 
        });
      }

      try {
        const { domain } = req.params;
        const days = parseInt(req.query.days as string) || 30;
        const userTier = (req as any).user?.tier || 'free';
        
        // Premium and enterprise tiers
        if (!['premium', 'enterprise'].includes(userTier)) {
          return res.status(403).json({
            success: false,
            error: 'Drift timeline requires premium or enterprise tier',
            upgrade: 'https://llmrank.io/pricing'
          });
        }

        log.info('Getting drift timeline', { domain, days, user: (req as any).user?.id });
        
        // Get analysis which includes timeline
        const analysis = await driftDetector.analyzeDrift(domain);
        
        res.json({
          success: true,
          data: {
            domain,
            timeline: analysis.timeline,
            currentDrift: analysis.overallDrift,
            velocity: analysis.driftVelocity,
            projectedDrift: analysis.projectedDrift,
            days
          },
          timestamp: new Date()
        });
        
      } catch (error) {
        log.error('Failed to get timeline', { error });
        res.status(500).json({ 
          success: false, 
          error: 'Failed to retrieve drift timeline' 
        });
      }
    }
  );

  /**
   * Batch drift analysis
   * POST /api/v2/drift/batch
   */
  router.post('/api/v2/drift/batch',
    body('domains').isArray({ min: 1, max: 20 }),
    body('domains.*').isString().trim().notEmpty(),
    async (req: Request, res: Response) => {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ 
          success: false, 
          errors: errors.array() 
        });
      }

      try {
        const { domains } = req.body;
        const userTier = (req as any).user?.tier || 'free';
        
        // Enterprise only
        if (userTier !== 'enterprise') {
          return res.status(403).json({
            success: false,
            error: 'Batch drift analysis requires enterprise tier',
            upgrade: 'https://llmrank.io/pricing'
          });
        }

        log.info('Batch drift analysis', { 
          count: domains.length, 
          user: (req as any).user?.id 
        });
        
        // Process domains in parallel
        const results = await Promise.allSettled(
          domains.map(domain => driftDetector.analyzeDrift(domain))
        );
        
        // Format results
        const analyses = results.map((result, index) => {
          if (result.status === 'fulfilled') {
            return {
              domain: domains[index],
              success: true,
              analysis: result.value
            };
          } else {
            return {
              domain: domains[index],
              success: false,
              error: 'Analysis failed'
            };
          }
        });
        
        const successful = analyses.filter(a => a.success).length;
        
        res.json({
          success: true,
          data: {
            analyses,
            summary: {
              total: domains.length,
              successful,
              failed: domains.length - successful,
              criticalDomains: analyses
                .filter(a => a.success && a.analysis.riskLevel === 'critical')
                .map(a => a.domain)
            }
          },
          timestamp: new Date()
        });
        
      } catch (error) {
        log.error('Batch analysis failed', { error });
        res.status(500).json({ 
          success: false, 
          error: 'Failed to perform batch analysis' 
        });
      }
    }
  );

  return router;
}

export default createDriftRouter;