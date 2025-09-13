/**
 * AI Zeitgeist Tracker API Routes
 * Viral content generation engine
 */

import { Router, Request, Response } from 'express';
import { ZeitgeistTracker } from '../zeitgeist/zeitgeist-tracker';
import { Logger } from '../../utils/logger';
import { query, validationResult } from 'express-validator';

export function createZeitgeistRouter(
  zeitgeistTracker: ZeitgeistTracker,
  logger: Logger
): Router {
  const router = Router();
  
  /**
   * GET /api/v2/zeitgeist
   * Get current AI zeitgeist snapshot
   */
  router.get('/api/v2/zeitgeist',
    query('forceRefresh').optional().isBoolean(),
    
    async (req: Request, res: Response) => {
      try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
          return res.status(400).json({ 
            error: 'Invalid request',
            details: errors.array() 
          });
        }
        
        const forceRefresh = req.query.forceRefresh === 'true';
        const snapshot = await zeitgeistTracker.getZeitgeist(forceRefresh);
        
        res.json({
          success: true,
          data: snapshot,
          meta: {
            api_version: '2.0',
            endpoint: 'zeitgeist'
          }
        });
        
      } catch (error) {
        logger.error('Zeitgeist API error', { error });
        res.status(500).json({ 
          error: 'Failed to generate zeitgeist',
          message: error.message 
        });
      }
    }
  );
  
  /**
   * GET /api/v2/zeitgeist/trending
   * Get just the trending domains
   */
  router.get('/api/v2/zeitgeist/trending',
    query('momentum').optional().isIn(['rising', 'falling', 'volatile', 'stable']),
    query('minViralScore').optional().isInt({ min: 0, max: 100 }),
    query('limit').optional().isInt({ min: 1, max: 100 }),
    
    async (req: Request, res: Response) => {
      try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
          return res.status(400).json({ 
            error: 'Invalid request',
            details: errors.array() 
          });
        }
        
        const momentum = req.query.momentum as string;
        const minViralScore = parseInt(req.query.minViralScore as string) || 0;
        const limit = parseInt(req.query.limit as string) || 20;
        
        const snapshot = await zeitgeistTracker.getZeitgeist();
        
        let trending = [
          ...snapshot.trending.rising,
          ...snapshot.trending.falling,
          ...snapshot.trending.volatile
        ];
        
        // Filter by momentum if specified
        if (momentum) {
          trending = trending.filter(d => d.momentum === momentum);
        }
        
        // Filter by viral score
        trending = trending.filter(d => d.viralScore >= minViralScore);
        
        // Sort by viral score and limit
        trending = trending
          .sort((a, b) => b.viralScore - a.viralScore)
          .slice(0, limit);
        
        res.json({
          success: true,
          data: {
            trending,
            total: trending.length,
            filters: { momentum, minViralScore }
          }
        });
        
      } catch (error) {
        logger.error('Trending API error', { error });
        res.status(500).json({ 
          error: 'Failed to get trending',
          message: error.message 
        });
      }
    }
  );
  
  /**
   * GET /api/v2/zeitgeist/viral-content
   * Get ready-to-post viral content
   */
  router.get('/api/v2/zeitgeist/viral-content',
    query('platform').optional().isIn(['twitter', 'linkedin', 'hackernews']),
    
    async (req: Request, res: Response) => {
      try {
        const platform = req.query.platform as string;
        const snapshot = await zeitgeistTracker.getZeitgeist();
        
        let content = snapshot.viralContent;
        
        // Filter by platform if specified
        if (platform) {
          content = content.filter(c => c.platform === platform);
        }
        
        res.json({
          success: true,
          data: {
            content,
            total: content.length,
            readyToPost: content.filter(c => 
              new Date(c.bestPostTime) <= new Date(Date.now() + 3600000) // Within next hour
            ).length
          }
        });
        
      } catch (error) {
        logger.error('Viral content API error', { error });
        res.status(500).json({ 
          error: 'Failed to get viral content',
          message: error.message 
        });
      }
    }
  );
  
  /**
   * GET /api/v2/zeitgeist/insights
   * Get AI consensus insights
   */
  router.get('/api/v2/zeitgeist/insights',
    query('type').optional().isIn(['consensus_shift', 'outlier_alert', 'category_trend', 'sentiment_flip']),
    query('impact').optional().isIn(['high', 'medium', 'low']),
    
    async (req: Request, res: Response) => {
      try {
        const insightType = req.query.type as string;
        const impact = req.query.impact as string;
        
        const snapshot = await zeitgeistTracker.getZeitgeist();
        let insights = snapshot.insights;
        
        // Filter by type
        if (insightType) {
          insights = insights.filter(i => i.type === insightType);
        }
        
        // Filter by impact
        if (impact) {
          insights = insights.filter(i => i.impact === impact);
        }
        
        res.json({
          success: true,
          data: {
            insights,
            total: insights.length,
            highImpact: insights.filter(i => i.impact === 'high').length
          }
        });
        
      } catch (error) {
        logger.error('Insights API error', { error });
        res.status(500).json({ 
          error: 'Failed to get insights',
          message: error.message 
        });
      }
    }
  );
  
  /**
   * GET /api/v2/zeitgeist/history
   * Get historical zeitgeist data
   */
  router.get('/api/v2/zeitgeist/history',
    query('days').optional().isInt({ min: 1, max: 30 }),
    
    async (req: Request, res: Response) => {
      try {
        const days = parseInt(req.query.days as string) || 7;
        const history = await zeitgeistTracker.getZeitgeistHistory(days);
        
        res.json({
          success: true,
          data: {
            period: `${days} days`,
            history
          }
        });
        
      } catch (error) {
        logger.error('History API error', { error });
        res.status(500).json({ 
          error: 'Failed to get history',
          message: error.message 
        });
      }
    }
  );
  
  /**
   * POST /api/v2/zeitgeist/share
   * Share viral content (tracks engagement)
   */
  router.post('/api/v2/zeitgeist/share',
    async (req: Request, res: Response) => {
      try {
        const { platform, contentId, domain } = req.body;
        
        // Track share for analytics
        logger.info('Viral content shared', { platform, contentId, domain });
        
        // This could integrate with social media APIs
        // For now, just acknowledge
        
        res.json({
          success: true,
          message: 'Share tracked successfully',
          data: {
            platform,
            domain,
            timestamp: new Date().toISOString()
          }
        });
        
      } catch (error) {
        logger.error('Share tracking error', { error });
        res.status(500).json({ 
          error: 'Failed to track share',
          message: error.message 
        });
      }
    }
  );
  
  /**
   * GET /api/v2/zeitgeist/feed
   * Real-time feed endpoint (for UI integration)
   */
  router.get('/api/v2/zeitgeist/feed',
    query('format').optional().isIn(['json', 'rss', 'atom']),
    
    async (req: Request, res: Response) => {
      try {
        const format = req.query.format || 'json';
        const snapshot = await zeitgeistTracker.getZeitgeist();
        
        if (format === 'json') {
          // Simplified feed format for easy consumption
          const feed = {
            title: 'AI Zeitgeist Feed',
            updated: snapshot.timestamp,
            items: [
              // Top trending domains
              ...snapshot.trending.rising.slice(0, 5).map(d => ({
                type: 'trending',
                title: d.headline,
                description: `${d.domain} is ${d.momentum} with ${d.changePercent.toFixed(1)}% change`,
                domain: d.domain,
                score: d.currentScore,
                change: d.changePercent,
                viral: d.viralScore,
                timestamp: d.lastUpdated
              })),
              // Top insights
              ...snapshot.insights.slice(0, 3).map(i => ({
                type: 'insight',
                title: i.title,
                description: i.description,
                quote: i.shareableQuote,
                impact: i.impact,
                domains: i.affectedDomains,
                timestamp: snapshot.timestamp
              }))
            ].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
          };
          
          res.json({
            success: true,
            data: feed
          });
          
        } else {
          // TODO: Implement RSS/Atom feed formats
          res.status(501).json({ 
            error: 'Feed format not implemented yet' 
          });
        }
        
      } catch (error) {
        logger.error('Feed API error', { error });
        res.status(500).json({ 
          error: 'Failed to generate feed',
          message: error.message 
        });
      }
    }
  );
  
  return router;
}