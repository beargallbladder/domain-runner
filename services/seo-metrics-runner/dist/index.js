"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const pg_1 = require("pg");
const dotenv = __importStar(require("dotenv"));
const axios_1 = __importDefault(require("axios"));
const cheerio = __importStar(require("cheerio"));
dotenv.config();
// SEO METRICS RUNNER - STEALTH MODE
console.log('🔍 SEO METRICS RUNNER STARTING');
const pool = new pg_1.Pool({
    connectionString: process.env.DATABASE_URL || '',
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
    max: 10,
});
// Stealth configuration
const STEALTH_CONFIG = {
    userAgents: [
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
    ],
    requestDelay: 3000,
    timeout: 15000
};
class SEOCollector {
    constructor() {
        this.lastRequest = 0;
    }
    async makeRequest(url) {
        // Rate limiting - respect server resources
        const now = Date.now();
        const timeSince = now - this.lastRequest;
        if (timeSince < STEALTH_CONFIG.requestDelay) {
            await new Promise(resolve => setTimeout(resolve, STEALTH_CONFIG.requestDelay - timeSince));
        }
        const userAgent = STEALTH_CONFIG.userAgents[Math.floor(Math.random() * STEALTH_CONFIG.userAgents.length)];
        console.log(`🔍 Collecting: ${url}`);
        const response = await axios_1.default.get(url, {
            headers: { 'User-Agent': userAgent },
            timeout: STEALTH_CONFIG.timeout,
            validateStatus: () => true // Accept all status codes for analysis
        });
        this.lastRequest = Date.now();
        return response;
    }
    async collectSEOMetrics(domain) {
        const startTime = Date.now();
        const url = `https://${domain}`;
        try {
            const response = await this.makeRequest(url);
            const $ = cheerio.load(response.data || '');
            // Extract schema markup types
            const schemas = [];
            $('script[type="application/ld+json"]').each((_, el) => {
                try {
                    const json = JSON.parse($(el).html() || '');
                    if (json['@type'])
                        schemas.push(json['@type']);
                }
                catch (e) {
                    // Ignore malformed JSON
                }
            });
            // Count internal vs external links
            let internalLinks = 0;
            let externalLinks = 0;
            $('a[href]').each((_, el) => {
                const href = $(el).attr('href');
                if (href) {
                    if (href.startsWith('/') || href.includes(domain)) {
                        internalLinks++;
                    }
                    else if (href.startsWith('http')) {
                        externalLinks++;
                    }
                }
            });
            const metrics = {
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
            console.log(`✅ ${domain}: ${metrics.httpStatusCode}, ${metrics.pageLoadTime}ms, ${schemas.length} schemas`);
            return metrics;
        }
        catch (error) {
            console.error(`❌ Failed ${domain}:`, error.message);
            throw error;
        }
    }
}
class SEODatabase {
    async ensureTables() {
        try {
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
            await pool.query(`CREATE INDEX IF NOT EXISTS idx_seo_captured_at ON seo_metrics(captured_at)`);
            console.log('✅ SEO tables ready');
        }
        catch (error) {
            console.error('❌ Database setup failed:', error);
            throw error;
        }
    }
    async storeMetrics(metrics) {
        try {
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
        catch (error) {
            console.error(`❌ Failed to store metrics for ${metrics.domain}:`, error);
            throw error;
        }
    }
}
class SEORunner {
    constructor() {
        this.collector = new SEOCollector();
        this.database = new SEODatabase();
        this.processing = false;
    }
    async initialize() {
        try {
            await this.database.ensureTables();
            console.log('🚀 SEO Metrics Runner initialized and ready');
        }
        catch (error) {
            console.error('❌ Initialization failed:', error);
            throw error;
        }
    }
    // PUBLIC METHOD: Expose collector functionality properly
    async testDomain(domain) {
        try {
            return await this.collector.collectSEOMetrics(domain);
        }
        catch (error) {
            console.error(`❌ Test failed for ${domain}:`, error);
            throw error;
        }
    }
    async processAllDomains() {
        if (this.processing) {
            console.log('⚠️  Already processing domains...');
            return { error: 'Already processing' };
        }
        this.processing = true;
        console.log('🚀 Starting $25 SEO→AI correlation experiment...');
        try {
            const result = await pool.query(`
        SELECT DISTINCT domain FROM domains 
        WHERE status IN ('completed', 'processing', 'pending')
        ORDER BY created_at DESC
      `);
            const domains = result.rows.map(row => row.domain);
            console.log(`📊 Processing ${domains.length} domains for $25 experiment`);
            let processed = 0;
            let errors = 0;
            const startTime = Date.now();
            for (const domain of domains) {
                try {
                    const metrics = await this.collector.collectSEOMetrics(domain);
                    await this.database.storeMetrics(metrics);
                    processed++;
                    // Progress update every 50 domains
                    if (processed % 50 === 0) {
                        const elapsed = (Date.now() - startTime) / 1000 / 60; // minutes
                        console.log(`🔍 Progress: ${processed}/${domains.length} (${Math.round(processed / domains.length * 100)}%) - ${elapsed.toFixed(1)}min elapsed`);
                    }
                }
                catch (error) {
                    console.error(`❌ Failed ${domain}:`, error.message);
                    errors++;
                }
            }
            const totalTime = (Date.now() - startTime) / 1000 / 60;
            console.log(`✅ $25 SEO experiment complete!`);
            console.log(`   - Processed: ${processed} domains`);
            console.log(`   - Errors: ${errors} domains`);
            console.log(`   - Success rate: ${Math.round((processed / domains.length) * 100)}%`);
            console.log(`   - Total time: ${totalTime.toFixed(1)} minutes`);
            console.log(`   - Data points collected: ${processed * 15} SEO metrics`);
            return {
                success: true,
                processed,
                errors,
                totalDomains: domains.length,
                successRate: Math.round((processed / domains.length) * 100),
                timeMinutes: totalTime.toFixed(1),
                dataPoints: processed * 15
            };
        }
        catch (error) {
            console.error('❌ Processing failed:', error.message);
            return { error: error.message };
        }
        finally {
            this.processing = false;
        }
    }
    async getStatus() {
        try {
            const count = await pool.query('SELECT COUNT(*) FROM seo_metrics');
            const latest = await pool.query(`
        SELECT domain, captured_at FROM seo_metrics 
        ORDER BY captured_at DESC LIMIT 1
      `);
            return {
                service: 'seo-metrics-runner',
                status: this.processing ? 'processing' : 'ready',
                experiment: '$25 SEO→AI correlation study',
                metrics_collected: parseInt(count.rows[0].count),
                latest_collection: latest.rows[0] || null,
                ready_for_launch: true
            };
        }
        catch (error) {
            console.error('❌ Status check failed:', error);
            throw error;
        }
    }
}
// Express API
const app = (0, express_1.default)();
const port = process.env.PORT || 10000;
const runner = new SEORunner();
app.get('/', (req, res) => {
    res.json({
        service: 'seo-metrics-runner',
        mission: '$25 SEO→AI correlation experiment',
        status: 'ready_for_launch',
        features: [
            'Stealth SEO metrics collection',
            'AI memory correlation analysis',
            'JOLT event temporal tracking',
            'Traditional SEO → AI era bridge'
        ],
        cost_estimate: '$13-25 for all domains',
        business_value: 'Bridge SEO professionals to $10K+ AI optimization packages',
        launch_command: 'POST /collect/start'
    });
});
app.get('/health', (req, res) => {
    res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        experiment: '$25_seo_ai_correlation',
        ready: true
    });
});
app.get('/status', async (req, res) => {
    try {
        const status = await runner.getStatus();
        res.json(status);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
app.post('/collect/start', async (req, res) => {
    console.log('🚨 LAUNCHING $25 SEO→AI EXPERIMENT!');
    // Run in background
    runner.processAllDomains().then(result => {
        console.log('🎯 Experiment result:', result);
    }).catch(error => {
        console.error('❌ Experiment failed:', error);
    });
    res.json({
        success: true,
        message: '🚀 $25 SEO→AI correlation experiment LAUNCHED!',
        action: 'Processing all domains in stealth mode',
        estimated_cost: '$13-25 for all domains',
        estimated_time: '2-4 hours',
        data_points: '47,000+ SEO metrics',
        business_impact: 'Bridge traditional SEO to AI era',
        monitor: 'GET /status for progress'
    });
});
// FIXED: Use public method instead of accessing private property
app.get('/test/:domain', async (req, res) => {
    try {
        const metrics = await runner.testDomain(req.params.domain);
        res.json({
            domain: req.params.domain,
            metrics,
            experiment_ready: true,
            correlation_potential: 'High'
        });
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
// Correlation preview
app.get('/correlation/preview', async (req, res) => {
    try {
        const analysis = await pool.query(`
      SELECT 
        d.domain,
        ROUND(AVG(r.memory_score), 2) as avg_memory_score,
        s.page_load_time,
        s.https_enabled,
        s.schema_markup,
        s.mobile_viewport
      FROM domains d
      LEFT JOIN responses r ON d.domain = r.domain
      LEFT JOIN seo_metrics s ON d.domain = s.domain
      WHERE r.model = 'gpt-4' AND s.id IS NOT NULL
      GROUP BY d.domain, s.page_load_time, s.https_enabled, s.schema_markup, s.mobile_viewport
      ORDER BY avg_memory_score DESC
      LIMIT 20
    `);
        res.json({
            correlation_preview: analysis.rows,
            analysis_ready: analysis.rows.length > 0,
            message: 'AI memory scores vs SEO metrics correlation',
            experiment_status: 'Ready for $25 launch'
        });
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
async function main() {
    try {
        await runner.initialize();
        app.listen(port, () => {
            console.log(`🌐 SEO Metrics Runner LIVE on port ${port}`);
            console.log('🎯 $25 SEO→AI Experiment Ready!');
            console.log('🚀 Launch: POST /collect/start');
            console.log('📊 Status: GET /status');
            console.log('🧪 Test: GET /test/:domain');
        });
    }
    catch (error) {
        console.error('❌ Startup failed:', error);
        process.exit(1);
    }
}
main().catch(console.error);
//# sourceMappingURL=index.js.map