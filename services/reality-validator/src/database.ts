// ============================================================================
// 🗄️ DATABASE CONNECTION & QUERIES
// ============================================================================

import { Pool, PoolClient } from 'pg';
import { DomainData, AIResponse, GroundTruthMetrics, RealityCheck } from './types';

class DatabaseManager {
  private pool: Pool;

  constructor() {
    this.pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000,
    });
  }

  async initialize(): Promise<void> {
    console.log('🗄️ Initializing Reality Validator database...');
    
    try {
      await this.createTables();
      console.log('✅ Database initialized successfully');
    } catch (error) {
      console.error('❌ Database initialization failed:', error);
      throw error;
    }
  }

  private async createTables(): Promise<void> {
    const client = await this.pool.connect();
    
    try {
      // Ground truth metrics table
      await client.query(`
        CREATE TABLE IF NOT EXISTS ground_truth_metrics (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          domain_id UUID NOT NULL,
          domain VARCHAR(255) NOT NULL,
          financial_data JSONB DEFAULT '{}',
          regulatory_data JSONB DEFAULT '{}',
          market_data JSONB DEFAULT '{}',
          business_data JSONB DEFAULT '{}',
          calculated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          data_freshness VARCHAR(50) DEFAULT 'fresh',
          UNIQUE(domain_id)
        );
      `);

      // Reality checks cache table
      await client.query(`
        CREATE TABLE IF NOT EXISTS reality_checks (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          domain_id UUID NOT NULL,
          domain VARCHAR(255) NOT NULL,
          ai_consensus_score REAL NOT NULL,
          reality_score REAL NOT NULL,
          truth_score REAL NOT NULL,
          divergence_score REAL NOT NULL,
          divergence_level VARCHAR(20) NOT NULL,
          confidence_level VARCHAR(20) NOT NULL,
          ai_assessment JSONB NOT NULL,
          divergence_analysis JSONB NOT NULL,
          calculated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(domain_id)
        );
      `);

      // Model accuracy tracking
      await client.query(`
        CREATE TABLE IF NOT EXISTS model_accuracy (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          model VARCHAR(100) NOT NULL,
          overall_accuracy REAL NOT NULL,
          financial_accuracy REAL NOT NULL,
          regulatory_accuracy REAL NOT NULL,
          market_accuracy REAL NOT NULL,
          bias_direction VARCHAR(20) NOT NULL,
          confidence_calibration REAL NOT NULL,
          sample_size INTEGER NOT NULL,
          calculated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(model)
        );
      `);

      // Divergence alerts
      await client.query(`
        CREATE TABLE IF NOT EXISTS divergence_alerts (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          domain VARCHAR(255) NOT NULL,
          domain_id UUID NOT NULL,
          alert_type VARCHAR(50) NOT NULL,
          severity VARCHAR(20) NOT NULL,
          message TEXT NOT NULL,
          ai_score REAL NOT NULL,
          reality_score REAL NOT NULL,
          divergence REAL NOT NULL,
          recommended_action TEXT NOT NULL,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          resolved_at TIMESTAMP WITH TIME ZONE,
          INDEX(domain, created_at),
          INDEX(severity, created_at)
        );
      `);

      // Timeline data
      await client.query(`
        CREATE TABLE IF NOT EXISTS reality_timeline (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          domain_id UUID NOT NULL,
          domain VARCHAR(255) NOT NULL,
          date DATE NOT NULL,
          ai_score REAL NOT NULL,
          reality_score REAL NOT NULL,
          divergence REAL NOT NULL,
          major_events JSONB DEFAULT '[]',
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(domain_id, date)
        );
      `);

      // Data sources status
      await client.query(`
        CREATE TABLE IF NOT EXISTS data_sources (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          name VARCHAR(100) NOT NULL,
          type VARCHAR(50) NOT NULL,
          reliability REAL NOT NULL DEFAULT 0.8,
          update_frequency VARCHAR(50) NOT NULL,
          last_updated TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          status VARCHAR(20) NOT NULL DEFAULT 'active',
          error_message TEXT,
          UNIQUE(name)
        );
      `);

      console.log('✅ All tables created/verified');
    } finally {
      client.release();
    }
  }

  // READ EXISTING DATA FROM USER'S SYSTEM
  async getDomainData(domainIdentifier: string): Promise<DomainData | null> {
    const client = await this.pool.connect();
    
    try {
      const result = await client.query(`
        SELECT 
          d.id, d.domain,
          pdc.ai_consensus_score,
          pdc.memory_score,
          pdc.model_count,
          pdc.updated_at as last_processed
        FROM domains d
        LEFT JOIN public_domain_cache pdc ON d.id = pdc.domain_id
        WHERE d.domain = $1 OR d.id = $1
        LIMIT 1
      `, [domainIdentifier]);

      if (result.rows.length === 0) return null;

      const row = result.rows[0];
      return {
        id: row.id,
        domain: row.domain,
        ai_consensus_score: row.ai_consensus_score || 0,
        memory_score: row.memory_score || 0,
        model_count: row.model_count || 0,
        last_processed: row.last_processed || new Date()
      };
    } finally {
      client.release();
    }
  }

  async getAIResponses(domainId: string): Promise<AIResponse[]> {
    const client = await this.pool.connect();
    
    try {
      const result = await client.query(`
        SELECT 
          domain_id, model, prompt_type, raw_response, 
          captured_at, token_count
        FROM responses 
        WHERE domain_id = $1
        ORDER BY captured_at DESC
      `, [domainId]);

      return result.rows.map(row => ({
        domain_id: row.domain_id,
        model: row.model,
        prompt_type: row.prompt_type,
        raw_response: row.raw_response,
        captured_at: row.captured_at,
        token_count: row.token_count || 0
      }));
    } finally {
      client.release();
    }
  }

  async getAllDomains(limit: number = 100): Promise<DomainData[]> {
    const client = await this.pool.connect();
    
    try {
      const result = await client.query(`
        SELECT 
          d.id, d.domain,
          pdc.ai_consensus_score,
          pdc.memory_score,
          pdc.model_count,
          pdc.updated_at as last_processed
        FROM domains d
        LEFT JOIN public_domain_cache pdc ON d.id = pdc.domain_id
        WHERE pdc.memory_score IS NOT NULL
        ORDER BY pdc.memory_score DESC
        LIMIT $1
      `, [limit]);

      return result.rows.map(row => ({
        id: row.id,
        domain: row.domain,
        ai_consensus_score: row.ai_consensus_score || 0,
        memory_score: row.memory_score || 0,
        model_count: row.model_count || 0,
        last_processed: row.last_processed || new Date()
      }));
    } finally {
      client.release();
    }
  }

  // GROUND TRUTH DATA STORAGE
  async storeGroundTruthMetrics(metrics: GroundTruthMetrics): Promise<void> {
    const client = await this.pool.connect();
    
    try {
      await client.query(`
        INSERT INTO ground_truth_metrics (
          domain_id, domain, financial_data, regulatory_data, 
          market_data, business_data, calculated_at, data_freshness
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        ON CONFLICT (domain_id) DO UPDATE SET
          financial_data = EXCLUDED.financial_data,
          regulatory_data = EXCLUDED.regulatory_data,
          market_data = EXCLUDED.market_data,
          business_data = EXCLUDED.business_data,
          calculated_at = EXCLUDED.calculated_at,
          data_freshness = EXCLUDED.data_freshness
      `, [
        metrics.domain_id,
        await this.getDomainName(metrics.domain_id),
        JSON.stringify(metrics.financial_data),
        JSON.stringify(metrics.regulatory_data),
        JSON.stringify(metrics.market_data),
        JSON.stringify(metrics.business_data),
        metrics.calculated_at,
        metrics.data_freshness
      ]);
    } finally {
      client.release();
    }
  }

  async getGroundTruthMetrics(domainId: string): Promise<GroundTruthMetrics | null> {
    const client = await this.pool.connect();
    
    try {
      const result = await client.query(`
        SELECT * FROM ground_truth_metrics WHERE domain_id = $1
      `, [domainId]);

      if (result.rows.length === 0) return null;

      const row = result.rows[0];
      return {
        domain_id: row.domain_id,
        financial_data: row.financial_data,
        regulatory_data: row.regulatory_data,
        market_data: row.market_data,
        business_data: row.business_data,
        calculated_at: row.calculated_at,
        data_freshness: row.data_freshness
      };
    } finally {
      client.release();
    }
  }

  // REALITY CHECKS STORAGE
  async storeRealityCheck(check: RealityCheck): Promise<void> {
    const client = await this.pool.connect();
    
    try {
      await client.query(`
        INSERT INTO reality_checks (
          domain_id, domain, ai_consensus_score, reality_score,
          truth_score, divergence_score, divergence_level,
          confidence_level, ai_assessment, divergence_analysis,
          calculated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        ON CONFLICT (domain_id) DO UPDATE SET
          ai_consensus_score = EXCLUDED.ai_consensus_score,
          reality_score = EXCLUDED.reality_score,
          truth_score = EXCLUDED.truth_score,
          divergence_score = EXCLUDED.divergence_score,
          divergence_level = EXCLUDED.divergence_level,
          confidence_level = EXCLUDED.confidence_level,
          ai_assessment = EXCLUDED.ai_assessment,
          divergence_analysis = EXCLUDED.divergence_analysis,
          calculated_at = EXCLUDED.calculated_at
      `, [
        check.domain_id,
        check.domain,
        check.ai_assessment.consensus_score,
        this.calculateRealityScore(check.reality_metrics),
        check.truth_score,
        check.divergence_analysis.overall_divergence,
        check.divergence_analysis.divergence_level,
        check.confidence_level,
        JSON.stringify(check.ai_assessment),
        JSON.stringify(check.divergence_analysis),
        check.last_updated
      ]);
    } finally {
      client.release();
    }
  }

  async getRealityCheck(domainId: string): Promise<RealityCheck | null> {
    const client = await this.pool.connect();
    
    try {
      const result = await client.query(`
        SELECT * FROM reality_checks WHERE domain_id = $1
      `, [domainId]);

      if (result.rows.length === 0) return null;

      const row = result.rows[0];
      const groundTruth = await this.getGroundTruthMetrics(domainId);
      
      if (!groundTruth) return null;

      return {
        domain: row.domain,
        domain_id: row.domain_id,
        ai_assessment: row.ai_assessment,
        reality_metrics: groundTruth,
        divergence_analysis: row.divergence_analysis,
        truth_score: row.truth_score,
        confidence_level: row.confidence_level,
        last_updated: row.calculated_at
      };
    } finally {
      client.release();
    }
  }

  // HELPER METHODS
  private async getDomainName(domainId: string): Promise<string> {
    const client = await this.pool.connect();
    
    try {
      const result = await client.query(`
        SELECT domain FROM domains WHERE id = $1
      `, [domainId]);
      
      return result.rows[0]?.domain || 'unknown';
    } finally {
      client.release();
    }
  }

  private calculateRealityScore(metrics: GroundTruthMetrics): number {
    // Simple reality score calculation
    // This will be enhanced with proper algorithms
    let score = 50; // Base score
    
    // Financial health
    if (metrics.financial_data.status === 'bankrupt' || metrics.financial_data.status === 'delisted') {
      score -= 30;
    } else if (metrics.financial_data.status === 'public' && metrics.financial_data.stock_price) {
      score += 10;
    }
    
    // Regulatory issues
    if (metrics.regulatory_data.risk_level === 'critical') {
      score -= 25;
    } else if (metrics.regulatory_data.risk_level === 'high') {
      score -= 15;
    }
    
    // Market sentiment
    if (metrics.market_data.social_sentiment < 0) {
      score += metrics.market_data.social_sentiment * 10;
    }
    
    return Math.max(0, Math.min(100, score));
  }

  async close(): Promise<void> {
    await this.pool.end();
  }
}

export const db = new DatabaseManager(); 