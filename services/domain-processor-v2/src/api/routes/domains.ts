import { Router, Request, Response } from 'express';
import { IDatabaseService } from '../../modules/database/interfaces';
import { IDomainProcessor } from '../../modules/domain-processor/interfaces';
import { IJobQueue } from '../../modules/queue/interfaces';
import { ProcessingJob, PromptType } from '../../types';
import { Logger } from '../../utils/logger';

export function createDomainsRouter(
  database: IDatabaseService,
  processor: IDomainProcessor,
  queue: IJobQueue,
  logger: Logger
): Router {
  const router = Router();

  // Process pending domains - standard endpoint
  router.post('/process-pending-domains', async (req: Request, res: Response) => {
    try {
      const batchSize = parseInt(req.query.batchSize as string) || 5;
      const priority = parseInt(req.query.priority as string) || 5;

      // Get pending domains
      const domains = await database.getPendingDomains(batchSize);
      
      if (domains.length === 0) {
        return res.json({
          message: 'No pending domains found',
          processed: 0
        });
      }

      // Add to queue
      const jobs: ProcessingJob[] = domains.map(domain => ({
        domainId: domain.id,
        domain: domain.domain,
        prompts: [PromptType.COMPREHENSIVE_ANALYSIS],
        providers: [],
        priority,
        retryCount: 0,
        createdAt: new Date()
      }));

      await queue.addBatch(jobs, priority);

      res.status(202).json({
        message: 'Domains queued for processing',
        count: domains.length,
        queueStats: queue.getStats()
      });

    } catch (error: any) {
      logger.error('Failed to queue domains', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Ultra-fast processing endpoint
  router.post('/ultra-fast-process', async (req: Request, res: Response) => {
    try {
      const batchSize = parseInt(req.query.batchSize as string) || 50;
      const workerIndex = req.headers['x-worker-index'] || '0';

      logger.info(`Ultra-fast processing request from worker ${workerIndex}`);

      // Get pending domains
      const domains = await database.getPendingDomains(batchSize);
      
      if (domains.length === 0) {
        return res.json({
          message: 'No pending domains found',
          processed: 0,
          timestamp: new Date().toISOString()
        });
      }

      // Process batch directly (bypassing queue for speed)
      const result = await processor.processBatch(domains);

      res.json({
        processed: result.successfulDomains,
        failed: result.failedDomains,
        total: result.totalDomains,
        timestamp: new Date().toISOString(),
        processingTime: result.totalProcessingTime
      });

    } catch (error: any) {
      logger.error('Ultra-fast processing failed', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Get domain status
  router.get('/domains/:id', async (req: Request, res: Response) => {
    try {
      const domainId = parseInt(req.params.id);
      
      const domain = await database.getDomainById(domainId);
      if (!domain) {
        return res.status(404).json({ error: 'Domain not found' });
      }

      const responses = await database.getDomainResponses(domainId);

      res.json({
        domain,
        responses: responses.length,
        lastProcessed: responses[0]?.createdAt
      });

    } catch (error: any) {
      logger.error('Failed to get domain', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Get domain statistics
  router.get('/stats', async (req: Request, res: Response) => {
    try {
      const stats = await database.getDomainStats();
      const queueStats = queue.getStats();

      res.json({
        domains: stats,
        queue: queueStats,
        timestamp: new Date().toISOString()
      });

    } catch (error: any) {
      logger.error('Failed to get stats', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Retry failed domain
  router.post('/domains/:id/retry', async (req: Request, res: Response) => {
    try {
      const domainId = parseInt(req.params.id);
      
      const result = await processor.retryFailedDomain(domainId);

      res.json({
        success: result.success,
        responses: result.responses.length,
        errors: result.errors,
        processingTime: result.processingTime
      });

    } catch (error: any) {
      logger.error('Failed to retry domain', error);
      res.status(500).json({ error: error.message });
    }
  });

  return router;
}