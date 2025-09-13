import { Router, Request, Response } from 'express';
import { IMonitoringService } from '../../modules/monitoring/interfaces';
import { ILLMProviderRegistry } from '../../modules/llm-providers/interfaces';
import { IDatabaseService } from '../../modules/database/interfaces';

export function createHealthRouter(
  monitoring: IMonitoringService,
  providerRegistry: ILLMProviderRegistry,
  database: IDatabaseService
): Router {
  const router = Router();

  // Basic health check
  router.get('/health', async (req: Request, res: Response) => {
    try {
      const healthStatus = await monitoring.getHealthStatus();
      
      const statusCode = healthStatus.status === 'healthy' ? 200 : 
                        healthStatus.status === 'degraded' ? 200 : 503;

      res.status(statusCode).json(healthStatus);
    } catch (error: any) {
      res.status(503).json({
        status: 'unhealthy',
        error: error.message,
        timestamp: new Date()
      });
    }
  });

  // API key status
  router.get('/api-keys', (req: Request, res: Response) => {
    const providers = providerRegistry.getAllProviders();
    const keyStatus: Record<string, boolean> = {};
    
    providers.forEach(provider => {
      keyStatus[provider.name] = provider.isAvailable();
    });

    const workingKeys = Object.values(keyStatus).filter(Boolean).length;

    res.json({
      keys: keyStatus,
      workingKeys,
      totalProviders: providers.length,
      timestamp: new Date().toISOString()
    });
  });

  // Provider metrics
  router.get('/provider-usage', (req: Request, res: Response) => {
    const providers = providerRegistry.getAllProviders();
    const usage: Record<string, any> = {};

    providers.forEach(provider => {
      usage[provider.name] = {
        ...provider.getMetrics(),
        model: provider.model,
        tier: provider.tier,
        available: provider.isAvailable()
      };
    });

    res.json({
      usage,
      timestamp: new Date().toISOString()
    });
  });

  // System metrics
  router.get('/metrics', async (req: Request, res: Response) => {
    try {
      const summary = await monitoring.getMetricsSummary();
      res.json(summary);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Alerts
  router.get('/alerts', async (req: Request, res: Response) => {
    try {
      const alerts = await monitoring.checkAlerts();
      res.json({
        alerts,
        count: alerts.length,
        timestamp: new Date().toISOString()
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  return router;
}