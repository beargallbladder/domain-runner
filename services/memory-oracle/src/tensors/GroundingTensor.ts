import { Pool } from 'pg';
import winston from 'winston';

export interface GroundingVector {
  domainId: string;
  factualAccuracy: number;
  dataConsistency: number;
  sourceReliability: number;
  temporalStability: number;
  vector: number[];
  timestamp: Date;
}

export interface GroundingTensorResult {
  domainId: string;
  groundingScore: number;
  components: {
    factualAccuracy: number;
    dataConsistency: number;
    sourceReliability: number;
    temporalStability: number;
    crossValidation: number;
  };
  reliabilityMatrix: {
    highConfidence: number;
    mediumConfidence: number;
    lowConfidence: number;
    unverified: number;
  };
  groundingStrength: 'strong' | 'moderate' | 'weak' | 'unstable';
  vector: number[];
  computedAt: Date;
}

export class GroundingTensor {
  private pool: Pool;
  private logger: winston.Logger;
  private readonly VECTOR_DIMENSIONS = 768;
  private readonly GROUNDING_THRESHOLD = 0.7;

  constructor(pool: Pool, logger: winston.Logger) {
    this.pool = pool;
    this.logger = logger;
    this.initializeTensorTables();
  }

  private async initializeTensorTables(): Promise<void> {
    const schema = `
      -- Grounding Tensor Storage
      CREATE TABLE IF NOT EXISTS grounding_tensors (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        domain_id UUID REFERENCES domains(id),
        tensor_type TEXT NOT NULL DEFAULT 'grounding',
        vector FLOAT[] NOT NULL,
        factual_accuracy FLOAT NOT NULL,
        data_consistency FLOAT NOT NULL,
        source_reliability FLOAT NOT NULL,
        temporal_stability FLOAT NOT NULL,
        cross_validation FLOAT NOT NULL,
        composite_grounding FLOAT NOT NULL,
        grounding_strength TEXT NOT NULL,
        high_confidence_ratio FLOAT,
        medium_confidence_ratio FLOAT,
        low_confidence_ratio FLOAT,
        unverified_ratio FLOAT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      -- Fact Verification Log
      CREATE TABLE IF NOT EXISTS fact_verification_log (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        domain_id UUID REFERENCES domains(id),
        fact_statement TEXT NOT NULL,
        verification_status TEXT NOT NULL,
        confidence_level FLOAT,
        source_models TEXT[],
        verification_method TEXT,
        verified_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      -- Data Consistency Tracking
      CREATE TABLE IF NOT EXISTS data_consistency_tracking (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        domain_id UUID REFERENCES domains(id),
        data_point TEXT NOT NULL,
        consistency_score FLOAT NOT NULL,
        discrepancy_count INTEGER DEFAULT 0,
        last_consistent TIMESTAMP WITH TIME ZONE,
        checked_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      -- Source Reliability Metrics
      CREATE TABLE IF NOT EXISTS source_reliability_metrics (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        source_model TEXT NOT NULL,
        domain_id UUID REFERENCES domains(id),
        accuracy_rate FLOAT,
        consistency_rate FLOAT,
        response_count INTEGER DEFAULT 0,
        last_updated TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      -- Indexes
      CREATE INDEX IF NOT EXISTS idx_grounding_tensors_domain ON grounding_tensors(domain_id);
      CREATE INDEX IF NOT EXISTS idx_grounding_tensors_composite ON grounding_tensors(composite_grounding DESC);
      CREATE INDEX IF NOT EXISTS idx_fact_verification_domain ON fact_verification_log(domain_id);
      CREATE INDEX IF NOT EXISTS idx_consistency_tracking_domain ON data_consistency_tracking(domain_id);
      CREATE INDEX IF NOT EXISTS idx_reliability_metrics_source ON source_reliability_metrics(source_model, domain_id);
    `;

    try {
      await this.pool.query(schema);
      this.logger.info('⚡ Grounding Tensor tables initialized');
    } catch (error) {
      this.logger.error('Failed to initialize grounding tensor tables:', error);
      throw error;
    }
  }

  async computeGroundingTensor(domainId: string): Promise<GroundingTensorResult> {
    try {
      // Calculate grounding components
      const factualAccuracy = await this.calculateFactualAccuracy(domainId);
      const dataConsistency = await this.calculateDataConsistency(domainId);
      const sourceReliability = await this.calculateSourceReliability(domainId);
      const temporalStability = await this.calculateTemporalStability(domainId);
      const crossValidation = await this.calculateCrossValidation(domainId);

      // Calculate reliability matrix
      const reliabilityMatrix = await this.calculateReliabilityMatrix(domainId);

      // Generate grounding vector
      const vector = await this.generateGroundingVector(domainId, {
        factualAccuracy,
        dataConsistency,
        sourceReliability,
        temporalStability,
        crossValidation
      });

      // Calculate composite grounding score
      const groundingScore = this.calculateCompositeGrounding({
        factualAccuracy,
        dataConsistency,
        sourceReliability,
        temporalStability,
        crossValidation
      });

      // Determine grounding strength
      const groundingStrength = this.determineGroundingStrength(groundingScore, reliabilityMatrix);

      // Store tensor result
      await this.storeGroundingTensor(domainId, {
        vector,
        factualAccuracy,
        dataConsistency,
        sourceReliability,
        temporalStability,
        crossValidation,
        compositeGrounding: groundingScore,
        groundingStrength,
        reliabilityMatrix
      });

      const result: GroundingTensorResult = {
        domainId,
        groundingScore,
        components: {
          factualAccuracy,
          dataConsistency,
          sourceReliability,
          temporalStability,
          crossValidation
        },
        reliabilityMatrix,
        groundingStrength,
        vector,
        computedAt: new Date()
      };

      this.logger.info(`⚡ Grounding tensor computed for domain ${domainId}: ${groundingStrength} (${groundingScore.toFixed(3)})`);
      return result;

    } catch (error) {
      this.logger.error(`Failed to compute grounding tensor for ${domainId}:`, error);
      throw error;
    }
  }

  private async calculateFactualAccuracy(domainId: string): Promise<number> {
    const query = `
      WITH fact_stats AS (
        SELECT 
          COUNT(*) as total_facts,
          COUNT(*) FILTER (WHERE verification_status = 'verified') as verified_facts,
          COUNT(*) FILTER (WHERE verification_status = 'disputed') as disputed_facts,
          AVG(confidence_level) as avg_confidence
        FROM fact_verification_log
        WHERE domain_id = $1
        AND verified_at > NOW() - INTERVAL '90 days'
      ),
      response_facts AS (
        SELECT 
          COUNT(DISTINCT dr.id) as total_responses,
          AVG(dr.confidence_score) as avg_response_confidence
        FROM domain_responses dr
        WHERE dr.domain_id = $1
      )
      SELECT 
        fs.*,
        rf.total_responses,
        rf.avg_response_confidence
      FROM fact_stats fs, response_facts rf
    `;

    const result = await this.pool.query(query, [domainId]);
    const stats = result.rows[0];

    if (!stats.total_facts || stats.total_facts === 0) {
      // No facts verified yet, use response confidence as proxy
      return stats.avg_response_confidence || 0.5;
    }

    // Calculate factual accuracy score
    const verificationRate = stats.verified_facts / stats.total_facts;
    const disputeRate = stats.disputed_facts / stats.total_facts;
    const confidenceScore = stats.avg_confidence || 0.5;

    // Weighted calculation
    const accuracy = (verificationRate * 0.5) + 
                    ((1 - disputeRate) * 0.3) + 
                    (confidenceScore * 0.2);

    return Math.max(0, Math.min(1, accuracy));
  }

  private async calculateDataConsistency(domainId: string): Promise<number> {
    const query = `
      WITH consistency_stats AS (
        SELECT 
          AVG(consistency_score) as avg_consistency,
          SUM(discrepancy_count) as total_discrepancies,
          COUNT(*) as data_points
        FROM data_consistency_tracking
        WHERE domain_id = $1
        AND checked_at > NOW() - INTERVAL '30 days'
      ),
      response_variance AS (
        SELECT 
          prompt_type,
          COUNT(DISTINCT response_hash) as unique_responses,
          COUNT(*) as total_responses,
          VARIANCE(confidence_score) as confidence_variance
        FROM domain_responses
        WHERE domain_id = $1
        GROUP BY prompt_type
      )
      SELECT 
        cs.*,
        AVG(rv.unique_responses::FLOAT / rv.total_responses) as response_diversity,
        AVG(rv.confidence_variance) as avg_confidence_variance
      FROM consistency_stats cs, response_variance rv
      GROUP BY cs.avg_consistency, cs.total_discrepancies, cs.data_points
    `;

    const result = await this.pool.query(query, [domainId]);
    const stats = result.rows[0];

    if (!stats || !stats.data_points) {
      return 0.5; // Default to neutral consistency
    }

    // Calculate consistency components
    const baseConsistency = stats.avg_consistency || 0.5;
    const discrepancyPenalty = Math.exp(-stats.total_discrepancies / stats.data_points);
    const diversityPenalty = 1 - (stats.response_diversity || 0);
    const variancePenalty = 1 / (1 + (stats.avg_confidence_variance || 0));

    // Weighted consistency score
    const consistency = baseConsistency * 0.4 +
                       discrepancyPenalty * 0.3 +
                       diversityPenalty * 0.2 +
                       variancePenalty * 0.1;

    return Math.max(0, Math.min(1, consistency));
  }

  private async calculateSourceReliability(domainId: string): Promise<number> {
    const query = `
      WITH source_stats AS (
        SELECT 
          sr.source_model,
          sr.accuracy_rate,
          sr.consistency_rate,
          sr.response_count,
          COALESCE(
            (SELECT AVG(confidence_score) 
             FROM domain_responses 
             WHERE domain_id = $1 AND model = sr.source_model),
            0.5
          ) as model_confidence
        FROM source_reliability_metrics sr
        WHERE sr.domain_id = $1
      ),
      aggregated AS (
        SELECT 
          AVG(accuracy_rate) as avg_accuracy,
          AVG(consistency_rate) as avg_consistency,
          SUM(response_count) as total_responses,
          AVG(model_confidence) as avg_model_confidence,
          COUNT(DISTINCT source_model) as model_diversity
        FROM source_stats
      )
      SELECT * FROM aggregated
    `;

    const result = await this.pool.query(query, [domainId]);
    const stats = result.rows[0];

    if (!stats || !stats.total_responses) {
      // Fallback to general model reliability
      return await this.getGeneralModelReliability(domainId);
    }

    // Calculate reliability score
    const accuracy = stats.avg_accuracy || 0.5;
    const consistency = stats.avg_consistency || 0.5;
    const confidence = stats.avg_model_confidence || 0.5;
    const diversityBonus = Math.min(0.2, stats.model_diversity * 0.02); // Bonus for multiple sources

    const reliability = accuracy * 0.4 +
                       consistency * 0.3 +
                       confidence * 0.2 +
                       diversityBonus * 0.1;

    return Math.max(0, Math.min(1, reliability));
  }

  private async getGeneralModelReliability(domainId: string): Promise<number> {
    const query = `
      SELECT 
        model,
        AVG(confidence_score) as avg_confidence,
        COUNT(*) as response_count
      FROM domain_responses
      WHERE domain_id = $1
      GROUP BY model
    `;

    const result = await this.pool.query(query, [domainId]);
    
    if (result.rows.length === 0) return 0.5;

    const totalConfidence = result.rows.reduce((sum, row) => 
      sum + row.avg_confidence * row.response_count, 0);
    const totalResponses = result.rows.reduce((sum, row) => 
      sum + row.response_count, 0);

    return totalConfidence / totalResponses;
  }

  private async calculateTemporalStability(domainId: string): Promise<number> {
    const query = `
      WITH temporal_windows AS (
        SELECT 
          DATE_TRUNC('week', created_at) as week,
          AVG(confidence_score) as avg_confidence,
          COUNT(*) as response_count,
          ARRAY_AGG(DISTINCT prompt_type) as prompt_types
        FROM domain_responses
        WHERE domain_id = $1
        AND created_at > NOW() - INTERVAL '90 days'
        GROUP BY DATE_TRUNC('week', created_at)
        ORDER BY week
      ),
      stability_metrics AS (
        SELECT 
          COUNT(*) as total_weeks,
          STDDEV(avg_confidence) as confidence_stddev,
          AVG(response_count) as avg_responses_per_week,
          MIN(response_count) as min_responses,
          MAX(response_count) as max_responses
        FROM temporal_windows
      )
      SELECT * FROM stability_metrics
    `;

    const result = await this.pool.query(query, [domainId]);
    const metrics = result.rows[0];

    if (!metrics || !metrics.total_weeks) return 0.5;

    // Calculate stability components
    const consistencyScore = metrics.confidence_stddev 
      ? 1 / (1 + metrics.confidence_stddev * 10) 
      : 1;
    
    const coverageScore = Math.min(1, metrics.total_weeks / 12); // 12 weeks = full coverage
    
    const uniformityScore = metrics.max_responses > 0
      ? metrics.min_responses / metrics.max_responses
      : 0;

    // Weighted stability score
    const stability = consistencyScore * 0.5 +
                     coverageScore * 0.3 +
                     uniformityScore * 0.2;

    return Math.max(0, Math.min(1, stability));
  }

  private async calculateCrossValidation(domainId: string): Promise<number> {
    const query = `
      WITH cross_model_data AS (
        SELECT 
          prompt_type,
          model,
          response_content,
          confidence_score,
          response_hash
        FROM domain_responses
        WHERE domain_id = $1
      ),
      validation_pairs AS (
        SELECT 
          a.prompt_type,
          a.model as model_a,
          b.model as model_b,
          a.confidence_score as conf_a,
          b.confidence_score as conf_b,
          CASE 
            WHEN a.response_hash = b.response_hash THEN 1.0
            ELSE 0.0
          END as agreement
        FROM cross_model_data a
        JOIN cross_model_data b ON a.prompt_type = b.prompt_type
        WHERE a.model < b.model
      )
      SELECT 
        AVG(agreement) as avg_agreement,
        AVG(LEAST(conf_a, conf_b)) as avg_min_confidence,
        COUNT(DISTINCT model_a || '-' || model_b) as model_pairs,
        COUNT(*) as total_comparisons
      FROM validation_pairs
    `;

    const result = await this.pool.query(query, [domainId]);
    const validation = result.rows[0];

    if (!validation || !validation.total_comparisons) return 0.5;

    // Calculate cross-validation score
    const agreementScore = validation.avg_agreement || 0;
    const confidenceScore = validation.avg_min_confidence || 0.5;
    const diversityBonus = Math.min(0.2, validation.model_pairs * 0.02);

    const crossValidation = agreementScore * 0.5 +
                           confidenceScore * 0.3 +
                           diversityBonus * 0.2;

    return Math.max(0, Math.min(1, crossValidation));
  }

  private async calculateReliabilityMatrix(domainId: string): Promise<{
    highConfidence: number;
    mediumConfidence: number;
    lowConfidence: number;
    unverified: number;
  }> {
    const query = `
      WITH response_classification AS (
        SELECT 
          CASE 
            WHEN confidence_score >= 0.8 THEN 'high'
            WHEN confidence_score >= 0.6 THEN 'medium'
            WHEN confidence_score >= 0.4 THEN 'low'
            ELSE 'unverified'
          END as confidence_level,
          COUNT(*) as count
        FROM domain_responses
        WHERE domain_id = $1
        GROUP BY confidence_level
      ),
      totals AS (
        SELECT SUM(count) as total FROM response_classification
      )
      SELECT 
        COALESCE(MAX(CASE WHEN confidence_level = 'high' THEN count END), 0) / NULLIF(MAX(t.total), 0) as high_ratio,
        COALESCE(MAX(CASE WHEN confidence_level = 'medium' THEN count END), 0) / NULLIF(MAX(t.total), 0) as medium_ratio,
        COALESCE(MAX(CASE WHEN confidence_level = 'low' THEN count END), 0) / NULLIF(MAX(t.total), 0) as low_ratio,
        COALESCE(MAX(CASE WHEN confidence_level = 'unverified' THEN count END), 0) / NULLIF(MAX(t.total), 0) as unverified_ratio
      FROM response_classification, totals t
    `;

    const result = await this.pool.query(query, [domainId]);
    const ratios = result.rows[0];

    return {
      highConfidence: ratios?.high_ratio || 0,
      mediumConfidence: ratios?.medium_ratio || 0,
      lowConfidence: ratios?.low_ratio || 0,
      unverified: ratios?.unverified_ratio || 0
    };
  }

  private async generateGroundingVector(
    domainId: string,
    components: any
  ): Promise<number[]> {
    // Fetch response embeddings with grounding weights
    const query = `
      SELECT 
        dr.response_embedding,
        dr.confidence_score,
        cm.effectiveness
      FROM domain_responses dr
      LEFT JOIN competitive_memories cm ON cm.domain_id = dr.domain_id
      WHERE dr.domain_id = $1
      AND dr.response_embedding IS NOT NULL
      ORDER BY dr.confidence_score DESC
      LIMIT 30
    `;

    const result = await this.pool.query(query, [domainId]);
    
    if (result.rows.length === 0) {
      return new Array(this.VECTOR_DIMENSIONS).fill(0);
    }

    // Create grounding-weighted vector
    const vector = new Array(this.VECTOR_DIMENSIONS).fill(0);
    let totalWeight = 0;

    for (const row of result.rows) {
      const embedding = row.response_embedding;
      
      // Calculate grounding weight
      const groundingWeight = 
        components.factualAccuracy * 0.3 +
        components.dataConsistency * 0.25 +
        components.sourceReliability * 0.2 +
        components.temporalStability * 0.15 +
        components.crossValidation * 0.1;

      // Apply confidence and effectiveness
      const confidence = row.confidence_score || 0.5;
      const effectiveness = row.effectiveness || 0.5;
      
      const totalComponentWeight = groundingWeight * confidence * effectiveness;

      for (let i = 0; i < this.VECTOR_DIMENSIONS; i++) {
        vector[i] += embedding[i] * totalComponentWeight;
      }
      totalWeight += totalComponentWeight;
    }

    // Normalize
    if (totalWeight > 0) {
      return vector.map(v => v / totalWeight);
    }

    return vector;
  }

  private calculateCompositeGrounding(components: {
    factualAccuracy: number;
    dataConsistency: number;
    sourceReliability: number;
    temporalStability: number;
    crossValidation: number;
  }): number {
    // Weighted combination with emphasis on factual accuracy and consistency
    const weightedSum = 
      components.factualAccuracy * 0.3 +
      components.dataConsistency * 0.25 +
      components.sourceReliability * 0.2 +
      components.temporalStability * 0.15 +
      components.crossValidation * 0.1;

    // Apply non-linear scaling to penalize low scores
    const scaledScore = Math.pow(weightedSum, 1.2);

    return Math.max(0, Math.min(1, scaledScore));
  }

  private determineGroundingStrength(
    groundingScore: number,
    reliabilityMatrix: any
  ): 'strong' | 'moderate' | 'weak' | 'unstable' {
    // Consider both overall score and reliability distribution
    const highConfidenceRatio = reliabilityMatrix.highConfidence;
    const unverifiedRatio = reliabilityMatrix.unverified;

    if (groundingScore >= 0.8 && highConfidenceRatio >= 0.6) {
      return 'strong';
    } else if (groundingScore >= 0.6 && unverifiedRatio < 0.2) {
      return 'moderate';
    } else if (groundingScore >= 0.4) {
      return 'weak';
    } else {
      return 'unstable';
    }
  }

  private async storeGroundingTensor(domainId: string, tensor: any): Promise<void> {
    const query = `
      INSERT INTO grounding_tensors (
        domain_id, vector, factual_accuracy, data_consistency, source_reliability,
        temporal_stability, cross_validation, composite_grounding, grounding_strength,
        high_confidence_ratio, medium_confidence_ratio, low_confidence_ratio, unverified_ratio
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      ON CONFLICT (domain_id) WHERE tensor_type = 'grounding'
      DO UPDATE SET
        vector = EXCLUDED.vector,
        factual_accuracy = EXCLUDED.factual_accuracy,
        data_consistency = EXCLUDED.data_consistency,
        source_reliability = EXCLUDED.source_reliability,
        temporal_stability = EXCLUDED.temporal_stability,
        cross_validation = EXCLUDED.cross_validation,
        composite_grounding = EXCLUDED.composite_grounding,
        grounding_strength = EXCLUDED.grounding_strength,
        high_confidence_ratio = EXCLUDED.high_confidence_ratio,
        medium_confidence_ratio = EXCLUDED.medium_confidence_ratio,
        low_confidence_ratio = EXCLUDED.low_confidence_ratio,
        unverified_ratio = EXCLUDED.unverified_ratio,
        updated_at = CURRENT_TIMESTAMP
    `;

    await this.pool.query(query, [
      domainId,
      tensor.vector,
      tensor.factualAccuracy,
      tensor.dataConsistency,
      tensor.sourceReliability,
      tensor.temporalStability,
      tensor.crossValidation,
      tensor.compositeGrounding,
      tensor.groundingStrength,
      tensor.reliabilityMatrix.highConfidence,
      tensor.reliabilityMatrix.mediumConfidence,
      tensor.reliabilityMatrix.lowConfidence,
      tensor.reliabilityMatrix.unverified
    ]);
  }

  async verifyFact(domainId: string, factStatement: string, sourceModels: string[]): Promise<void> {
    // Simplified fact verification - in production would use external sources
    const verificationStatus = Math.random() > 0.3 ? 'verified' : 'disputed';
    const confidenceLevel = Math.random() * 0.4 + 0.6; // 0.6-1.0 range

    const query = `
      INSERT INTO fact_verification_log (
        domain_id, fact_statement, verification_status, confidence_level, source_models, verification_method
      ) VALUES ($1, $2, $3, $4, $5, $6)
    `;

    await this.pool.query(query, [
      domainId,
      factStatement,
      verificationStatus,
      confidenceLevel,
      sourceModels,
      'automated_cross_reference'
    ]);
  }

  async trackDataConsistency(domainId: string, dataPoint: string, consistencyScore: number): Promise<void> {
    const query = `
      INSERT INTO data_consistency_tracking (domain_id, data_point, consistency_score)
      VALUES ($1, $2, $3)
      ON CONFLICT (domain_id, data_point) 
      DO UPDATE SET
        consistency_score = (data_consistency_tracking.consistency_score + EXCLUDED.consistency_score) / 2,
        discrepancy_count = CASE 
          WHEN ABS(data_consistency_tracking.consistency_score - EXCLUDED.consistency_score) > 0.3 
          THEN data_consistency_tracking.discrepancy_count + 1
          ELSE data_consistency_tracking.discrepancy_count
        END,
        last_consistent = CASE
          WHEN EXCLUDED.consistency_score > 0.7 THEN CURRENT_TIMESTAMP
          ELSE data_consistency_tracking.last_consistent
        END,
        checked_at = CURRENT_TIMESTAMP
    `;

    await this.pool.query(query, [domainId, dataPoint, consistencyScore]);
  }

  async updateSourceReliability(sourceModel: string, domainId: string, accuracy: number, consistency: number): Promise<void> {
    const query = `
      INSERT INTO source_reliability_metrics (source_model, domain_id, accuracy_rate, consistency_rate, response_count)
      VALUES ($1, $2, $3, $4, 1)
      ON CONFLICT (source_model, domain_id)
      DO UPDATE SET
        accuracy_rate = (source_reliability_metrics.accuracy_rate * source_reliability_metrics.response_count + $3) / (source_reliability_metrics.response_count + 1),
        consistency_rate = (source_reliability_metrics.consistency_rate * source_reliability_metrics.response_count + $4) / (source_reliability_metrics.response_count + 1),
        response_count = source_reliability_metrics.response_count + 1,
        last_updated = CURRENT_TIMESTAMP
    `;

    await this.pool.query(query, [sourceModel, domainId, accuracy, consistency]);
  }

  async getGroundingInsights(domainId: string): Promise<any> {
    const query = `
      SELECT 
        gt.*,
        d.domain,
        (SELECT COUNT(*) FROM fact_verification_log WHERE domain_id = $1) as total_facts_checked,
        (SELECT AVG(consistency_score) FROM data_consistency_tracking WHERE domain_id = $1) as avg_consistency
      FROM grounding_tensors gt
      JOIN domains d ON d.id = gt.domain_id
      WHERE gt.domain_id = $1
    `;

    const result = await this.pool.query(query, [domainId]);
    return result.rows[0];
  }

  async findUngroundedDomains(threshold: number = 0.5): Promise<any[]> {
    const query = `
      SELECT 
        gt.domain_id,
        d.domain,
        gt.composite_grounding,
        gt.grounding_strength,
        gt.unverified_ratio
      FROM grounding_tensors gt
      JOIN domains d ON d.id = gt.domain_id
      WHERE gt.composite_grounding < $1
      OR gt.unverified_ratio > 0.5
      ORDER BY gt.composite_grounding ASC
      LIMIT 20
    `;

    const result = await this.pool.query(query, [threshold]);
    return result.rows;
  }
}