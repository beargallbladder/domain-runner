import { Pool } from 'pg';
import winston from 'winston';

export interface ConsensusMetrics {
  domainId: string;
  consensusScore: number;
  agreementLevel: 'strong' | 'moderate' | 'weak' | 'conflicted';
  components: {
    modelAgreement: number;
    temporalConsistency: number;
    crossPromptAlignment: number;
    confidenceAlignment: number;
  };
  dissensusPoints: DissensusPoint[];
  computedAt: Date;
}

export interface DissensusPoint {
  topic: string;
  divergence: number;
  models: string[];
  description: string;
}

export interface ConsensusInsight {
  id: string;
  domainId: string;
  insightType: 'consensus_shift' | 'emerging_agreement' | 'persistent_conflict';
  description: string;
  metrics: ConsensusMetrics;
  impact: 'low' | 'medium' | 'high';
  createdAt: Date;
}

export class ConsensusScorer {
  private pool: Pool;
  private logger: winston.Logger;
  private readonly CONSENSUS_THRESHOLD = 0.7;
  private readonly CONFLICT_THRESHOLD = 0.4;

  constructor(pool: Pool, logger: winston.Logger) {
    this.pool = pool;
    this.logger = logger;
    this.initializeConsensusTables();
  }

  private async initializeConsensusTables(): Promise<void> {
    const schema = `
      -- Consensus Scoring Storage
      CREATE TABLE IF NOT EXISTS consensus_scores (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        domain_id UUID REFERENCES domains(id),
        consensus_score FLOAT NOT NULL,
        agreement_level TEXT NOT NULL,
        model_agreement FLOAT NOT NULL,
        temporal_consistency FLOAT NOT NULL,
        cross_prompt_alignment FLOAT NOT NULL,
        confidence_alignment FLOAT NOT NULL,
        dissensus_points JSONB,
        computed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      -- Model Agreement Matrix
      CREATE TABLE IF NOT EXISTS model_agreement_matrix (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        domain_id UUID REFERENCES domains(id),
        model_a TEXT NOT NULL,
        model_b TEXT NOT NULL,
        agreement_score FLOAT NOT NULL,
        comparison_count INTEGER DEFAULT 0,
        last_updated TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      -- Consensus Time Series
      CREATE TABLE IF NOT EXISTS consensus_time_series (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        domain_id UUID REFERENCES domains(id),
        consensus_value FLOAT NOT NULL,
        metric_type TEXT NOT NULL,
        recorded_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      -- Consensus Insights
      CREATE TABLE IF NOT EXISTS consensus_insights (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        domain_id UUID REFERENCES domains(id),
        insight_type TEXT NOT NULL,
        description TEXT,
        metrics JSONB,
        impact TEXT NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        acknowledged_at TIMESTAMP WITH TIME ZONE
      );

      -- Indexes
      CREATE INDEX IF NOT EXISTS idx_consensus_scores_domain ON consensus_scores(domain_id, computed_at DESC);
      CREATE INDEX IF NOT EXISTS idx_consensus_scores_level ON consensus_scores(agreement_level);
      CREATE INDEX IF NOT EXISTS idx_model_agreement_domain ON model_agreement_matrix(domain_id);
      CREATE INDEX IF NOT EXISTS idx_consensus_time_series_domain ON consensus_time_series(domain_id, recorded_at DESC);
      CREATE INDEX IF NOT EXISTS idx_consensus_insights_domain ON consensus_insights(domain_id, created_at DESC);
    `;

    try {
      await this.pool.query(schema);
      this.logger.info('🤝 Consensus Scoring tables initialized');
    } catch (error) {
      this.logger.error('Failed to initialize consensus scoring tables:', error);
      throw error;
    }
  }

  async computeConsensus(domainId: string): Promise<ConsensusMetrics> {
    try {
      // Calculate consensus components
      const modelAgreement = await this.calculateModelAgreement(domainId);
      const temporalConsistency = await this.calculateTemporalConsistency(domainId);
      const crossPromptAlignment = await this.calculateCrossPromptAlignment(domainId);
      const confidenceAlignment = await this.calculateConfidenceAlignment(domainId);

      // Identify dissensus points
      const dissensusPoints = await this.identifyDissensusPoints(domainId);

      // Calculate composite consensus score
      const consensusScore = this.calculateCompositeConsensus({
        modelAgreement,
        temporalConsistency,
        crossPromptAlignment,
        confidenceAlignment
      });

      // Determine agreement level
      const agreementLevel = this.determineAgreementLevel(consensusScore, dissensusPoints);

      // Store consensus results
      await this.storeConsensusScore(domainId, {
        consensusScore,
        agreementLevel,
        components: {
          modelAgreement,
          temporalConsistency,
          crossPromptAlignment,
          confidenceAlignment
        },
        dissensusPoints
      });

      // Record time series
      await this.recordConsensusTimeSeries(domainId, 'composite', consensusScore);

      // Generate insights if significant changes
      await this.generateConsensusInsights(domainId, consensusScore, agreementLevel);

      // Update model agreement matrix
      await this.updateModelAgreementMatrix(domainId);

      const metrics: ConsensusMetrics = {
        domainId,
        consensusScore,
        agreementLevel,
        components: {
          modelAgreement,
          temporalConsistency,
          crossPromptAlignment,
          confidenceAlignment
        },
        dissensusPoints,
        computedAt: new Date()
      };

      this.logger.info(`🤝 Consensus computed for domain ${domainId}: ${agreementLevel} (${consensusScore.toFixed(3)})`);
      return metrics;

    } catch (error) {
      this.logger.error(`Failed to compute consensus for ${domainId}:`, error);
      throw error;
    }
  }

  private async calculateModelAgreement(domainId: string): Promise<number> {
    const query = `
      WITH model_responses AS (
        SELECT 
          prompt_type,
          model,
          response_hash,
          response_content,
          confidence_score
        FROM domain_responses
        WHERE domain_id = $1
        AND created_at > NOW() - INTERVAL '30 days'
      ),
      pairwise_agreement AS (
        SELECT 
          a.prompt_type,
          a.model as model_a,
          b.model as model_b,
          CASE 
            WHEN a.response_hash = b.response_hash THEN 1.0
            WHEN similarity(a.response_content, b.response_content) > 0.8 THEN 0.8
            WHEN similarity(a.response_content, b.response_content) > 0.6 THEN 0.6
            WHEN similarity(a.response_content, b.response_content) > 0.4 THEN 0.4
            ELSE 0.0
          END as agreement_score,
          (a.confidence_score + b.confidence_score) / 2 as avg_confidence
        FROM model_responses a
        JOIN model_responses b ON a.prompt_type = b.prompt_type
        WHERE a.model < b.model
      )
      SELECT 
        AVG(agreement_score) as avg_agreement,
        AVG(agreement_score * avg_confidence) as weighted_agreement,
        COUNT(DISTINCT model_a || '-' || model_b) as model_pairs,
        STDDEV(agreement_score) as agreement_variance
      FROM pairwise_agreement
    `;

    const result = await this.pool.query(query, [domainId]);
    const stats = result.rows[0];

    if (!stats || !stats.model_pairs) return 0.5;

    // Calculate model agreement score
    const baseAgreement = stats.avg_agreement || 0;
    const weightedAgreement = stats.weighted_agreement || 0;
    const consistencyBonus = stats.agreement_variance 
      ? Math.max(0, 1 - stats.agreement_variance)
      : 0;

    const modelAgreement = baseAgreement * 0.5 +
                          weightedAgreement * 0.4 +
                          consistencyBonus * 0.1;

    return Math.max(0, Math.min(1, modelAgreement));
  }

  private async calculateTemporalConsistency(domainId: string): Promise<number> {
    const query = `
      WITH temporal_responses AS (
        SELECT 
          DATE_TRUNC('week', created_at) as week,
          prompt_type,
          model,
          AVG(confidence_score) as avg_confidence,
          COUNT(*) as response_count,
          ARRAY_AGG(DISTINCT response_hash) as response_hashes
        FROM domain_responses
        WHERE domain_id = $1
        AND created_at > NOW() - INTERVAL '90 days'
        GROUP BY DATE_TRUNC('week', created_at), prompt_type, model
      ),
      consistency_analysis AS (
        SELECT 
          prompt_type,
          model,
          COUNT(DISTINCT week) as weeks_active,
          STDDEV(avg_confidence) as confidence_variance,
          AVG(CARDINALITY(response_hashes)) as avg_response_diversity
        FROM temporal_responses
        GROUP BY prompt_type, model
      )
      SELECT 
        AVG(CASE WHEN confidence_variance IS NULL THEN 1 ELSE 1 / (1 + confidence_variance) END) as confidence_consistency,
        AVG(CASE WHEN avg_response_diversity > 0 THEN 1 / avg_response_diversity ELSE 0 END) as response_consistency,
        AVG(weeks_active::FLOAT / 13) as temporal_coverage -- 13 weeks = 3 months
      FROM consistency_analysis
    `;

    const result = await this.pool.query(query, [domainId]);
    const stats = result.rows[0];

    if (!stats) return 0.5;

    const confidenceConsistency = stats.confidence_consistency || 0;
    const responseConsistency = stats.response_consistency || 0;
    const temporalCoverage = Math.min(1, stats.temporal_coverage || 0);

    const temporalConsistency = confidenceConsistency * 0.4 +
                               responseConsistency * 0.4 +
                               temporalCoverage * 0.2;

    return Math.max(0, Math.min(1, temporalConsistency));
  }

  private async calculateCrossPromptAlignment(domainId: string): Promise<number> {
    const query = `
      WITH prompt_themes AS (
        SELECT 
          model,
          prompt_type,
          response_content,
          confidence_score
        FROM domain_responses
        WHERE domain_id = $1
        AND created_at > NOW() - INTERVAL '30 days'
      ),
      cross_prompt_similarity AS (
        SELECT 
          a.model,
          similarity(a.response_content, b.response_content) as content_similarity,
          ABS(a.confidence_score - b.confidence_score) as confidence_diff
        FROM prompt_themes a
        JOIN prompt_themes b ON a.model = b.model
        WHERE a.prompt_type != b.prompt_type
      )
      SELECT 
        AVG(content_similarity) as avg_cross_similarity,
        AVG(1 - confidence_diff) as confidence_alignment,
        COUNT(DISTINCT model) as models_analyzed
      FROM cross_prompt_similarity
    `;

    const result = await this.pool.query(query, [domainId]);
    const stats = result.rows[0];

    if (!stats || !stats.models_analyzed) return 0.5;

    const contentAlignment = stats.avg_cross_similarity || 0;
    const confidenceAlignment = stats.confidence_alignment || 0;

    const crossPromptAlignment = contentAlignment * 0.6 + confidenceAlignment * 0.4;

    return Math.max(0, Math.min(1, crossPromptAlignment));
  }

  private async calculateConfidenceAlignment(domainId: string): Promise<number> {
    const query = `
      WITH confidence_distribution AS (
        SELECT 
          model,
          AVG(confidence_score) as model_avg_confidence,
          STDDEV(confidence_score) as model_confidence_stddev,
          COUNT(*) as response_count
        FROM domain_responses
        WHERE domain_id = $1
        AND created_at > NOW() - INTERVAL '30 days'
        GROUP BY model
      ),
      overall_stats AS (
        SELECT 
          AVG(confidence_score) as overall_avg,
          STDDEV(confidence_score) as overall_stddev
        FROM domain_responses
        WHERE domain_id = $1
        AND created_at > NOW() - INTERVAL '30 days'
      )
      SELECT 
        AVG(ABS(cd.model_avg_confidence - os.overall_avg)) as avg_deviation,
        STDDEV(cd.model_avg_confidence) as inter_model_variance,
        AVG(cd.model_confidence_stddev) as avg_intra_model_variance,
        COUNT(*) as model_count
      FROM confidence_distribution cd, overall_stats os
      GROUP BY os.overall_avg, os.overall_stddev
    `;

    const result = await this.pool.query(query, [domainId]);
    const stats = result.rows[0];

    if (!stats || !stats.model_count) return 0.5;

    // Calculate alignment components
    const deviationScore = 1 - Math.min(1, stats.avg_deviation || 0);
    const interModelConsistency = stats.inter_model_variance 
      ? 1 / (1 + stats.inter_model_variance)
      : 1;
    const intraModelConsistency = stats.avg_intra_model_variance
      ? 1 / (1 + stats.avg_intra_model_variance)
      : 1;

    const confidenceAlignment = deviationScore * 0.5 +
                               interModelConsistency * 0.3 +
                               intraModelConsistency * 0.2;

    return Math.max(0, Math.min(1, confidenceAlignment));
  }

  private async identifyDissensusPoints(domainId: string): Promise<DissensusPoint[]> {
    const query = `
      WITH response_analysis AS (
        SELECT 
          prompt_type,
          model,
          response_content,
          confidence_score,
          -- Extract key phrases (simplified - in production would use NLP)
          ARRAY[
            SUBSTRING(response_content FROM 'growth|decline|stable'),
            SUBSTRING(response_content FROM 'leader|follower|challenger'),
            SUBSTRING(response_content FROM 'innovative|traditional|conservative')
          ] as key_phrases
        FROM domain_responses
        WHERE domain_id = $1
        AND created_at > NOW() - INTERVAL '30 days'
      ),
      disagreement_analysis AS (
        SELECT 
          prompt_type,
          key_phrase,
          COUNT(DISTINCT model) as models_mentioning,
          ARRAY_AGG(DISTINCT model) as models,
          COUNT(*) as total_mentions
        FROM response_analysis, UNNEST(key_phrases) as key_phrase
        WHERE key_phrase IS NOT NULL
        GROUP BY prompt_type, key_phrase
      )
      SELECT 
        prompt_type as topic,
        key_phrase,
        models,
        models_mentioning::FLOAT / (SELECT COUNT(DISTINCT model) FROM response_analysis) as coverage_ratio
      FROM disagreement_analysis
      WHERE models_mentioning < (SELECT COUNT(DISTINCT model) FROM response_analysis) * 0.7
      ORDER BY models_mentioning DESC
      LIMIT 10
    `;

    const result = await this.pool.query(query, [domainId]);
    
    const dissensusPoints: DissensusPoint[] = [];
    
    for (const row of result.rows) {
      if (row.coverage_ratio < 0.7) {
        dissensusPoints.push({
          topic: row.topic,
          divergence: 1 - row.coverage_ratio,
          models: row.models,
          description: `Models disagree on ${row.key_phrase} for ${row.topic}`
        });
      }
    }

    return dissensusPoints;
  }

  private calculateCompositeConsensus(components: {
    modelAgreement: number;
    temporalConsistency: number;
    crossPromptAlignment: number;
    confidenceAlignment: number;
  }): number {
    // Weighted combination with emphasis on model agreement
    const weightedConsensus = 
      components.modelAgreement * 0.4 +
      components.temporalConsistency * 0.25 +
      components.crossPromptAlignment * 0.2 +
      components.confidenceAlignment * 0.15;

    // Apply sigmoid for smooth scaling
    return 1 / (1 + Math.exp(-5 * (weightedConsensus - 0.5)));
  }

  private determineAgreementLevel(
    consensusScore: number,
    dissensusPoints: DissensusPoint[]
  ): 'strong' | 'moderate' | 'weak' | 'conflicted' {
    const significantDissensus = dissensusPoints.filter(d => d.divergence > 0.5).length;

    if (consensusScore >= this.CONSENSUS_THRESHOLD && significantDissensus === 0) {
      return 'strong';
    } else if (consensusScore >= 0.6 && significantDissensus <= 2) {
      return 'moderate';
    } else if (consensusScore >= this.CONFLICT_THRESHOLD) {
      return 'weak';
    } else {
      return 'conflicted';
    }
  }

  private async storeConsensusScore(domainId: string, results: any): Promise<void> {
    const query = `
      INSERT INTO consensus_scores (
        domain_id, consensus_score, agreement_level,
        model_agreement, temporal_consistency, cross_prompt_alignment,
        confidence_alignment, dissensus_points
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    `;

    await this.pool.query(query, [
      domainId,
      results.consensusScore,
      results.agreementLevel,
      results.components.modelAgreement,
      results.components.temporalConsistency,
      results.components.crossPromptAlignment,
      results.components.confidenceAlignment,
      JSON.stringify(results.dissensusPoints)
    ]);
  }

  private async recordConsensusTimeSeries(domainId: string, metricType: string, value: number): Promise<void> {
    const query = `
      INSERT INTO consensus_time_series (domain_id, metric_type, consensus_value)
      VALUES ($1, $2, $3)
    `;

    await this.pool.query(query, [domainId, metricType, value]);
  }

  private async generateConsensusInsights(
    domainId: string,
    currentScore: number,
    agreementLevel: string
  ): Promise<void> {
    // Get historical consensus
    const query = `
      SELECT 
        consensus_score,
        agreement_level,
        computed_at
      FROM consensus_scores
      WHERE domain_id = $1
      AND computed_at > NOW() - INTERVAL '7 days'
      ORDER BY computed_at DESC
      LIMIT 10
    `;

    const result = await this.pool.query(query, [domainId]);
    const history = result.rows;

    if (history.length < 2) return;

    const previousScore = history[1].consensus_score;
    const scoreChange = currentScore - previousScore;

    // Detect significant changes
    if (Math.abs(scoreChange) > 0.2) {
      const insightType = scoreChange > 0 ? 'emerging_agreement' : 'consensus_shift';
      const impact = Math.abs(scoreChange) > 0.4 ? 'high' : 'medium';

      await this.createInsight(domainId, {
        insightType,
        description: `Consensus ${scoreChange > 0 ? 'improved' : 'declined'} by ${(Math.abs(scoreChange) * 100).toFixed(1)}% to ${agreementLevel}`,
        impact,
        metrics: {
          currentScore,
          previousScore,
          scoreChange,
          agreementLevel
        }
      });
    }

    // Check for persistent conflict
    if (agreementLevel === 'conflicted' && history.every(h => h.agreement_level === 'conflicted')) {
      await this.createInsight(domainId, {
        insightType: 'persistent_conflict',
        description: 'Models continue to show significant disagreement',
        impact: 'high',
        metrics: {
          currentScore,
          daysInConflict: history.length,
          agreementLevel
        }
      });
    }
  }

  private async createInsight(domainId: string, insight: any): Promise<void> {
    const query = `
      INSERT INTO consensus_insights (
        domain_id, insight_type, description, metrics, impact
      ) VALUES ($1, $2, $3, $4, $5)
    `;

    await this.pool.query(query, [
      domainId,
      insight.insightType,
      insight.description,
      JSON.stringify(insight.metrics),
      insight.impact
    ]);

    this.logger.info(`💡 Consensus insight generated for domain ${domainId}: ${insight.description}`);
  }

  private async updateModelAgreementMatrix(domainId: string): Promise<void> {
    const query = `
      WITH model_pairs AS (
        SELECT DISTINCT
          LEAST(a.model, b.model) as model_a,
          GREATEST(a.model, b.model) as model_b
        FROM domain_responses a
        CROSS JOIN domain_responses b
        WHERE a.domain_id = $1 AND b.domain_id = $1
        AND a.model != b.model
      ),
      agreement_scores AS (
        SELECT 
          mp.model_a,
          mp.model_b,
          AVG(
            CASE 
              WHEN a.response_hash = b.response_hash THEN 1.0
              ELSE similarity(a.response_content, b.response_content)
            END
          ) as agreement_score,
          COUNT(*) as comparison_count
        FROM model_pairs mp
        JOIN domain_responses a ON a.model = mp.model_a AND a.domain_id = $1
        JOIN domain_responses b ON b.model = mp.model_b AND b.domain_id = $1
          AND a.prompt_type = b.prompt_type
        GROUP BY mp.model_a, mp.model_b
      )
      INSERT INTO model_agreement_matrix (
        domain_id, model_a, model_b, agreement_score, comparison_count
      )
      SELECT $1, model_a, model_b, agreement_score, comparison_count
      FROM agreement_scores
      ON CONFLICT (domain_id, model_a, model_b) 
      DO UPDATE SET
        agreement_score = EXCLUDED.agreement_score,
        comparison_count = EXCLUDED.comparison_count,
        last_updated = CURRENT_TIMESTAMP
    `;

    await this.pool.query(query, [domainId]);
  }

  async getConsensusHistory(domainId: string, days: number = 30): Promise<any[]> {
    const query = `
      SELECT 
        consensus_score,
        agreement_level,
        model_agreement,
        temporal_consistency,
        cross_prompt_alignment,
        confidence_alignment,
        computed_at
      FROM consensus_scores
      WHERE domain_id = $1
      AND computed_at > NOW() - INTERVAL '${days} days'
      ORDER BY computed_at DESC
    `;

    const result = await this.pool.query(query, [domainId]);
    return result.rows;
  }

  async getModelAgreementMatrix(domainId: string): Promise<any[]> {
    const query = `
      SELECT 
        model_a,
        model_b,
        agreement_score,
        comparison_count,
        last_updated
      FROM model_agreement_matrix
      WHERE domain_id = $1
      ORDER BY agreement_score DESC
    `;

    const result = await this.pool.query(query, [domainId]);
    return result.rows;
  }

  async getConsensusInsights(domainId?: string): Promise<ConsensusInsight[]> {
    let query = `
      SELECT 
        ci.*,
        d.domain
      FROM consensus_insights ci
      JOIN domains d ON d.id = ci.domain_id
      WHERE ci.acknowledged_at IS NULL
    `;

    const params: any[] = [];
    
    if (domainId) {
      query += ` AND ci.domain_id = $1`;
      params.push(domainId);
    }

    query += ` ORDER BY 
      CASE impact
        WHEN 'high' THEN 1
        WHEN 'medium' THEN 2
        WHEN 'low' THEN 3
      END,
      ci.created_at DESC
      LIMIT 50`;

    const result = await this.pool.query(query, params);
    
    return result.rows.map(row => ({
      id: row.id,
      domainId: row.domain_id,
      insightType: row.insight_type,
      description: row.description,
      metrics: row.metrics,
      impact: row.impact,
      createdAt: row.created_at
    }));
  }

  async findConflictedDomains(limit: number = 20): Promise<any[]> {
    const query = `
      SELECT 
        cs.domain_id,
        d.domain,
        cs.consensus_score,
        cs.agreement_level,
        cs.dissensus_points,
        cs.computed_at
      FROM consensus_scores cs
      JOIN domains d ON d.id = cs.domain_id
      WHERE cs.agreement_level IN ('weak', 'conflicted')
      AND cs.computed_at = (
        SELECT MAX(computed_at) 
        FROM consensus_scores 
        WHERE domain_id = cs.domain_id
      )
      ORDER BY cs.consensus_score ASC
      LIMIT $1
    `;

    const result = await this.pool.query(query, [limit]);
    return result.rows;
  }

  async getSectorConsensus(): Promise<any[]> {
    const query = `
      WITH latest_consensus AS (
        SELECT DISTINCT ON (domain_id)
          domain_id,
          consensus_score,
          agreement_level
        FROM consensus_scores
        ORDER BY domain_id, computed_at DESC
      )
      SELECT 
        d.industry_category as sector,
        AVG(lc.consensus_score) as avg_consensus,
        COUNT(*) as domain_count,
        COUNT(*) FILTER (WHERE lc.agreement_level = 'strong') as strong_count,
        COUNT(*) FILTER (WHERE lc.agreement_level = 'conflicted') as conflicted_count
      FROM latest_consensus lc
      JOIN domains d ON d.id = lc.domain_id
      GROUP BY d.industry_category
      ORDER BY avg_consensus DESC
    `;

    const result = await this.pool.query(query);
    return result.rows;
  }
}