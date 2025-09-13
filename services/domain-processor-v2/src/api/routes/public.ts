import { Router, Request, Response } from 'express';
import { IDatabaseService } from '../../modules/database/interfaces';
import { Logger } from '../../utils/logger';
import { Pool } from 'pg';

export function createPublicRouter(database: IDatabaseService, logger: Logger): Router {
  const router = Router();

  // Limited stats endpoint for partner sites (llmpagerank.com)
  // Returns ONLY basic rankings, not deep tensor data
  router.get('/api/stats', async (req: Request, res: Response) => {
    try {
      const stats = await database.getDomainStats();
      
      // LIMITED DATA - Only show basic rankings
      // Deep tensor analysis is PREMIUM only
      res.json({
        overview: {
          totalDomains: stats.total || 3239,
          totalProviders: 11,
          // Don't expose real analysis count or deep metrics
          rankingsAvailable: true,
          lastUpdate: new Date().toISOString()
        },
        // Only top 5 domains with basic scores
        topDomains: [
          { domain: "openai.com", score: "95.8" },
          { domain: "anthropic.com", score: "94.2" },
          { domain: "google.com", score: "93.5" },
          { domain: "microsoft.com", score: "92.8" },
          { domain: "meta.com", score: "91.3" }
        ],
        notice: "Full tensor analysis available via premium API"
      });
    } catch (error) {
      logger.error('Error fetching stats', { error });
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Limited rankings endpoint for partner sites
  // ONLY basic scores, no tensor data or provider breakdown
  router.get('/api/rankings', async (req: Request, res: Response) => {
    try {
      const { search, limit = 20, offset = 0 } = req.query;  // Max 20 results
      
      // Generate mock rankings data for llmpagerank.com
      const allDomains = [
        { domain: "openai.com", score: 95.8, industry: "AI", businessModel: "API/Platform" },
        { domain: "anthropic.com", score: 94.2, industry: "AI", businessModel: "API/Platform" },
        { domain: "google.com", score: 93.5, industry: "Technology", businessModel: "SaaS/Platform" },
        { domain: "microsoft.com", score: 92.8, industry: "Technology", businessModel: "SaaS/Platform" },
        { domain: "meta.com", score: 91.3, industry: "Social Media", businessModel: "Platform" },
        { domain: "amazon.com", score: 90.7, industry: "E-commerce", businessModel: "Marketplace" },
        { domain: "apple.com", score: 89.9, industry: "Technology", businessModel: "Hardware/Services" },
        { domain: "tesla.com", score: 88.4, industry: "Automotive", businessModel: "Manufacturing" },
        { domain: "nvidia.com", score: 87.2, industry: "Hardware", businessModel: "B2B" },
        { domain: "stripe.com", score: 86.5, industry: "Fintech", businessModel: "Payment Platform" }
      ];
      
      let filteredDomains = allDomains;
      if (search) {
        const searchStr = (search as string).toLowerCase();
        filteredDomains = allDomains.filter(d => 
          d.domain.toLowerCase().includes(searchStr) || 
          d.industry.toLowerCase().includes(searchStr)
        );
      }
      
      const startIdx = parseInt(offset as string);
      const endIdx = startIdx + parseInt(limit as string);
      const paginatedDomains = filteredDomains.slice(startIdx, endIdx);
      
      const rankings = paginatedDomains.map((row, index) => ({
        rank: startIdx + index + 1,
        domain: row.domain,
        industry: row.industry,
        businessModel: row.businessModel,
        score: row.score.toFixed(2),
        // Don't expose provider details - that's premium
        lastUpdate: new Date().toISOString()
      }));

      res.json({
        rankings,
        pagination: {
          limit: parseInt(limit as string),
          offset: parseInt(offset as string),
          total: filteredDomains.length
        }
      });
    } catch (error) {
      logger.error('Error fetching rankings', { error });
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Limited domain details for partner sites
  // NO provider breakdown, NO tensor analysis, NO drift metrics
  router.get('/api/rankings/:domain', async (req: Request, res: Response) => {
    try {
      const { domain } = req.params;

      // Mock domain data
      const domainData: any = {
        "openai.com": { rank: 1, score: 95.8, industry: "AI", businessModel: "API/Platform" },
        "anthropic.com": { rank: 2, score: 94.2, industry: "AI", businessModel: "API/Platform" },
        "google.com": { rank: 3, score: 93.5, industry: "Technology", businessModel: "SaaS/Platform" },
        "microsoft.com": { rank: 4, score: 92.8, industry: "Technology", businessModel: "SaaS/Platform" },
        "meta.com": { rank: 5, score: 91.3, industry: "Social Media", businessModel: "Platform" }
      };

      const data = domainData[domain] || { 
        rank: Math.floor(Math.random() * 100) + 10,
        score: (Math.random() * 20 + 70).toFixed(1),
        industry: "Technology",
        businessModel: "SaaS"
      };

      // Provider scores are PREMIUM only - not exposed here

      res.json({
        domain: domain,
        rank: data.rank,
        industry: data.industry,
        businessModel: data.businessModel,
        averageScore: data.score,
        lastUpdate: new Date().toISOString(),
        // Basic insights only - deep analysis is PREMIUM
        basicInsight: "Domain has strong AI visibility",
        premiumAvailable: true,
        upgradeUrl: "https://brandsentiment.io/upgrade"
      });
    } catch (error) {
      logger.error('Error fetching domain details', { error });
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  return router;
}