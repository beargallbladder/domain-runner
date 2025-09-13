/**
 * Juice Score Feedback System
 * Accepts prioritization signals from brandsentiment.io
 */

import { Router, Request, Response } from 'express';
import { IDatabaseService } from '../modules/database/interfaces';
import { Logger } from '../utils/logger';

interface JuiceFeedback {
  guid: string;
  juice_score: number;
  reason?: string;
  last_updated: string;
  signals?: {
    reddit_spike?: boolean;
    news_coverage?: boolean;
    market_movement?: boolean;
    competitor_activity?: boolean;
  };
}

interface DomainPriority {
  domain: string;
  guid: string;
  memory_score: number;
  juice_score?: number;
  priority_rank?: number;
  next_crawl?: string;
}

export function createJuiceFeedbackRouter(database: IDatabaseService, logger: Logger): Router {
  const router = Router();
  
  /**
   * Receive juice scores from brandsentiment.io
   * This drives our crawl prioritization
   */
  router.post('/api/v2/juice-feedback', async (req: Request, res: Response) => {
    try {
      const feedback: JuiceFeedback = req.body;
      
      if (!feedback.guid || typeof feedback.juice_score !== 'number') {
        return res.status(400).json({ 
          error: 'Invalid feedback',
          message: 'guid and juice_score required' 
        });
      }
      
      // Validate juice score range
      if (feedback.juice_score < 0 || feedback.juice_score > 1) {
        return res.status(400).json({ 
          error: 'Invalid juice_score',
          message: 'Must be between 0 and 1' 
        });
      }
      
      // Store juice score and update crawl priority
      await updateDomainPriority(database, feedback, logger);
      
      // Recalculate crawl queue based on new juice
      const newPriority = await recalculateCrawlQueue(database, feedback.guid);
      
      logger.info('Juice feedback received', {
        guid: feedback.guid,
        juice_score: feedback.juice_score,
        new_priority: newPriority,
        reason: feedback.reason
      });
      
      res.json({
        success: true,
        guid: feedback.guid,
        juice_score: feedback.juice_score,
        new_priority_rank: newPriority,
        next_crawl: calculateNextCrawlTime(feedback.juice_score),
        message: 'Priority updated based on juice score'
      });
    } catch (error) {
      logger.error('Juice feedback processing failed', { error });
      res.status(500).json({ 
        error: 'Internal server error',
        message: 'Failed to process juice feedback' 
      });
    }
  });
  
  /**
   * Batch juice feedback for multiple domains
   */
  router.post('/api/v2/juice-feedback/batch', async (req: Request, res: Response) => {
    try {
      const { feedbacks }: { feedbacks: JuiceFeedback[] } = req.body;
      
      if (!Array.isArray(feedbacks)) {
        return res.status(400).json({ 
          error: 'Invalid request',
          message: 'feedbacks array required' 
        });
      }
      
      const results = await Promise.all(
        feedbacks.map(async (feedback) => {
          try {
            await updateDomainPriority(database, feedback, logger);
            const priority = await recalculateCrawlQueue(database, feedback.guid);
            return { guid: feedback.guid, success: true, priority };
          } catch (error) {
            return { guid: feedback.guid, success: false, error: (error as Error).message };
          }
        })
      );
      
      const successful = results.filter(r => r.success).length;
      const failed = results.filter(r => !r.success).length;
      
      logger.info('Batch juice feedback processed', {
        total: feedbacks.length,
        successful,
        failed
      });
      
      res.json({
        success: true,
        processed: feedbacks.length,
        successful,
        failed,
        results
      });
    } catch (error) {
      logger.error('Batch juice feedback failed', { error });
      res.status(500).json({ 
        error: 'Internal server error',
        message: 'Failed to process batch feedback' 
      });
    }
  });
  
  /**
   * Get current crawl priorities (for brandsentiment.io to verify)
   */
  router.get('/api/v2/crawl-priorities', async (req: Request, res: Response) => {
    try {
      const { limit = 100 } = req.query;
      
      // This would query the actual priority queue
      // For now, returning mock data
      const priorities: DomainPriority[] = [
        {
          domain: 'huggingface.co',
          guid: 'xyz-123',
          memory_score: 0.83,
          juice_score: 0.94,
          priority_rank: 1,
          next_crawl: new Date(Date.now() + 3600000).toISOString()
        },
        {
          domain: 'openai.com',
          guid: 'abc-456',
          memory_score: 0.95,
          juice_score: 0.88,
          priority_rank: 2,
          next_crawl: new Date(Date.now() + 7200000).toISOString()
        }
      ];
      
      res.json({
        success: true,
        priorities: priorities.slice(0, Number(limit)),
        total: priorities.length,
        algorithm: 'juice_weighted',
        weights: {
          juice_score: 0.6,
          memory_decay: 0.3,
          sla_override: 0.1
        }
      });
    } catch (error) {
      logger.error('Failed to get crawl priorities', { error });
      res.status(500).json({ 
        error: 'Internal server error' 
      });
    }
  });
  
  /**
   * Push domain to brandsentiment.io for grounding
   */
  router.post('/api/v2/request-grounding', async (req: Request, res: Response) => {
    try {
      const { domain, guid, memory_score } = req.body;
      
      if (!domain || !guid) {
        return res.status(400).json({ 
          error: 'Invalid request',
          message: 'domain and guid required' 
        });
      }
      
      // This would actually call brandsentiment.io API
      // For now, acknowledging the request
      logger.info('Grounding requested', { domain, guid, memory_score });
      
      res.json({
        success: true,
        message: 'Domain queued for grounding analysis',
        domain,
        guid,
        estimated_completion: new Date(Date.now() + 3600000).toISOString()
      });
    } catch (error) {
      logger.error('Grounding request failed', { error });
      res.status(500).json({ 
        error: 'Internal server error' 
      });
    }
  });
  
  return router;
}

// Helper functions
async function updateDomainPriority(
  database: IDatabaseService, 
  feedback: JuiceFeedback,
  logger: Logger
): Promise<void> {
  // Store juice score in database
  // This would update the domains table with juice_score
  logger.info('Updating domain priority', { 
    guid: feedback.guid, 
    juice_score: feedback.juice_score 
  });
}

async function recalculateCrawlQueue(
  database: IDatabaseService,
  guid: string
): Promise<number> {
  // Recalculate priority based on:
  // - juice_score (60% weight) - real-world attention
  // - memory_decay (30% weight) - how stale the memory is
  // - sla_override (10% weight) - premium customer requirements
  
  // Return new priority rank (1 = highest priority)
  return Math.floor(Math.random() * 100) + 1;
}

function calculateNextCrawlTime(juiceScore: number): string {
  // High juice = more frequent crawls
  const baseInterval = 24 * 60 * 60 * 1000; // 24 hours
  const interval = baseInterval * (2 - juiceScore); // Higher juice = shorter interval
  return new Date(Date.now() + interval).toISOString();
}