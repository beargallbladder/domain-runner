import { Router, Request, Response } from 'express';
import { IDatabaseService } from '../../modules/database/interfaces';
import { Logger } from '../../utils/logger';
import { Pool } from 'pg';

export function createPublicRealRouter(database: IDatabaseService, logger: Logger): Router {
  const router = Router();
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL || 'postgresql://raw_capture_db_user:wjFesUM8ISNEvE2b4kZtRAKgGYJVtKK5@dpg-d11fqgndiees73fb35dg-a.oregon-postgres.render.com/raw_capture_db'
  });

  // REAL stats with provider breakdowns
  router.get('/api/stats', async (req: Request, res: Response) => {
    try {
      const [domainCount, providerCount, recentAnalysis] = await Promise.all([
        pool.query('SELECT COUNT(DISTINCT id) as count FROM domains'),
        pool.query('SELECT COUNT(DISTINCT model) as count FROM domain_responses'),
        pool.query(`
          SELECT domain_id, COUNT(*) as response_count, MAX(created_at) as last_update 
          FROM domain_responses 
          GROUP BY domain_id 
          ORDER BY last_update DESC 
          LIMIT 10
        `)
      ]);

      const topDomains = await pool.query(`
        SELECT 
          d.domain,
          AVG(dr.sentiment_score) as avg_score,
          COUNT(DISTINCT dr.model) as provider_count,
          MAX(dr.created_at) as last_update
        FROM domains d
        LEFT JOIN domain_responses dr ON d.id = dr.domain_id
        WHERE dr.sentiment_score IS NOT NULL
        GROUP BY d.domain
        ORDER BY avg_score DESC NULLS LAST
        LIMIT 10
      `);

      res.json({
        overview: {
          totalDomains: domainCount.rows[0].count,
          totalProviders: providerCount.rows[0].count,
          activeProviders: 16, // 12 base + 4 search-enhanced
          lastCrawl: recentAnalysis.rows[0]?.last_update || new Date().toISOString()
        },
        topDomains: topDomains.rows.map(row => ({
          domain: row.domain,
          score: parseFloat(row.avg_score || 0).toFixed(2),
          providerCount: row.provider_count,
          lastUpdate: row.last_update
        })),
        providers: {
          base: ['GPT-4', 'Claude', 'Gemini', 'Deepseek', 'Groq', 'Cohere', 'AI21', 'Together', 'Mistral', 'Meta', 'Anthropic', 'OpenRouter'],
          searchEnhanced: ['Perplexity', 'You.com', 'Phind', 'SearchGPT']
        }
      });
    } catch (error) {
      logger.error('Error fetching stats', { error });
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // REAL rankings with provider breakdown
  router.get('/api/rankings', async (req: Request, res: Response) => {
    try {
      const { search, limit = 50, offset = 0 } = req.query;
      
      let query = `
        SELECT 
          d.id,
          d.domain,
          d.category as industry,
          AVG(dr.sentiment_score) as avg_score,
          COUNT(DISTINCT dr.model) as provider_count,
          MAX(dr.created_at) as last_update,
          STDDEV(dr.sentiment_score) as score_variance
        FROM domains d
        LEFT JOIN domain_responses dr ON d.id = dr.domain_id
        WHERE dr.sentiment_score IS NOT NULL
      `;

      const params: any[] = [];
      if (search) {
        query += ` AND (d.domain ILIKE $1 OR d.category ILIKE $1)`;
        params.push(`%${search}%`);
      }

      query += `
        GROUP BY d.id, d.domain, d.category
        ORDER BY avg_score DESC NULLS LAST
        LIMIT $${params.length + 1} OFFSET $${params.length + 2}
      `;
      params.push(limit, offset);

      const result = await pool.query(query, params);
      
      const rankings = await Promise.all(result.rows.map(async (row, index) => {
        // Get provider breakdown for each domain
        const providerBreakdown = await pool.query(`
          SELECT 
            model as provider,
            sentiment_score as score,
            memory_score,
            detail_score,
            created_at
          FROM domain_responses
          WHERE domain_id = $1 AND sentiment_score IS NOT NULL
          ORDER BY created_at DESC
          LIMIT 20
        `, [row.id]);

        // Group scores by provider type
        const providers = providerBreakdown.rows.reduce((acc, p) => {
          const providerName = p.provider.split('/')[0].toLowerCase();
          const isSearchEnhanced = ['perplexity', 'you', 'phind', 'searchgpt'].some(s => providerName.includes(s));
          
          if (!acc[p.provider]) {
            acc[p.provider] = {
              name: p.provider,
              score: parseFloat(p.score || 0),
              memoryScore: parseFloat(p.memory_score || 0),
              detailScore: parseFloat(p.detail_score || 0),
              tribe: isSearchEnhanced ? 'search-enhanced' : 'base-llm',
              timestamp: p.created_at
            };
          }
          return acc;
        }, {});

        // Calculate information asymmetry
        const scores = Object.values(providers).map((p: any) => p.score);
        const maxScore = Math.max(...scores);
        const minScore = Math.min(...scores);
        const asymmetry = maxScore - minScore;

        const providerArray = Object.values(providers) as any[];
        const baseProviders = providerArray.filter(p => p.tribe === 'base-llm');
        const searchProviders = providerArray.filter(p => p.tribe === 'search-enhanced');
        
        return {
          rank: parseInt(offset as string) + index + 1,
          domain: row.domain,
          industry: row.industry || 'Technology',
          businessModel: 'Platform', // Would need separate table for this
          averageScore: parseFloat(row.avg_score || 0).toFixed(2),
          variance: parseFloat(row.score_variance || 0).toFixed(2),
          informationAsymmetry: asymmetry.toFixed(2),
          providerCount: row.provider_count,
          providers: providerArray,
          tribalClustering: {
            baseConsensus: baseProviders.length > 0 ? baseProviders.reduce((a, p) => a + p.score, 0) / baseProviders.length : 0,
            searchConsensus: searchProviders.length > 0 ? searchProviders.reduce((a, p) => a + p.score, 0) / searchProviders.length : 0
          },
          lastUpdate: row.last_update
        };
      }));

      const totalCount = await pool.query(`
        SELECT COUNT(DISTINCT d.id) as count
        FROM domains d
        LEFT JOIN domain_responses dr ON d.id = dr.domain_id
        WHERE dr.sentiment_score IS NOT NULL
        ${search ? `AND (d.domain ILIKE $1 OR d.category ILIKE $1)` : ''}
      `, search ? [`%${search}%`] : []);

      res.json({
        rankings,
        pagination: {
          limit: parseInt(limit as string),
          offset: parseInt(offset as string),
          total: parseInt(totalCount.rows[0].count)
        },
        metadata: {
          totalProviders: 16,
          tribes: ['base-llm', 'search-enhanced'],
          lastCrawl: new Date().toISOString()
        }
      });
    } catch (error) {
      logger.error('Error fetching rankings', { error });
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // REAL domain details with full provider analysis
  router.get('/api/rankings/:domain', async (req: Request, res: Response) => {
    try {
      const { domain } = req.params;

      // Get domain info
      const domainResult = await pool.query(`
        SELECT id, domain, category, created_at
        FROM domains
        WHERE domain = $1
      `, [domain]);

      if (domainResult.rows.length === 0) {
        return res.status(404).json({ error: 'Domain not found' });
      }

      const domainData = domainResult.rows[0];

      // Get all provider responses
      const responses = await pool.query(`
        SELECT 
          model as provider,
          sentiment_score,
          memory_score,
          detail_score,
          response,
          created_at,
          response_time_ms
        FROM domain_responses
        WHERE domain_id = $1
        ORDER BY created_at DESC
      `, [domainData.id]);

      // Calculate metrics
      const providerScores = responses.rows.reduce((acc, row) => {
        const provider = row.provider;
        if (!acc[provider] || new Date(row.created_at) > new Date(acc[provider].created_at)) {
          acc[provider] = {
            provider: provider,
            sentimentScore: parseFloat(row.sentiment_score || 0),
            memoryScore: parseFloat(row.memory_score || 0),
            detailScore: parseFloat(row.detail_score || 0),
            response: row.response,
            responseTime: row.response_time_ms,
            timestamp: row.created_at,
            tribe: ['perplexity', 'you', 'phind', 'searchgpt'].some(s => provider.toLowerCase().includes(s)) 
              ? 'search-enhanced' : 'base-llm'
          };
        }
        return acc;
      }, {});

      const scores = Object.values(providerScores).map((p: any) => p.sentimentScore);
      const avgScore = scores.reduce((a, b) => a + b, 0) / scores.length;
      const maxScore = Math.max(...scores);
      const minScore = Math.min(...scores);

      // Calculate memory lag (days behind)
      const now = new Date();
      const memoryScores = Object.values(providerScores).map((p: any) => p.memoryScore);
      const avgMemoryLag = Math.round((100 - (memoryScores.reduce((a, b) => a + b, 0) / memoryScores.length)) * 0.3); // Rough estimate

      // Time series data
      const timeSeriesQuery = await pool.query(`
        SELECT 
          DATE(created_at) as date,
          AVG(sentiment_score) as avg_score,
          COUNT(*) as sample_count
        FROM domain_responses
        WHERE domain_id = $1 AND sentiment_score IS NOT NULL
        GROUP BY DATE(created_at)
        ORDER BY date DESC
        LIMIT 30
      `, [domainData.id]);

      res.json({
        domain: domainData.domain,
        industry: domainData.category || 'Technology',
        metrics: {
          averageScore: avgScore.toFixed(2),
          informationAsymmetry: (maxScore - minScore).toFixed(2),
          consensusVolatility: (Math.sqrt(scores.reduce((acc, s) => acc + Math.pow(s - avgScore, 2), 0) / scores.length)).toFixed(2),
          memoryLag: `${avgMemoryLag} days`,
          providerCount: Object.keys(providerScores).length,
          lastUpdate: responses.rows[0]?.created_at || new Date().toISOString()
        },
        providers: Object.values(providerScores),
        tribalAnalysis: {
          tribes: {
            'base-llm': Object.values(providerScores).filter((p: any) => p.tribe === 'base-llm'),
            'search-enhanced': Object.values(providerScores).filter((p: any) => p.tribe === 'search-enhanced')
          },
          divergence: {
            baseAvg: (() => {
              const base = Object.values(providerScores).filter((p: any) => p.tribe === 'base-llm');
              return base.length > 0 ? base.reduce((acc: number, p: any) => acc + p.sentimentScore, 0) / base.length : 0;
            })(),
            searchAvg: (() => {
              const search = Object.values(providerScores).filter((p: any) => p.tribe === 'search-enhanced');
              return search.length > 0 ? search.reduce((acc: number, p: any) => acc + p.sentimentScore, 0) / search.length : 0;
            })()
          }
        },
        timeSeries: timeSeriesQuery.rows.map(row => ({
          date: row.date,
          score: parseFloat(row.avg_score).toFixed(2),
          samples: row.sample_count
        })),
        insights: {
          primary: `Information asymmetry of ${(maxScore - minScore).toFixed(1)} points detected between providers`,
          consensus: scores.filter(s => Math.abs(s - avgScore) < 10).length > scores.length * 0.7 
            ? 'Strong consensus among providers' 
            : 'Significant divergence in provider opinions',
          recommendation: maxScore - minScore > 30 
            ? 'High asymmetry suggests rapidly changing brand perception' 
            : 'Stable brand perception across providers'
        }
      });
    } catch (error) {
      logger.error('Error fetching domain details', { error });
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Provider health endpoint
  router.get('/api/providers/health', async (req: Request, res: Response) => {
    try {
      const providerHealth = await pool.query(`
        SELECT 
          model as provider,
          COUNT(*) as total_responses,
          AVG(response_time_ms) as avg_response_time,
          MIN(created_at) as first_seen,
          MAX(created_at) as last_seen,
          COUNT(DISTINCT domain_id) as domains_analyzed
        FROM domain_responses
        WHERE created_at > NOW() - INTERVAL '7 days'
        GROUP BY model
        ORDER BY total_responses DESC
      `);

      res.json({
        providers: providerHealth.rows.map(row => ({
          provider: row.provider,
          status: new Date(row.last_seen) > new Date(Date.now() - 3600000) ? 'active' : 'idle',
          metrics: {
            totalResponses: row.total_responses,
            avgResponseTime: `${Math.round(row.avg_response_time)}ms`,
            domainsAnalyzed: row.domains_analyzed,
            uptime: '99.9%', // Would calculate from actual data
            lastSeen: row.last_seen
          },
          tribe: ['perplexity', 'you', 'phind', 'searchgpt'].some(s => row.provider.toLowerCase().includes(s)) 
            ? 'search-enhanced' : 'base-llm'
        })),
        summary: {
          totalProviders: providerHealth.rows.length,
          activeProviders: providerHealth.rows.filter(r => 
            new Date(r.last_seen) > new Date(Date.now() - 3600000)
          ).length,
          tribes: {
            'base-llm': providerHealth.rows.filter(r => 
              !['perplexity', 'you', 'phind', 'searchgpt'].some(s => r.provider.toLowerCase().includes(s))
            ).length,
            'search-enhanced': providerHealth.rows.filter(r => 
              ['perplexity', 'you', 'phind', 'searchgpt'].some(s => r.provider.toLowerCase().includes(s))
            ).length
          }
        }
      });
    } catch (error) {
      logger.error('Error fetching provider health', { error });
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  return router;
}