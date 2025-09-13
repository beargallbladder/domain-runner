/**
 * QUICK FIX: Add proper crawl endpoint to the system
 * This is what should have been built from day 1
 */

// Add this to your Express app (clean-index.ts)

interface CrawlRequest {
  domains?: string[] | 'all' | 'recent' | 'stale';
  providers?: string[] | 'all';
  limit?: number;
  force?: boolean;
  priority?: 'high' | 'normal' | 'low';
}

interface CrawlResponse {
  jobId: string;
  status: 'queued' | 'processing' | 'completed' | 'failed';
  domains: number;
  providers: string[];
  estimatedTime: string;
  trackingUrl: string;
}

// Professional crawl endpoint
app.post('/api/v2/crawl', async (req: Request, res: Response) => {
  const { 
    domains = 'recent',
    providers = 'all', 
    limit = 100,
    force = false,
    priority = 'normal'
  }: CrawlRequest = req.body;

  try {
    // Generate job ID
    const jobId = `crawl_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Determine which domains to process
    let domainList: string[] = [];
    
    if (Array.isArray(domains)) {
      domainList = domains;
    } else if (domains === 'all') {
      const result = await pool.query('SELECT domain FROM domains LIMIT $1', [limit]);
      domainList = result.rows.map(r => r.domain);
    } else if (domains === 'recent') {
      const result = await pool.query(
        'SELECT domain FROM domains ORDER BY created_at DESC LIMIT $1', 
        [limit]
      );
      domainList = result.rows.map(r => r.domain);
    } else if (domains === 'stale') {
      const result = await pool.query(`
        SELECT DISTINCT d.domain 
        FROM domains d
        LEFT JOIN domain_responses dr ON d.id = dr.domain_id 
          AND dr.created_at > NOW() - INTERVAL '7 days'
        WHERE dr.id IS NULL OR d.id NOT IN (
          SELECT domain_id FROM domain_responses 
          WHERE llm_provider IN ('cohere', 'groq')
          AND created_at > NOW() - INTERVAL '7 days'
        )
        LIMIT $1
      `, [limit]);
      domainList = result.rows.map(r => r.domain);
    }

    // Determine which providers to use
    const providerList = providers === 'all' 
      ? ['openai', 'anthropic', 'deepseek', 'mistral', 'xai', 'together', 'perplexity', 'google', 'cohere', 'ai21', 'groq']
      : providers;

    // Store job metadata
    await pool.query(`
      INSERT INTO crawl_jobs (id, status, domain_count, providers, priority, created_at)
      VALUES ($1, $2, $3, $4, $5, NOW())
    `, [jobId, 'queued', domainList.length, JSON.stringify(providerList), priority]);

    // Queue the actual processing (in a real system, this would use Redis/Bull/etc)
    setImmediate(async () => {
      await processCrawlJob(jobId, domainList, providerList, force);
    });

    // Calculate estimated time
    const estimatedMinutes = Math.ceil((domainList.length * providerList.length) / 60);
    
    res.json({
      jobId,
      status: 'queued',
      domains: domainList.length,
      providers: providerList,
      estimatedTime: `${estimatedMinutes} minutes`,
      trackingUrl: `/api/v2/crawl/${jobId}`
    });

  } catch (error) {
    logger.error('Crawl endpoint error:', error);
    res.status(500).json({ error: 'Failed to initiate crawl' });
  }
});

// Job status endpoint
app.get('/api/v2/crawl/:jobId', async (req: Request, res: Response) => {
  const { jobId } = req.params;
  
  try {
    const result = await pool.query(`
      SELECT 
        id,
        status,
        domain_count,
        domains_processed,
        providers,
        started_at,
        completed_at,
        error_message,
        (domains_processed::float / NULLIF(domain_count, 0) * 100)::int as progress
      FROM crawl_jobs
      WHERE id = $1
    `, [jobId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Job not found' });
    }

    const job = result.rows[0];
    
    // Get provider-specific progress
    const providerStats = await pool.query(`
      SELECT 
        llm_provider,
        COUNT(*) as responses,
        COUNT(DISTINCT domain_id) as domains
      FROM domain_responses
      WHERE crawl_job_id = $1
      GROUP BY llm_provider
    `, [jobId]);

    res.json({
      ...job,
      providers: JSON.parse(job.providers),
      providerProgress: providerStats.rows,
      duration: job.completed_at 
        ? `${Math.round((job.completed_at - job.started_at) / 1000 / 60)} minutes`
        : 'In progress'
    });

  } catch (error) {
    logger.error('Job status error:', error);
    res.status(500).json({ error: 'Failed to get job status' });
  }
});

// List recent jobs
app.get('/api/v2/crawl', async (req: Request, res: Response) => {
  try {
    const result = await pool.query(`
      SELECT 
        id,
        status,
        domain_count,
        domains_processed,
        providers,
        priority,
        created_at,
        started_at,
        completed_at,
        (domains_processed::float / NULLIF(domain_count, 0) * 100)::int as progress
      FROM crawl_jobs
      ORDER BY created_at DESC
      LIMIT 20
    `);

    res.json({
      jobs: result.rows.map(job => ({
        ...job,
        providers: JSON.parse(job.providers)
      }))
    });

  } catch (error) {
    logger.error('Job list error:', error);
    res.status(500).json({ error: 'Failed to list jobs' });
  }
});

// The actual processing function
async function processCrawlJob(
  jobId: string, 
  domains: string[], 
  providers: string[], 
  force: boolean
) {
  try {
    // Update job status
    await pool.query(
      'UPDATE crawl_jobs SET status = $1, started_at = NOW() WHERE id = $2',
      ['processing', jobId]
    );

    let processed = 0;
    
    // Process in batches
    const batchSize = 10;
    for (let i = 0; i < domains.length; i += batchSize) {
      const batch = domains.slice(i, i + batchSize);
      
      // Process each domain with all providers
      await Promise.all(batch.map(async (domain) => {
        for (const provider of providers) {
          try {
            await processWithProvider(domain, provider, jobId);
          } catch (error) {
            logger.error(`Failed ${provider} for ${domain}:`, error);
          }
        }
      }));
      
      processed += batch.length;
      
      // Update progress
      await pool.query(
        'UPDATE crawl_jobs SET domains_processed = $1 WHERE id = $2',
        [processed, jobId]
      );
    }

    // Mark complete
    await pool.query(
      'UPDATE crawl_jobs SET status = $1, completed_at = NOW() WHERE id = $2',
      ['completed', jobId]
    );

  } catch (error) {
    logger.error('Job processing error:', error);
    await pool.query(
      'UPDATE crawl_jobs SET status = $1, error_message = $2 WHERE id = $3',
      ['failed', error.message, jobId]
    );
  }
}

// Database migration for job tracking
const JOB_TRACKING_SCHEMA = `
CREATE TABLE IF NOT EXISTS crawl_jobs (
  id VARCHAR PRIMARY KEY,
  status VARCHAR NOT NULL,
  domain_count INTEGER,
  domains_processed INTEGER DEFAULT 0,
  providers JSONB,
  priority VARCHAR,
  created_at TIMESTAMP,
  started_at TIMESTAMP,
  completed_at TIMESTAMP,
  error_message TEXT
);

-- Add job reference to responses
ALTER TABLE domain_responses 
ADD COLUMN IF NOT EXISTS crawl_job_id VARCHAR;

CREATE INDEX IF NOT EXISTS idx_crawl_job_status ON crawl_jobs(status);
CREATE INDEX IF NOT EXISTS idx_domain_responses_job ON domain_responses(crawl_job_id);
`;