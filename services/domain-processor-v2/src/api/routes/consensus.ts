/**
 * LLM Consensus API Routes
 * Production endpoints for consensus analysis across all providers
 */

import { Router, Request, Response } from 'express';
import { ConsensusEngine, ConsensusRequest } from '../consensus/consensus-engine';
import { IDatabaseService } from '../../modules/database/interfaces';
import { Logger } from '../../utils/logger';
import { body, param, query, validationResult } from 'express-validator';

export function createConsensusRouter(
  consensusEngine: ConsensusEngine,
  database: IDatabaseService,
  logger: Logger
): Router {
  const router = Router();
  
  /**
   * GET /api/v2/consensus/:domain
   * Get consensus analysis for a specific domain
   */
  router.get('/api/v2/consensus/:domain',
    // Validation
    param('domain').isString().trim().notEmpty().isLength({ max: 255 }),
    query('forceRefresh').optional().isBoolean(),
    query('includeResponseText').optional().isBoolean(),
    query('providers').optional().isString(),
    
    async (req: Request, res: Response) => {
      try {
        // Check validation errors
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
          return res.status(400).json({ 
            error: 'Invalid request',
            details: errors.array() 
          });
        }
        
        const domain = req.params.domain.toLowerCase();
        const forceRefresh = req.query.forceRefresh === 'true';
        const includeResponseText = req.query.includeResponseText === 'true';
        const providers = req.query.providers ? 
          String(req.query.providers).split(',').filter(p => p) : undefined;
        
        const request: ConsensusRequest = {
          domain,
          forceRefresh,
          includeResponseText,
          providers
        };
        
        const result = await consensusEngine.getConsensus(request);
        
        res.json({
          success: true,
          data: result,
          meta: {
            api_version: '2.0',
            endpoint: 'consensus'
          }
        });
        
      } catch (error) {
        logger.error('Consensus API error', { error });
        res.status(500).json({ 
          error: 'Failed to calculate consensus',
          message: error.message 
        });
      }
    }
  );
  
  /**
   * POST /api/v2/consensus/batch
   * Get consensus for multiple domains
   */
  router.post('/api/v2/consensus/batch',
    // Validation
    body('domains').isArray({ min: 1, max: 100 }),
    body('domains.*').isString().trim().notEmpty(),
    body('forceRefresh').optional().isBoolean(),
    body('includeResponseText').optional().isBoolean(),
    
    async (req: Request, res: Response) => {
      try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
          return res.status(400).json({ 
            error: 'Invalid request',
            details: errors.array() 
          });
        }
        
        const { domains, forceRefresh, includeResponseText } = req.body;
        
        // Process batch
        const results = await consensusEngine.getBatchConsensus(domains);
        
        // Convert Map to object for JSON response
        const response: Record<string, any> = {};
        results.forEach((value, key) => {
          response[key] = value;
        });
        
        res.json({
          success: true,
          data: response,
          meta: {
            requested: domains.length,
            successful: results.size,
            failed: domains.length - results.size
          }
        });
        
      } catch (error) {
        logger.error('Batch consensus error', { error });
        res.status(500).json({ 
          error: 'Batch processing failed',
          message: error.message 
        });
      }
    }
  );
  
  /**
   * GET /api/v2/consensus/:domain/trend
   * Get consensus trend over time
   */
  router.get('/api/v2/consensus/:domain/trend',
    param('domain').isString().trim().notEmpty(),
    query('days').optional().isInt({ min: 1, max: 365 }),
    
    async (req: Request, res: Response) => {
      try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
          return res.status(400).json({ 
            error: 'Invalid request',
            details: errors.array() 
          });
        }
        
        const domain = req.params.domain.toLowerCase();
        const days = parseInt(req.query.days as string) || 30;
        
        const trend = await consensusEngine.getConsensusTrend(domain, days);
        
        res.json({
          success: true,
          data: {
            domain,
            period: `${days} days`,
            trend
          }
        });
        
      } catch (error) {
        logger.error('Trend API error', { error });
        res.status(500).json({ 
          error: 'Failed to get trend',
          message: error.message 
        });
      }
    }
  );
  
  /**
   * GET /api/v2/consensus/providers
   * List all available providers and their weights
   */
  router.get('/api/v2/consensus/providers', async (req: Request, res: Response) => {
    try {
      // This would be better from a config, but hardcoding for now
      const providers = {
        active: [
          { id: 'openai', name: 'OpenAI', weight: 1.2, status: 'active' },
          { id: 'anthropic', name: 'Anthropic', weight: 1.2, status: 'active' },
          { id: 'google', name: 'Google', weight: 1.1, status: 'active' },
          { id: 'deepseek', name: 'DeepSeek', weight: 1.0, status: 'active' },
          { id: 'mistral', name: 'Mistral', weight: 1.0, status: 'active' },
          { id: 'xai', name: 'xAI', weight: 1.0, status: 'active' },
          { id: 'together', name: 'Together', weight: 0.9, status: 'active' },
          { id: 'perplexity', name: 'Perplexity', weight: 0.9, status: 'active' },
          { id: 'cohere', name: 'Cohere', weight: 0.9, status: 'active' },
          { id: 'ai21', name: 'AI21', weight: 0.8, status: 'active' },
          { id: 'groq', name: 'Groq', weight: 0.8, status: 'active' }
        ],
        planned: [
          { id: 'meta-llama', name: 'Meta Llama 3.1', status: 'planned' },
          { id: 'openrouter', name: 'OpenRouter', status: 'planned' },
          { id: 'bedrock', name: 'Amazon Bedrock', status: 'planned' },
          { id: 'qwen', name: 'Alibaba Qwen', status: 'planned' },
          { id: 'fireworks', name: 'Fireworks AI', status: 'planned' }
        ]
      };
      
      res.json({
        success: true,
        data: providers,
        meta: {
          total_active: providers.active.length,
          total_planned: providers.planned.length,
          consensus_algorithm: 'weighted_mean_with_outlier_detection'
        }
      });
      
    } catch (error) {
      logger.error('Providers API error', { error });
      res.status(500).json({ 
        error: 'Failed to get providers' 
      });
    }
  });
  
  /**
   * GET /api/v2/consensus/search
   * Search domains with consensus scores
   */
  router.get('/api/v2/consensus/search',
    query('q').isString().trim().notEmpty(),
    query('limit').optional().isInt({ min: 1, max: 100 }),
    query('minScore').optional().isFloat({ min: 0, max: 100 }),
    query('sentiment').optional().isIn(['positive', 'negative', 'neutral', 'mixed']),
    
    async (req: Request, res: Response) => {
      try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
          return res.status(400).json({ 
            error: 'Invalid request',
            details: errors.array() 
          });
        }
        
        const searchQuery = req.query.q as string;
        const limit = parseInt(req.query.limit as string) || 50;
        const minScore = req.query.minScore ? parseFloat(req.query.minScore as string) : undefined;
        const sentiment = req.query.sentiment as string;
        
        // Search database for domains
        let query = `
          SELECT DISTINCT domain, MAX(memory_score) as score
          FROM ai_responses
          WHERE domain ILIKE $1
        `;
        
        const params: any[] = [`%${searchQuery}%`];
        
        if (minScore !== undefined) {
          query += ` AND memory_score >= $2`;
          params.push(minScore);
        }
        
        if (sentiment) {
          query += ` AND sentiment = $${params.length + 1}`;
          params.push(sentiment);
        }
        
        query += ` GROUP BY domain ORDER BY score DESC LIMIT $${params.length + 1}`;
        params.push(limit);
        
        const result = await database.query(query, params);
        
        // Get consensus for each domain
        const domains = result.rows.map(r => r.domain);
        const consensusResults = await consensusEngine.getBatchConsensus(domains);
        
        // Format response
        const searchResults = Array.from(consensusResults.entries()).map(([domain, consensus]) => ({
          domain,
          consensusScore: consensus.consensusScore,
          confidence: consensus.confidence,
          sentiment: consensus.sentiment,
          convergence: consensus.convergence,
          providers: consensus.respondingProviders
        }));
        
        res.json({
          success: true,
          data: {
            query: searchQuery,
            results: searchResults,
            total: searchResults.length
          }
        });
        
      } catch (error) {
        logger.error('Search API error', { error });
        res.status(500).json({ 
          error: 'Search failed',
          message: error.message 
        });
      }
    }
  );
  
  /**
   * WebSocket endpoint for real-time consensus updates
   * This is handled in the main index.ts WebSocket upgrade
   */
  
  return router;
}