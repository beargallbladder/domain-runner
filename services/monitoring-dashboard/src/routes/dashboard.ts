import { Router, Request, Response } from 'express';
import { DashboardAggregator } from '../services/dashboard-aggregator';

export function createDashboardRoutes(dashboardAggregator: DashboardAggregator): Router {
  const router = Router();

  // Get full dashboard data
  router.get('/', async (_req: Request, res: Response) => {
    try {
      const dashboard = await dashboardAggregator.getFullDashboard();
      res.json(dashboard);
    } catch (error) {
      res.status(500).json({
        error: 'Failed to fetch dashboard data',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Get summary only
  router.get('/summary', async (_req: Request, res: Response) => {
    try {
      const summary = await dashboardAggregator.getSummary();
      res.json(summary);
    } catch (error) {
      res.status(500).json({
        error: 'Failed to fetch summary',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Get service details
  router.get('/services', async (_req: Request, res: Response) => {
    try {
      const services = await dashboardAggregator.getServiceDetails();
      res.json(services);
    } catch (error) {
      res.status(500).json({
        error: 'Failed to fetch service details',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Get processing status
  router.get('/processing', async (_req: Request, res: Response) => {
    try {
      const processing = await dashboardAggregator.getProcessingStatus();
      res.json(processing);
    } catch (error) {
      res.status(500).json({
        error: 'Failed to fetch processing status',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Get service comparison
  router.get('/comparison', async (_req: Request, res: Response) => {
    try {
      const comparison = await dashboardAggregator.getServiceComparison();
      res.json(comparison);
    } catch (error) {
      res.status(500).json({
        error: 'Failed to fetch service comparison',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  return router;
}