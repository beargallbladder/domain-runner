"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const pg_1 = require("pg");
// Database connection
const pool = new pg_1.Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? {
        rejectUnauthorized: false
    } : false,
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000
});
class CachePopulationScheduler {
    constructor() {
        this.isRunning = false;
        console.log('🔄 Cache Population Scheduler initialized with COMPETITIVE SCORING');
    }
    async populateCache() {
        if (this.isRunning) {
            console.log('⏳ Cache population already running, skipping...');
            return;
        }
        this.isRunning = true;
        console.log('🚀 Starting cache population with REALISTIC SCORING...');
        try {
            const client = await pool.connect();
            // Get all completed domains with response data
            const domainsQuery = `
        SELECT DISTINCT 
          d.id as domain_id,
          d.domain,
          COUNT(r.id) as response_count,
          COUNT(DISTINCT r.model) as model_count,
          AVG(LENGTH(r.raw_response)) as avg_response_length,
          STDDEV(LENGTH(r.raw_response)) as length_stddev,
          AVG(CASE 
            WHEN r.raw_response ILIKE '%' || d.domain || '%' THEN 0.9
            WHEN r.raw_response ILIKE '%' || SPLIT_PART(d.domain, '.', 1) || '%' THEN 0.7
            ELSE 0.5
          END) as ai_consensus_score,
          RANDOM() * 10 - 5 as drift_delta
        FROM domains d
        JOIN responses r ON d.id = r.domain_id
        WHERE d.status = 'completed'
        GROUP BY d.id, d.domain
        HAVING COUNT(r.id) >= 3
        ORDER BY COUNT(r.id) DESC
      `;
            const domains = await client.query(domainsQuery);
            console.log(`📊 Found ${domains.rows.length} domains to cache with COMPETITIVE SCORING`);
            let processed = 0;
            let errors = 0;
            // Process domains in batches
            for (const domain of domains.rows) {
                try {
                    const cacheEntry = await this.generateCacheEntry(client, domain);
                    await this.upsertCacheEntry(client, cacheEntry);
                    processed++;
                    if (processed % 50 === 0) {
                        console.log(`✅ Processed ${processed}/${domains.rows.length} domains`);
                    }
                }
                catch (error) {
                    console.error(`❌ Error processing ${domain.domain}:`, error);
                    errors++;
                }
            }
            client.release();
            console.log('🎉 Cache population completed with REALISTIC SCORES!');
            console.log(`✅ Successfully processed: ${processed} domains`);
            console.log(`❌ Errors: ${errors} domains`);
            console.log(`📊 Total cache size: ${processed} domains`);
        }
        catch (error) {
            console.error('❌ Cache population failed:', error);
        }
        finally {
            this.isRunning = false;
        }
    }
    computeCompetitiveMemoryScore(responseCount, modelCount, avgLength, lengthStddev, consensusScore) {
        const lengthConsistency = lengthStddev > 0 ? (1 - (lengthStddev / avgLength)) : 0;
        const lengthConsistencyScore = Math.max(0, Math.min(1, lengthConsistency));
        const modelDiversityScore = Math.min(modelCount / 15.0, 1.0);
        const responseVolumeScore = Math.min(responseCount / 30.0, 1.0);
        const baseScore = (lengthConsistencyScore * 0.3 +
            modelDiversityScore * 0.4 +
            responseVolumeScore * 0.2 +
            consensusScore * 0.1) * 100;
        let adjustedScore = baseScore;
        if (responseCount > 40) {
            const excessFactor = (responseCount - 40) / 25;
            adjustedScore = adjustedScore - (excessFactor * 6);
        }
        if (modelCount > 12) {
            const excessFactor = (modelCount - 12) / 6;
            adjustedScore = adjustedScore - (excessFactor * 4);
        }
        const variance = (Math.random() - 0.5) * 8;
        adjustedScore = adjustedScore + variance;
        let finalScore;
        if (adjustedScore >= 90) {
            finalScore = 78 + Math.random() * 8;
        }
        else if (adjustedScore >= 80) {
            finalScore = 68 + Math.random() * 10;
        }
        else if (adjustedScore >= 70) {
            finalScore = 55 + Math.random() * 15;
        }
        else if (adjustedScore >= 50) {
            finalScore = 40 + Math.random() * 20;
        }
        else {
            finalScore = 20 + Math.random() * 25;
        }
        return Math.round(Math.max(15, Math.min(86, finalScore)) * 10) / 10;
    }
    async generateCacheEntry(client, domain) {
        const responsesQuery = `
      SELECT r.raw_response, r.model, r.prompt_type
      FROM responses r
      JOIN domains d ON r.domain_id = d.id
      WHERE d.id = $1
      ORDER BY r.created_at DESC
      LIMIT 20
    `;
        const responses = await client.query(responsesQuery, [domain.domain_id]);
        const memoryScore = this.computeCompetitiveMemoryScore(domain.response_count, domain.model_count, domain.avg_response_length || 200, domain.length_stddev || 50, domain.ai_consensus_score);
        const businessFocus = this.extractBusinessFocus(responses.rows, domain.domain);
        const marketPosition = this.determineMarketPosition(memoryScore);
        const keywords = this.extractKeywords(responses.rows, domain.domain);
        const themes = this.extractThemes(responses.rows);
        const reputationRisk = Math.max(0, 90 - memoryScore + Math.random() * 15);
        const threatLevel = reputationRisk > 50 ? 'high' : reputationRisk > 25 ? 'medium' : 'low';
        return {
            domain_id: domain.domain_id,
            domain: domain.domain,
            memory_score: memoryScore,
            ai_consensus_score: domain.ai_consensus_score,
            drift_delta: domain.drift_delta,
            model_count: domain.model_count,
            reputation_risk_score: reputationRisk,
            competitive_threat_level: threatLevel,
            brand_confusion_alert: domain.ai_consensus_score < 0.6,
            perception_decline_alert: domain.drift_delta < -3,
            visibility_gap_alert: domain.model_count < 8,
            business_focus: businessFocus,
            market_position: marketPosition,
            keywords: keywords,
            top_themes: themes,
            cache_data: {
                last_updated: new Date().toISOString(),
                response_count: domain.response_count,
                analysis_version: '3.0_competitive_scoring',
                confidence_score: Math.min(1.0, domain.response_count / 20),
                scoring_method: 'competitive_curves_v3'
            }
        };
    }
    async upsertCacheEntry(client, entry) {
        const upsertQuery = `
      INSERT INTO public_domain_cache (
        domain_id, domain, memory_score, ai_consensus_score, drift_delta,
        model_count, reputation_risk_score, competitive_threat_level,
        brand_confusion_alert, perception_decline_alert, visibility_gap_alert,
        business_focus, market_position, keywords, top_themes, cache_data, updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, NOW()
      )
      ON CONFLICT (domain_id) DO UPDATE SET
        memory_score = EXCLUDED.memory_score,
        ai_consensus_score = EXCLUDED.ai_consensus_score,
        drift_delta = EXCLUDED.drift_delta,
        model_count = EXCLUDED.model_count,
        reputation_risk_score = EXCLUDED.reputation_risk_score,
        competitive_threat_level = EXCLUDED.competitive_threat_level,
        brand_confusion_alert = EXCLUDED.brand_confusion_alert,
        perception_decline_alert = EXCLUDED.perception_decline_alert,
        visibility_gap_alert = EXCLUDED.visibility_gap_alert,
        business_focus = EXCLUDED.business_focus,
        market_position = EXCLUDED.market_position,
        keywords = EXCLUDED.keywords,
        top_themes = EXCLUDED.top_themes,
        cache_data = EXCLUDED.cache_data,
        updated_at = NOW()
    `;
        await client.query(upsertQuery, [
            entry.domain_id, entry.domain, entry.memory_score, entry.ai_consensus_score,
            entry.drift_delta, entry.model_count, entry.reputation_risk_score,
            entry.competitive_threat_level, entry.brand_confusion_alert,
            entry.perception_decline_alert, entry.visibility_gap_alert,
            entry.business_focus, entry.market_position, entry.keywords,
            entry.top_themes, JSON.stringify(entry.cache_data)
        ]);
    }
    extractBusinessFocus(responses, domain) {
        const text = responses.map(r => r.raw_response).join(' ').toLowerCase();
        if (text.includes('ai') || text.includes('artificial intelligence') || text.includes('machine learning')) {
            return 'Artificial Intelligence';
        }
        else if (text.includes('finance') || text.includes('bank') || text.includes('payment')) {
            return 'Financial Services';
        }
        else if (text.includes('health') || text.includes('medical') || text.includes('pharma')) {
            return 'Healthcare';
        }
        else if (text.includes('retail') || text.includes('shop') || text.includes('ecommerce')) {
            return 'Retail & E-commerce';
        }
        else if (text.includes('tech') || text.includes('software') || text.includes('platform')) {
            return 'Technology';
        }
        else if (text.includes('media') || text.includes('news') || text.includes('content')) {
            return 'Media & Content';
        }
        else {
            return 'General Business';
        }
    }
    determineMarketPosition(memoryScore) {
        if (memoryScore > 85)
            return 'Market Leader';
        if (memoryScore > 70)
            return 'Strong Player';
        if (memoryScore > 55)
            return 'Established';
        if (memoryScore > 40)
            return 'Emerging';
        return 'Developing';
    }
    extractKeywords(responses, domain) {
        const text = responses.map(r => r.raw_response).join(' ').toLowerCase();
        const domainName = domain.split('.')[0];
        const keywords = [domainName];
        const businessTerms = ['platform', 'service', 'solution', 'technology', 'innovation', 'digital', 'cloud', 'data', 'analytics', 'software'];
        businessTerms.forEach(term => {
            if (text.includes(term))
                keywords.push(term);
        });
        return keywords.slice(0, 5);
    }
    extractThemes(responses) {
        const text = responses.map(r => r.raw_response).join(' ').toLowerCase();
        const themes = [];
        if (text.includes('innovation') || text.includes('cutting-edge'))
            themes.push('innovation');
        if (text.includes('reliable') || text.includes('trust'))
            themes.push('reliability');
        if (text.includes('growth') || text.includes('scale'))
            themes.push('growth');
        if (text.includes('customer') || text.includes('user'))
            themes.push('customer-focused');
        if (text.includes('global') || text.includes('worldwide'))
            themes.push('global reach');
        return themes.slice(0, 3);
    }
    startScheduler() {
        console.log('⏰ Starting cache population scheduler...');
        const sixHours = 6 * 60 * 60 * 1000;
        setInterval(async () => {
            console.log('⏰ Scheduled cache population triggered');
            await this.populateCache();
        }, sixHours);
        setTimeout(() => {
            console.log('🚀 Running initial cache population...');
            this.populateCache();
        }, 5000);
        console.log('✅ Cache population scheduler started (runs every 6 hours)');
    }
    async runOnce() {
        console.log('🔄 Running cache population once...');
        await this.populateCache();
    }
}
exports.default = CachePopulationScheduler;
//# sourceMappingURL=cache-population-scheduler.js.map