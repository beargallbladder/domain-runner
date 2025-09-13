import { Router, Request, Response } from 'express';
import { IDatabaseService } from '../../modules/database/interfaces';
import { IDomainProcessor } from '../../modules/domain-processor/interfaces';
import { ILLMProviderRegistry } from '../../modules/llm-providers/interfaces';
import { Logger } from '../../utils/logger';

/**
 * Legacy API routes for backward compatibility with sophisticated-runner
 */
export function createLegacyRouter(
  database: IDatabaseService,
  processor: IDomainProcessor,
  providerRegistry: ILLMProviderRegistry,
  logger: Logger
): Router {
  const router = Router();

  // Legacy health check endpoint
  router.get('/health', (req: Request, res: Response) => {
    res.json({ 
      status: 'healthy', 
      service: 'domain-processor-v2',
      compatibility: 'sophisticated-runner',
      timestamp: new Date().toISOString()
    });
  });

  // Legacy API keys endpoint
  router.get('/api-keys', (req: Request, res: Response) => {
    const providers = providerRegistry.getAllProviders();
    const keys: any = {};
    let workingKeys = 0;

    providers.forEach(provider => {
      const isAvailable = provider.isAvailable();
      keys[provider.name] = isAvailable;
      if (isAvailable) workingKeys++;
    });
    
    res.json({
      keys,
      workingKeys,
      timestamp: new Date().toISOString()
    });
  });

  // Legacy process-pending-domains endpoint
  router.post('/process-pending-domains', async (req: Request, res: Response) => {
    try {
      logger.info('Legacy endpoint: /process-pending-domains');
      
      const batchSize = 50; // Default batch size
      
      // Get pending domains
      const domains = await database.getPendingDomains(batchSize);
      
      if (domains.length === 0) {
        return res.status(202).json({
          message: 'No pending domains found',
          processed: 0,
          status: 'accepted',
          timestamp: new Date().toISOString()
        });
      }

      // Send immediate response to prevent client timeout (legacy behavior)
      res.status(202).json({
        message: 'Processing started',
        status: 'accepted',
        timestamp: new Date().toISOString(),
        batchSize: domains.length
      });

      // Process domains asynchronously (fire and forget like the original)
      setImmediate(async () => {
        try {
          const result = await processor.processBatch(domains);
          logger.info(`Legacy processing completed: ${result.successfulDomains}/${result.totalDomains}`);
        } catch (error: any) {
          logger.error('Legacy processing failed', error);
        }
      });

    } catch (error: any) {
      logger.error('Legacy endpoint error', error);
      if (!res.headersSent) {
        res.status(500).json({ error: error.message });
      }
    }
  });

  // Legacy ultra-fast-process endpoint
  router.post('/ultra-fast-process', async (req: Request, res: Response) => {
    try {
      logger.info('Legacy endpoint: /ultra-fast-process');
      
      const batchSize = parseInt(req.headers['x-batch-size'] as string) || 50;
      const workerIndex = req.headers['x-worker-index'] || '0';

      // Get pending domains
      const domains = await database.getPendingDomains(Math.min(batchSize, 100));
      
      if (domains.length === 0) {
        return res.json({
          message: 'No pending domains found',
          processed: 0,
          timestamp: new Date().toISOString()
        });
      }

      // Process batch directly
      const result = await processor.processBatch(domains);

      res.json({
        processed: result.successfulDomains,
        failed: result.failedDomains,
        total: result.totalDomains,
        timestamp: new Date().toISOString(),
        processingTime: result.totalProcessingTime,
        message: `Ultra-fast processing completed: ${result.successfulDomains}/${result.totalDomains} domains`
      });

    } catch (error: any) {
      logger.error('Legacy ultra-fast processing failed', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Legacy provider-usage endpoint
  router.get('/provider-usage', (req: Request, res: Response) => {
    const providers = providerRegistry.getAllProviders();
    const usage: any = {};

    providers.forEach(provider => {
      const metrics = provider.getMetrics();
      usage[provider.name] = {
        calls: metrics.totalRequests,
        errors: metrics.failedRequests,
        lastCall: metrics.lastRequestAt?.getTime() || 0
      };
    });
    
    res.json({
      usage,
      timestamp: new Date().toISOString()
    });
  });

  return router;
}