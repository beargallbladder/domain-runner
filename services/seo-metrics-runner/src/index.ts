import express from 'express';
import { Pool } from 'pg';
import * as dotenv from 'dotenv';
import axios from 'axios';
import * as cheerio from 'cheerio';

dotenv.config();

// SEO METRICS RUNNER - STEALTH MODE
console.log('🔍 SEO METRICS RUNNER STARTING');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || '',
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  max: 10,
});

// Stealth configuration
const STEALTH_CONFIG = {
  userAgents: [
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
  ],
  requestDelay: 3000,
  timeout: 15000
};

interface SEOMetrics {
  domain: string;
  httpStatusCode: number;
  pageLoadTime: number;
  pageSize: number;
  domNodes: number;
  httpsEnabled: boolean;
  metaTitle: boolean;
  metaDescription: boolean;
  h1Count: number;
  imageCount: number;
  schemaMarkup: string[];
  mobileViewport: boolean;
  internalLinks: number;
  externalLinks: number;
  capturedAt: Date;
}

class SEOCollector {
  private lastRequest = 0;
  
  private async makeRequest(url: string): Promise<any> {
    // Rate limiting
    const now = Date.now();
    const timeSince = now - this.lastRequest;
    if (timeSince < STEALTH_CONFIG.requestDelay) {
      await new Promise(resolve => setTimeout(resolve, STEALTH_CONFIG.requestDelay - timeSince));
    }
    
    const userAgent = STEALTH_CONFIG.userAgents[Math.floor(Math.random() * STEALTH_CONFIG.userAgents.length)];
    
    console.log(`🔍 Collecting: ${url}`);
    const response = await axios.get(url, {
      headers: { 'User-Agent': userAgent },
      timeout: STEALTH_CONFIG.timeout,
      validateStatus: () => true
    });
    
    this.lastRequest = Date.now();
    return response;
  }
  
  async collectSEOMetrics(domain: string): Promise<SEOMetrics> {
    const startTime = Date.now();
    const url = `https://${domain}`;
    
    try {
      const response = await this.makeRequest(url);
      const $ = cheerio.load(response.data || '');
      
      // Extract schema markup
      const schemas: string[] = [];
      $('script[type="application/ld+json"]').each((_: any, el: any) => {
        try {
          const json = JSON.parse($(el).html() || '');
          if (json['@type']) schemas.push(json['@type']);
        } catch (e) {}
      });
      
      // Count links
      let internalLinks = 0;
      let externalLinks = 0;
      $('a[href]').each((_: any, el: any) => {
        const href = $(el).attr('href');
        if (href) {
          if (href.startsWith('/') || href.includes(domain)) {
            internalLinks++;
          } else if (href.startsWith('http')) {
            externalLinks++;
          }
        }
      });
      
      const metrics: SEOMetrics = {
        domain,
        httpStatusCode: response.status,
        pageLoadTime: Date.now() - startTime,
        pageSize: response.data ? response.data.length : 0,
        domNodes: $('*').length,
        httpsEnabled: url.startsWith('https://'),
        metaTitle: $('title').length > 0,
        metaDescription: $('meta[name="description"]').length > 0,
        h1Count: $('h1').length,
        imageCount: $('img').length,
        schemaMarkup: [...new Set(schemas)],
        mobileViewport: $('meta[name="viewport"]').length > 0,
        internalLinks,
        externalLinks,
        capturedAt: new Date()
      };
      
      console.log(`✅ ${domain}: ${metrics.httpStatusCode}, ${metrics.pageLoadTime}ms`);
      return metrics;
      
    } catch (error) {
      console.error(`❌ Failed ${domain}:`, error);
      throw error;
    }
  }
}

class SEODatabase {
  async ensureTables(): Promise<void> {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS seo_metrics (
        id SERIAL PRIMARY KEY,
        domain VARCHAR(255) NOT NULL,
        http_status_code INTEGER,
        page_load_time INTEGER,
        page_size INTEGER,
        dom_nodes INTEGER,
        https_enabled BOOLEAN,
        meta_title BOOLEAN,
        meta_description BOOLEAN,
        h1_count INTEGER,
        image_count INTEGER,
        schema_markup JSONB,
        mobile_viewport BOOLEAN,
        internal_links INTEGER,
        external_links INTEGER,
        captured_at TIMESTAMP DEFAULT NOW()
      )
    `);
    
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_seo_domain ON seo_metrics(domain)`);
    console.log('✅ SEO tables ready');
  }
  
  async storeMetrics(metrics: SEOMetrics): Promise<void> {
    await pool.query(`
      INSERT INTO seo_metrics (
        domain, http_status_code, page_load_time, page_size, dom_nodes,
        https_enabled, meta_title, meta_description, h1_count, image_count,
        schema_markup, mobile_viewport, internal_links, external_links, captured_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
    `, [
      metrics.domain, metrics.httpStatusCode, metrics.pageLoadTime, metrics.pageSize, metrics.domNodes,
      metrics.httpsEnabled, metrics.metaTitle, metrics.metaDescription, metrics.h1Count, metrics.imageCount,
      JSON.stringify(metrics.schemaMarkup), metrics.mobileViewport, metrics.internalLinks, metrics.externalLinks,
      metrics.capturedAt
    ]);
  }
}

class SEORunner {
  private collector = new SEOCollector();
  private database = new SEODatabase();
  private processing = false;
  
  async initialize(): Promise<void> {
    await this.database.ensureTables();
  }
  
  async processAllDomains(): Promise<void> {
    if (this.processing) return;
    this.processing = true;
    
    try {
      const result = await pool.query(`
        SELECT DISTINCT domain FROM domains 
        WHERE status IN ('completed', 'processing', 'pending')
        ORDER BY created_at DESC
      `);
      
      const domains = result.rows.map(row => row.domain);
      console.log(`📊 Processing ${domains.length} domains`);
      
      let processed = 0;
      let errors = 0;
      
      for (const domain of domains) {
        try {
          const metrics = await this.collector.collectSEOMetrics(domain);
          await this.database.storeMetrics(metrics);
          processed++;
        } catch (error) {
          errors++;
        }
      }
      
      console.log(`✅ Complete: ${processed} processed, ${errors} errors`);
    } finally {
      this.processing = false;
    }
  }
  
  async getStatus(): Promise<any> {
    const count = await pool.query('SELECT COUNT(*) FROM seo_metrics');
    return {
      service: 'seo-metrics-runner',
      status: this.processing ? 'processing' : 'idle',
      metrics_collected: parseInt(count.rows[0].count)
    };
  }
}

// Express API
const app = express();
const port = process.env.PORT || 10000;
const runner = new SEORunner();

app.get('/', (req, res) => {
  res.json({
    service: 'seo-metrics-runner',
    mission: 'Stealth SEO metrics for AI memory correlation',
    cost_estimate: '$13-25 for all 3,186 domains'
  });
});

app.get('/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

app.get('/status', async (req, res) => {
  const status = await runner.getStatus();
  res.json(status);
});

app.post('/collect/start', async (req, res) => {
  runner.processAllDomains().catch(console.error);
  res.json({
    success: true,
    message: 'SEO collection started',
    estimated_cost: '$13-25 for all domains'
  });
});

app.get('/test/:domain', async (req, res) => {
  try {
    const metrics = await runner.collector.collectSEOMetrics(req.params.domain);
    res.json({ domain: req.params.domain, metrics });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

// Correlation preview
app.get('/correlation/preview', async (req, res) => {
  try {
    const analysis = await pool.query(`
      SELECT 
        d.domain,
        AVG(r.memory_score) as avg_memory_score,
        s.page_load_time,
        s.https_enabled,
        s.schema_markup
      FROM domains d
      LEFT JOIN responses r ON d.domain = r.domain
      LEFT JOIN seo_metrics s ON d.domain = s.domain
      WHERE r.model = 'gpt-4' AND s.id IS NOT NULL
      GROUP BY d.domain, s.page_load_time, s.https_enabled, s.schema_markup
      LIMIT 10
    `);
    
    res.json({
      correlation_preview: analysis.rows,
      message: 'AI memory scores vs SEO metrics correlation'
    });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

async function main() {
  await runner.initialize();
  app.listen(port, () => {
    console.log(`🌐 SEO Metrics Runner on port ${port}`);
    console.log('   POST /collect/start - Start collection');
    console.log('   GET /test/:domain - Test domain');
    console.log('   GET /correlation/preview - Preview correlations');
  });
}

main().catch(console.error); 