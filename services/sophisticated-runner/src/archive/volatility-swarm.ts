/**
 * 🧠 VOLATILITY SWARM ENGINE
 * Intelligent LLM allocation based on domain volatility and SEO opportunity
 * Leverages 16+ LLMs for maximum market intelligence
 */

import { Pool } from 'pg';
import winston from 'winston';

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [new winston.transports.Console()]
});

// Extended LLM configuration for 16+ models
export const SWARM_PROVIDERS = {
  // OpenAI variants
  openai: {
    models: ['gpt-4-turbo', 'gpt-4o', 'gpt-4o-mini', 'gpt-3.5-turbo'],
    tier: 'premium',
    costMultiplier: 1.0
  },
  
  // Anthropic variants  
  anthropic: {
    models: ['claude-3-opus-20240229', 'claude-3-5-sonnet-20240620', 'claude-3-haiku-20240307'],
    tier: 'premium',
    costMultiplier: 0.8
  },
  
  // Together AI models
  together: {
    models: [
      'meta-llama/Meta-Llama-3.1-70B-Instruct-Turbo',
      'mistralai/Mixtral-8x22B-Instruct-v0.1',
      'Qwen/Qwen2.5-72B-Instruct',
      'meta-llama/Llama-3-8b-chat-hf'
    ],
    tier: 'balanced',
    costMultiplier: 0.5
  },
  
  // Cohere variants
  cohere: {
    models: ['command-r-plus', 'command-r', 'command-light'],
    tier: 'business',
    costMultiplier: 0.6
  },
  
  // Mistral variants
  mistral: {
    models: ['mistral-large-latest', 'mistral-medium-latest', 'mistral-small-latest'],
    tier: 'balanced',
    costMultiplier: 0.5
  },
  
  // Google variants
  google: {
    models: ['gemini-1.5-pro', 'gemini-1.5-flash', 'gemini-1.0-pro'],
    tier: 'balanced',
    costMultiplier: 0.4
  },
  
  // Groq (ultra-fast)
  groq: {
    models: ['llama-3.1-70b-versatile', 'mixtral-8x7b-32768'],
    tier: 'fast',
    costMultiplier: 0.3
  },
  
  // DeepSeek
  deepseek: {
    models: ['deepseek-chat', 'deepseek-coder'],
    tier: 'efficient',
    costMultiplier: 0.2
  },
  
  // Perplexity (with search)
  perplexity: {
    models: ['llama-3.1-sonar-large-128k-online', 'llama-3.1-sonar-small-128k-online'],
    tier: 'search',
    costMultiplier: 0.7
  },
  
  // X.AI
  xai: {
    models: ['grok-beta'],
    tier: 'experimental',
    costMultiplier: 0.6
  }
};

// Volatility scoring system
export interface VolatilityScore {
  domain: string;
  overallScore: number;
  components: {
    memoryDrift: number;      // How fast perception changes
    sentimentVariance: number; // Agreement between models
    temporalDecay: number;     // How quickly forgotten
    seoOpportunity: number;    // Arbitrage potential
    competitiveVolatility: number; // Category disruption
  };
  tier: 'MAXIMUM_COVERAGE' | 'HIGH_QUALITY_COVERAGE' | 'BALANCED_COVERAGE' | 'EFFICIENT_COVERAGE';
  recommendedModels: string[];
}

export class VolatilitySwarm {
  private pool: Pool;
  private learningData: Map<string, any> = new Map();
  private logger: any;
  
  constructor(pool: Pool, logger: any) {
    this.pool = pool;
    this.logger = logger;
  }
  
  /**
   * Calculate volatility score for a domain
   */
  async calculateVolatilityScore(domain: string): Promise<VolatilityScore> {
    // Get historical data
    const historicalData = await this.pool.query(`
      SELECT 
        dr.model,
        dr.response,
        dr.created_at,
        dr.memory_score,
        dr.sentiment_score
      FROM domain_responses dr
      JOIN domains d ON dr.domain_id = d.id
      WHERE d.domain = $1
      AND dr.created_at > NOW() - INTERVAL '30 days'
      ORDER BY dr.created_at DESC
    `, [domain]);
    
    // Calculate components
    const memoryDrift = this.calculateMemoryDrift(historicalData.rows);
    const sentimentVariance = this.calculateSentimentVariance(historicalData.rows);
    const temporalDecay = this.calculateTemporalDecay(historicalData.rows);
    const seoOpportunity = await this.calculateSEOOpportunity(domain);
    const competitiveVolatility = await this.calculateCompetitiveVolatility(domain);
    
    // Weighted overall score
    const overallScore = (
      memoryDrift * 0.25 +
      sentimentVariance * 0.20 +
      temporalDecay * 0.15 +
      seoOpportunity * 0.25 +
      competitiveVolatility * 0.15
    );
    
    // Determine tier and models
    const tier = this.determineTier(overallScore);
    const recommendedModels = this.selectModelsForTier(tier);
    
    return {
      domain,
      overallScore,
      components: {
        memoryDrift,
        sentimentVariance,
        temporalDecay,
        seoOpportunity,
        competitiveVolatility
      },
      tier,
      recommendedModels
    };
  }
  
  /**
   * Calculate memory drift velocity
   */
  private calculateMemoryDrift(responses: any[]): number {
    if (responses.length < 2) return 0.5;
    
    const weeklyAverages = new Map<string, number[]>();
    
    responses.forEach(r => {
      const week = this.getWeekString(r.created_at);
      if (!weeklyAverages.has(week)) {
        weeklyAverages.set(week, []);
      }
      if (r.memory_score) {
        weeklyAverages.get(week)!.push(r.memory_score);
      }
    });
    
    const weeks = Array.from(weeklyAverages.keys()).sort();
    if (weeks.length < 2) return 0.5;
    
    // Calculate week-over-week changes
    let totalDrift = 0;
    for (let i = 1; i < weeks.length; i++) {
      const prevScores = weeklyAverages.get(weeks[i-1])!;
      const currScores = weeklyAverages.get(weeks[i])!;
      
      const prevAvg = prevScores.reduce((a, b) => a + b, 0) / prevScores.length;
      const currAvg = currScores.reduce((a, b) => a + b, 0) / currScores.length;
      
      totalDrift += Math.abs(currAvg - prevAvg);
    }
    
    // Normalize to 0-1 scale
    return Math.min(totalDrift / (weeks.length - 1) / 20, 1);
  }
  
  /**
   * Calculate sentiment variance across models
   */
  private calculateSentimentVariance(responses: any[]): number {
    const modelSentiments = new Map<string, number[]>();
    
    responses.forEach(r => {
      if (!modelSentiments.has(r.model)) {
        modelSentiments.set(r.model, []);
      }
      if (r.sentiment_score) {
        modelSentiments.get(r.model)!.push(r.sentiment_score);
      }
    });
    
    if (modelSentiments.size < 2) return 0.5;
    
    // Calculate variance between model averages
    const modelAverages = Array.from(modelSentiments.entries()).map(([model, scores]) => 
      scores.reduce((a, b) => a + b, 0) / scores.length
    );
    
    const mean = modelAverages.reduce((a, b) => a + b, 0) / modelAverages.length;
    const variance = modelAverages.reduce((sum, avg) => sum + Math.pow(avg - mean, 2), 0) / modelAverages.length;
    
    // Normalize to 0-1 scale
    return Math.min(Math.sqrt(variance) / 30, 1);
  }
  
  /**
   * Calculate temporal decay rate
   */
  private calculateTemporalDecay(responses: any[]): number {
    if (responses.length < 10) return 0.5;
    
    // Group by time periods
    const now = new Date();
    const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    
    const recentScores = responses
      .filter(r => new Date(r.created_at) > dayAgo && r.memory_score)
      .map(r => r.memory_score);
    
    const weekScores = responses
      .filter(r => new Date(r.created_at) > weekAgo && new Date(r.created_at) <= dayAgo && r.memory_score)
      .map(r => r.memory_score);
    
    const monthScores = responses
      .filter(r => new Date(r.created_at) > monthAgo && new Date(r.created_at) <= weekAgo && r.memory_score)
      .map(r => r.memory_score);
    
    if (recentScores.length === 0 || weekScores.length === 0) return 0.7;
    
    const recentAvg = recentScores.reduce((a, b) => a + b, 0) / recentScores.length;
    const weekAvg = weekScores.reduce((a, b) => a + b, 0) / weekScores.length;
    const monthAvg = monthScores.length > 0 
      ? monthScores.reduce((a, b) => a + b, 0) / monthScores.length 
      : weekAvg;
    
    // Calculate decay rate
    const weeklyDecay = (weekAvg - recentAvg) / weekAvg;
    const monthlyDecay = (monthAvg - recentAvg) / monthAvg;
    
    // Higher score = faster decay = more volatile
    return Math.min(Math.max((weeklyDecay + monthlyDecay) / 2, 0), 1);
  }
  
  /**
   * Calculate SEO opportunity score
   */
  private async calculateSEOOpportunity(domain: string): Promise<number> {
    // Check if domain is underrepresented in AI responses
    const coverage = await this.pool.query(`
      SELECT 
        COUNT(DISTINCT model) as model_coverage,
        AVG(memory_score) as avg_memory,
        COUNT(*) as total_responses
      FROM domain_responses dr
      JOIN domains d ON dr.domain_id = d.id
      WHERE d.domain = $1
      AND dr.created_at > NOW() - INTERVAL '7 days'
    `, [domain]);
    
    const row = coverage.rows[0];
    const modelCoverage = row.model_coverage || 0;
    const avgMemory = row.avg_memory || 0;
    const totalResponses = row.total_responses || 0;
    
    // Get category average for comparison
    const categoryAvg = await this.pool.query(`
      SELECT AVG(dr.memory_score) as category_avg
      FROM domain_responses dr
      JOIN domains d ON dr.domain_id = d.id
      WHERE d.business_category = (
        SELECT business_category FROM domains WHERE domain = $1 LIMIT 1
      )
      AND dr.created_at > NOW() - INTERVAL '7 days'
    `, [domain]);
    
    const catAvg = categoryAvg.rows[0]?.category_avg || 50;
    
    // High opportunity = low current memory but category is strong
    const memoryGap = Math.max(catAvg - avgMemory, 0) / 100;
    const coverageGap = Math.max(11 - modelCoverage, 0) / 11;
    
    // Combine factors
    return (memoryGap * 0.6 + coverageGap * 0.4);
  }
  
  /**
   * Calculate competitive volatility in category
   */
  private async calculateCompetitiveVolatility(domain: string): Promise<number> {
    const categoryVolatility = await this.pool.query(`
      WITH domain_changes AS (
        SELECT 
          d.domain,
          AVG(CASE WHEN dr.created_at > NOW() - INTERVAL '7 days' THEN dr.memory_score END) as recent_score,
          AVG(CASE WHEN dr.created_at BETWEEN NOW() - INTERVAL '14 days' AND NOW() - INTERVAL '7 days' THEN dr.memory_score END) as previous_score
        FROM domains d
        JOIN domain_responses dr ON d.id = dr.domain_id
        WHERE d.business_category = (
          SELECT business_category FROM domains WHERE domain = $1 LIMIT 1
        )
        GROUP BY d.domain
        HAVING COUNT(CASE WHEN dr.created_at > NOW() - INTERVAL '7 days' THEN 1 END) > 0
      )
      SELECT 
        STDDEV(recent_score - previous_score) as volatility,
        COUNT(*) as competitor_count
      FROM domain_changes
      WHERE recent_score IS NOT NULL AND previous_score IS NOT NULL
    `, [domain]);
    
    const volatility = categoryVolatility.rows[0]?.volatility || 0;
    
    // Normalize to 0-1 scale
    return Math.min(volatility / 20, 1);
  }
  
  /**
   * Determine processing tier based on volatility score
   */
  private determineTier(score: number): VolatilityScore['tier'] {
    if (score >= 0.9) return 'MAXIMUM_COVERAGE';      // All 16+ models
    if (score >= 0.7) return 'HIGH_QUALITY_COVERAGE'; // Premium + fast
    if (score >= 0.5) return 'BALANCED_COVERAGE';     // Balanced approach
    return 'EFFICIENT_COVERAGE';                       // Fast/cheap only
  }
  
  /**
   * Select models based on tier
   */
  private selectModelsForTier(tier: VolatilityScore['tier']): string[] {
    const models: string[] = [];
    
    switch (tier) {
      case 'MAXIMUM_COVERAGE':
        // Use ALL available models
        Object.entries(SWARM_PROVIDERS).forEach(([provider, config]) => {
          if (this.hasApiKey(provider)) {
            models.push(...config.models.map(m => `${provider}/${m}`));
          }
        });
        break;
        
      case 'HIGH_QUALITY_COVERAGE':
        // Premium + some balanced
        Object.entries(SWARM_PROVIDERS).forEach(([provider, config]) => {
          if (this.hasApiKey(provider) && ['premium', 'business', 'balanced'].includes(config.tier)) {
            models.push(...config.models.slice(0, 2).map(m => `${provider}/${m}`));
          }
        });
        break;
        
      case 'BALANCED_COVERAGE':
        // One model from each provider
        Object.entries(SWARM_PROVIDERS).forEach(([provider, config]) => {
          if (this.hasApiKey(provider) && config.tier !== 'experimental') {
            models.push(`${provider}/${config.models[0]}`);
          }
        });
        break;
        
      case 'EFFICIENT_COVERAGE':
        // Fast/cheap providers only
        Object.entries(SWARM_PROVIDERS).forEach(([provider, config]) => {
          if (this.hasApiKey(provider) && ['fast', 'efficient'].includes(config.tier)) {
            models.push(`${provider}/${config.models[0]}`);
          }
        });
        break;
    }
    
    return models;
  }
  
  /**
   * Check if API key exists for provider
   */
  private hasApiKey(provider: string): boolean {
    const keyMap: Record<string, string> = {
      'openai': 'OPENAI_API_KEY',
      'anthropic': 'ANTHROPIC_API_KEY',
      'together': 'TOGETHER_API_KEY',
      'cohere': 'COHERE_API_KEY',
      'mistral': 'MISTRAL_API_KEY',
      'google': 'GOOGLE_API_KEY',
      'groq': 'GROQ_API_KEY',
      'deepseek': 'DEEPSEEK_API_KEY',
      'perplexity': 'PERPLEXITY_API_KEY',
      'xai': 'XAI_API_KEY'
    };
    
    return !!process.env[keyMap[provider]];
  }
  
  /**
   * Process domains with volatility-based tiering
   */
  async processVolatileDomains(limit: number = 100): Promise<any> {
    // Get domains ordered by last update time
    const domains = await this.pool.query(`
      SELECT d.id, d.domain 
      FROM domains d
      LEFT JOIN (
        SELECT domain_id, MAX(created_at) as last_update
        FROM domain_responses
        GROUP BY domain_id
      ) dr ON d.id = dr.domain_id
      ORDER BY dr.last_update ASC NULLS FIRST
      LIMIT $1
    `, [limit]);
    
    const results = [];
    
    for (const domain of domains.rows) {
      const volatility = await this.calculateVolatilityScore(domain.domain);
      
      // Store volatility score
      await this.pool.query(`
        INSERT INTO volatility_scores (domain_id, score, components, tier, calculated_at)
        VALUES ($1, $2, $3, $4, NOW())
        ON CONFLICT (domain_id) DO UPDATE
        SET score = $2, components = $3, tier = $4, calculated_at = NOW()
      `, [domain.id, volatility.overallScore, JSON.stringify(volatility.components), volatility.tier]);
      
      results.push({
        domain: domain.domain,
        volatility,
        modelsToUse: volatility.recommendedModels.length
      });
      
      logger.info(`Domain ${domain.domain} assigned tier ${volatility.tier} with ${volatility.recommendedModels.length} models`);
    }
    
    return results;
  }
  
  /**
   * Learn from processing patterns
   */
  async updateLearning(domain: string, results: any): Promise<void> {
    const volatility = await this.calculateVolatilityScore(domain);
    
    // Store learning data
    await this.pool.query(`
      INSERT INTO swarm_learning (
        domain_id,
        volatility_score,
        models_used,
        response_quality,
        processing_time,
        cost_estimate,
        learned_at
      ) VALUES (
        (SELECT id FROM domains WHERE domain = $1),
        $2, $3, $4, $5, $6, NOW()
      )
    `, [
      domain,
      volatility.overallScore,
      results.modelsUsed,
      results.responseQuality,
      results.processingTime,
      results.costEstimate
    ]);
    
    // Update internal learning map
    this.learningData.set(domain, {
      lastVolatility: volatility.overallScore,
      lastTier: volatility.tier,
      performance: results.responseQuality / results.costEstimate
    });
  }
  
  /**
   * Get domains with highest SEO opportunity
   */
  async getHighOpportunityDomains(limit: number = 20): Promise<any[]> {
    const opportunities = await this.pool.query(`
      SELECT 
        d.domain,
        vs.score as volatility_score,
        vs.components->>'seoOpportunity' as seo_score,
        vs.tier,
        COUNT(DISTINCT dr.model) as current_coverage
      FROM domains d
      LEFT JOIN volatility_scores vs ON d.id = vs.domain_id
      LEFT JOIN domain_responses dr ON d.id = dr.domain_id AND dr.created_at > NOW() - INTERVAL '7 days'
      WHERE vs.components->>'seoOpportunity' IS NOT NULL
      GROUP BY d.domain, vs.score, vs.components, vs.tier
      ORDER BY (vs.components->>'seoOpportunity')::float DESC
      LIMIT $1
    `, [limit]);
    
    return opportunities.rows.map(row => ({
      domain: row.domain,
      volatilityScore: row.volatility_score,
      seoOpportunity: parseFloat(row.seo_score),
      currentTier: row.tier,
      currentCoverage: row.current_coverage,
      recommendation: row.current_coverage < 5 ? 'URGENT_CRAWL' : 'MONITOR'
    }));
  }
  
  /**
   * Helper to get week string
   */
  private getWeekString(date: Date): string {
    const d = new Date(date);
    const week = Math.floor((d.getTime() - new Date(d.getFullYear(), 0, 1).getTime()) / 604800000);
    return `${d.getFullYear()}-W${week}`;
  }
  
  // Additional methods for index.ts compatibility
  async getSwarmMetrics(): Promise<any> {
    const activeProviders = Object.entries(SWARM_PROVIDERS).filter(
      ([provider]) => this.hasApiKey(provider)
    );
    
    const totalModels = activeProviders.reduce(
      (sum, [_, config]) => sum + config.models.length, 
      0
    );
    
    const providerBreakdown = Object.fromEntries(
      activeProviders.map(([provider, config]) => [
        provider,
        {
          models: config.models.length,
          tier: config.tier,
          active: true
        }
      ])
    );
    
    return {
      activeProviders: activeProviders.length,
      totalModels,
      providerBreakdown
    };
  }
  
  async processWithVolatilityTiering(domain: string, domainId: number): Promise<any> {
    const volatility = await this.calculateVolatilityScore(domain);
    
    // Log tier assignment
    logger.info(`Domain ${domain} assigned tier ${volatility.tier}`, {
      volatilityScore: volatility.overallScore,
      modelsToUse: volatility.recommendedModels.length
    });
    
    // Store volatility score
    await this.pool.query(`
      INSERT INTO volatility_scores (domain_id, score, components, tier, calculated_at)
      VALUES ($1, $2, $3, $4, NOW())
      ON CONFLICT (domain_id) DO UPDATE
      SET score = $2, components = $3, tier = $4, calculated_at = NOW()
    `, [domainId, volatility.overallScore, JSON.stringify(volatility.components), volatility.tier]);
    
    return {
      domain,
      volatility,
      modelsRecommended: volatility.recommendedModels,
      processingTier: volatility.tier
    };
  }
  
  async identifyJuiceWorthSqueezing(): Promise<any[]> {
    return this.getHighOpportunityDomains(50);
  }
  
  /**
   * Get high volatility domains
   */
  async getHighVolatilityDomains(limit: number = 100): Promise<any[]> {
    const result = await this.pool.query(`
      SELECT 
        d.domain,
        vs.score as volatility_score,
        vs.components,
        vs.tier,
        vs.calculated_at,
        COUNT(DISTINCT dr.model) as current_coverage
      FROM domains d
      JOIN volatility_scores vs ON d.id = vs.domain_id
      LEFT JOIN domain_responses dr ON d.id = dr.domain_id AND dr.created_at > NOW() - INTERVAL '7 days'
      WHERE vs.score >= 0.7
      GROUP BY d.domain, vs.score, vs.components, vs.tier, vs.calculated_at
      ORDER BY vs.score DESC
      LIMIT $1
    `, [limit]);
    
    return result.rows.map(row => ({
      domain: row.domain,
      volatilityScore: parseFloat(row.volatility_score),
      components: row.components,
      tier: row.tier,
      currentCoverage: parseInt(row.current_coverage),
      calculatedAt: row.calculated_at
    }));
  }
  
  /**
   * Get category volatility metrics
   */
  async getCategoryVolatility(category: string): Promise<any> {
    const result = await this.pool.query(`
      SELECT 
        d.business_category as category,
        COUNT(DISTINCT d.id) as domain_count,
        AVG(vs.score) as avg_volatility,
        MAX(vs.score) as max_volatility,
        MIN(vs.score) as min_volatility,
        STDDEV(vs.score) as volatility_stddev,
        AVG((vs.components->>'memoryDrift')::float) as avg_memory_drift,
        AVG((vs.components->>'sentimentVariance')::float) as avg_sentiment_variance,
        AVG((vs.components->>'seoOpportunity')::float) as avg_seo_opportunity,
        AVG((vs.components->>'competitiveVolatility')::float) as avg_competitive_volatility
      FROM domains d
      JOIN volatility_scores vs ON d.id = vs.domain_id
      WHERE d.business_category = $1
      GROUP BY d.business_category
    `, [category]);
    
    if (result.rows.length === 0) {
      return null;
    }
    
    const topVolatile = await this.pool.query(`
      SELECT 
        d.domain,
        vs.score,
        vs.tier
      FROM domains d
      JOIN volatility_scores vs ON d.id = vs.domain_id
      WHERE d.business_category = $1
      ORDER BY vs.score DESC
      LIMIT 10
    `, [category]);
    
    return {
      category: result.rows[0].category,
      metrics: {
        domainCount: parseInt(result.rows[0].domain_count),
        avgVolatility: parseFloat(result.rows[0].avg_volatility),
        maxVolatility: parseFloat(result.rows[0].max_volatility),
        minVolatility: parseFloat(result.rows[0].min_volatility),
        volatilityStdDev: parseFloat(result.rows[0].volatility_stddev),
        components: {
          avgMemoryDrift: parseFloat(result.rows[0].avg_memory_drift),
          avgSentimentVariance: parseFloat(result.rows[0].avg_sentiment_variance),
          avgSeoOpportunity: parseFloat(result.rows[0].avg_seo_opportunity),
          avgCompetitiveVolatility: parseFloat(result.rows[0].avg_competitive_volatility)
        }
      },
      topVolatileDomains: topVolatile.rows.map(row => ({
        domain: row.domain,
        volatilityScore: parseFloat(row.score),
        tier: row.tier
      }))
    };
  }
}

// Main exports that index.ts expects
export { VolatilitySwarm as SwarmOrchestrator };
export { VolatilitySwarm as VolatilityEngine };

// BrandSentiment.io integration
export class BrandSentimentIntegration {
  private apiEndpoint: string;
  private apiKey: string;
  
  constructor(apiEndpoint: string, apiKey: string) {
    this.apiEndpoint = apiEndpoint;
    this.apiKey = apiKey;
  }
  
  async fetchVolatileData(): Promise<any> {
    // Integration with brandsentiment.io for volatile sentiment data
    return {
      volatileDomains: [],
      forgottenBrands: [],
      emergingTrends: []
    };
  }
  
  async shareIntelligence(data: any): Promise<void> {
    // Share our intelligence back with brandsentiment.io
  }
  
  async pushVolatilityData(volatilityData: any): Promise<void> {
    try {
      const response = await fetch(`${this.apiEndpoint}/volatility`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(volatilityData)
      });
      
      if (!response.ok) {
        throw new Error(`BrandSentiment API error: ${response.status}`);
      }
    } catch (error) {
      // Log error but don't fail the main process
      console.error('Failed to push to BrandSentiment.io:', error);
    }
  }
}

// SWARM_PROVIDERS already exported above