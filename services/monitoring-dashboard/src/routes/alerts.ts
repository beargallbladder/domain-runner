import { Router, Request, Response } from 'express';
import { AlertManager } from '../services/alert-manager';

export function createAlertsRoutes(alertManager: AlertManager): Router {
  const router = Router();

  // Get all active alerts
  router.get('/', (_req: Request, res: Response) => {
    try {
      const alerts = alertManager.getActiveAlerts();
      res.json(alerts);
    } catch (error) {
      res.status(500).json({
        error: 'Failed to fetch alerts',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Get active alerts only
  router.get('/active', (_req: Request, res: Response) => {
    try {
      const alerts = alertManager.getActiveAlerts();
      res.json(alerts);
    } catch (error) {
      res.status(500).json({
        error: 'Failed to fetch active alerts',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Get alert history
  router.get('/history', (req: Request, res: Response) => {
    try {
      const limit = parseInt(req.query.limit as string) || 100;
      const history = alertManager.getAlertHistory(limit);
      res.json(history);
    } catch (error) {
      res.status(500).json({
        error: 'Failed to fetch alert history',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Get alerts by severity
  router.get('/severity/:severity', (req: Request, res: Response) => {
    try {
      const { severity } = req.params;
      
      if (!['critical', 'warning', 'info'].includes(severity)) {
        res.status(400).json({
          error: 'Invalid severity level',
          validLevels: ['critical', 'warning', 'info']
        });
        return;
      }

      const alerts = alertManager.getAlertsBySeverity(severity as any);
      res.json(alerts);
    } catch (error) {
      res.status(500).json({
        error: 'Failed to fetch alerts by severity',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Get alerts by service
  router.get('/service/:serviceName', (req: Request, res: Response) => {
    try {
      const { serviceName } = req.params;
      const alerts = alertManager.getAlertsByService(serviceName);
      res.json(alerts);
    } catch (error) {
      res.status(500).json({
        error: 'Failed to fetch alerts by service',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Acknowledge an alert
  router.post('/:alertId/acknowledge', (req: Request, res: Response) => {
    try {
      const { alertId } = req.params;
      alertManager.acknowledgeAlert(alertId);
      res.json({ success: true, alertId });
    } catch (error) {
      res.status(500).json({
        error: 'Failed to acknowledge alert',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Resolve an alert
  router.post('/:alertId/resolve', (req: Request, res: Response) => {
    try {
      const { alertId } = req.params;
      alertManager.resolveAlert(alertId);
      res.json({ success: true, alertId });
    } catch (error) {
      res.status(500).json({
        error: 'Failed to resolve alert',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Clear resolved alerts
  router.post('/clear-resolved', (_req: Request, res: Response) => {
    try {
      alertManager.clearResolvedAlerts();
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({
        error: 'Failed to clear resolved alerts',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  return router;
}