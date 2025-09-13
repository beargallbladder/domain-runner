import { Router, Request, Response } from 'express';
import { MetricsCollector } from '../services/metrics-collector';
import { Registry } from 'prom-client';

export function createMetricsRoutes(
  metricsCollector: MetricsCollector,
  register: Registry
): Router {
  const router = Router();

  // Get all metrics in JSON format
  router.get('/', async (_req: Request, res: Response) => {
    try {
      const metrics = await metricsCollector.collectAllMetrics();
      res.json(metrics);
    } catch (error) {
      res.status(500).json({
        error: 'Failed to collect metrics',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Get Prometheus-compatible metrics
  router.get('/prometheus', async (_req: Request, res: Response) => {
    try {
      res.set('Content-Type', register.contentType);
      const metrics = await register.metrics();
      res.end(metrics);
    } catch (error) {
      res.status(500).json({
        error: 'Failed to generate Prometheus metrics',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Get database metrics only
  router.get('/database', async (_req: Request, res: Response) => {
    try {
      const dbMetrics = await metricsCollector.collectDatabaseMetrics();
      res.json(dbMetrics);
    } catch (error) {
      res.status(500).json({
        error: 'Failed to collect database metrics',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Get metrics for a specific service
  router.get('/service/:serviceName', async (req: Request, res: Response) => {
    try {
      const { serviceName } = req.params;
      const metrics = metricsCollector.getLastMetrics(serviceName);
      
      if (!metrics) {
        res.status(404).json({
          error: 'Service metrics not found',
          service: serviceName
        });
        return;
      }

      res.json(metrics);
    } catch (error) {
      res.status(500).json({
        error: 'Failed to fetch service metrics',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Get all cached metrics
  router.get('/cached', (_req: Request, res: Response) => {
    try {
      const allMetrics = metricsCollector.getAllMetrics();
      res.json(allMetrics);
    } catch (error) {
      res.status(500).json({
        error: 'Failed to fetch cached metrics',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  return router;
}