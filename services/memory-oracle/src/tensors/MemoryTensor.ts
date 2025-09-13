import { Pool } from 'pg';
import winston from 'winston';

export interface MemoryVector {
  domainId: string;
  vector: number[];
  magnitude: number;
  timestamp: Date;
}

export interface MemoryTensorResult {
  domainId: string;
  memoryScore: number;
  components: {
    recency: number;
    frequency: number;
    significance: number;
    persistence: number;
  };
  vector: number[];
  computedAt: Date;
}

export class MemoryTensor {
  private pool: Pool;
  private logger: winston.Logger;
  private readonly VECTOR_DIMENSIONS = 768; // Standard embedding size
  private readonly DECAY_FACTOR = 0.95;
  private readonly SIGNIFICANCE_THRESHOLD = 0.7;

  constructor(pool: Pool, logger: winston.Logger) {
    this.pool = pool;
    this.logger = logger;
    this.initializeTensorTables();
  }

  private async initializeTensorTables(): Promise<void> {
    const schema = `
      -- Memory Tensor Storage
      CREATE TABLE IF NOT EXISTS memory_tensors (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        domain_id UUID REFERENCES domains(id),
        tensor_type TEXT NOT NULL DEFAULT 'memory',
        vector FLOAT[] NOT NULL,
        magnitude FLOAT NOT NULL,
        recency_score FLOAT NOT NULL,
        frequency_score FLOAT NOT NULL,
        significance_score FLOAT NOT NULL,
        persistence_score FLOAT NOT NULL,
        composite_score FLOAT NOT NULL,
        decay_rate FLOAT DEFAULT 0.95,
        last_accessed TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      -- Memory Access Patterns
      CREATE TABLE IF NOT EXISTS memory_access_patterns (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        domain_id UUID REFERENCES domains(id),
        access_type TEXT NOT NULL,
        access_context JSONB,
        impact_score FLOAT,
        accessed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      -- Memory Decay Tracking
      CREATE TABLE IF NOT EXISTS memory_decay_tracking (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        domain_id UUID REFERENCES domains(id),
        initial_score FLOAT NOT NULL,
        current_score FLOAT NOT NULL,
        decay_rate FLOAT NOT NULL,
        half_life_hours FLOAT,
        last_updated TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      -- Indexes for performance
      CREATE INDEX IF NOT EXISTS idx_memory_tensors_domain ON memory_tensors(domain_id);
      CREATE INDEX IF NOT EXISTS idx_memory_tensors_composite ON memory_tensors(composite_score DESC);
      CREATE INDEX IF NOT EXISTS idx_memory_access_domain ON memory_access_patterns(domain_id);
      CREATE INDEX IF NOT EXISTS idx_memory_decay_domain ON memory_decay_tracking(domain_id);
    `;

    try {
      await this.pool.query(schema);
      this.logger.info('🧠 Memory Tensor tables initialized');
    } catch (error) {
      this.logger.error('Failed to initialize memory tensor tables:', error);
      throw error;
    }
  }

  async computeMemoryTensor(domainId: string): Promise<MemoryTensorResult> {
    try {
      // Fetch all memory components
      const recency = await this.calculateRecencyScore(domainId);
      const frequency = await this.calculateFrequencyScore(domainId);
      const significance = await this.calculateSignificanceScore(domainId);
      const persistence = await this.calculatePersistenceScore(domainId);

      // Generate memory vector
      const vector = await this.generateMemoryVector(domainId, {
        recency,
        frequency,
        significance,
        persistence
      });

      // Calculate composite memory score
      const memoryScore = this.calculateCompositeScore({
        recency,
        frequency,
        significance,
        persistence
      });

      // Store tensor result
      await this.storeMemoryTensor(domainId, {
        vector,
        magnitude: this.calculateVectorMagnitude(vector),
        recency,
        frequency,
        significance,
        persistence,
        compositeScore: memoryScore
      });

      const result: MemoryTensorResult = {
        domainId,
        memoryScore,
        components: {
          recency,
          frequency,
          significance,
          persistence
        },
        vector,
        computedAt: new Date()
      };

      this.logger.info(`📊 Memory tensor computed for domain ${domainId}: score ${memoryScore.toFixed(3)}`);
      return result;

    } catch (error) {
      this.logger.error(`Failed to compute memory tensor for ${domainId}:`, error);
      throw error;
    }
  }

  private async calculateRecencyScore(domainId: string): Promise<number> {
    const query = `
      SELECT 
        MAX(created_at) as latest_memory,
        COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '24 hours') as recent_24h,
        COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '7 days') as recent_7d,
        COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '30 days') as recent_30d
      FROM competitive_memories
      WHERE domain_id = $1
    `;

    const result = await this.pool.query(query, [domainId]);
    const row = result.rows[0];

    if (!row.latest_memory) return 0;

    // Calculate time decay
    const hoursSinceLatest = (Date.now() - new Date(row.latest_memory).getTime()) / (1000 * 60 * 60);
    const timeDecay = Math.exp(-hoursSinceLatest / 168); // Weekly half-life

    // Calculate activity score
    const activityScore = (
      row.recent_24h * 1.0 +
      row.recent_7d * 0.5 +
      row.recent_30d * 0.25
    ) / (row.recent_30d || 1);

    return Math.min(1, timeDecay * 0.6 + activityScore * 0.4);
  }

  private async calculateFrequencyScore(domainId: string): Promise<number> {
    const query = `
      WITH access_stats AS (
        SELECT 
          COUNT(*) as total_accesses,
          COUNT(DISTINCT DATE_TRUNC('day', accessed_at)) as unique_days,
          COUNT(DISTINCT DATE_TRUNC('hour', accessed_at)) as unique_hours,
          STDDEV(EXTRACT(EPOCH FROM accessed_at)) as access_variance
        FROM memory_access_patterns
        WHERE domain_id = $1
        AND accessed_at > NOW() - INTERVAL '90 days'
      )
      SELECT * FROM access_stats
    `;

    const result = await this.pool.query(query, [domainId]);
    const stats = result.rows[0];

    if (!stats.total_accesses) return 0;

    // Calculate frequency components
    const accessDensity = Math.min(1, stats.total_accesses / 100);
    const temporalSpread = Math.min(1, stats.unique_days / 30);
    const consistency = stats.access_variance ? 1 / (1 + stats.access_variance / 1e6) : 0;

    return accessDensity * 0.4 + temporalSpread * 0.4 + consistency * 0.2;
  }

  private async calculateSignificanceScore(domainId: string): Promise<number> {
    const query = `
      SELECT 
        AVG(confidence) as avg_confidence,
        MAX(confidence) as max_confidence,
        COUNT(*) FILTER (WHERE alert_priority IN ('high', 'critical')) as high_priority_count,
        COUNT(*) FILTER (WHERE memory_type = 'synthesis') as synthesis_count,
        AVG(effectiveness) as avg_effectiveness
      FROM competitive_memories
      WHERE domain_id = $1
    `;

    const result = await this.pool.query(query, [domainId]);
    const metrics = result.rows[0];

    if (!metrics.avg_confidence) return 0;

    // Calculate significance components
    const confidenceScore = metrics.avg_confidence * 0.7 + metrics.max_confidence * 0.3;
    const priorityScore = Math.min(1, metrics.high_priority_count / 10);
    const synthesisScore = Math.min(1, metrics.synthesis_count / 5);
    const effectivenessScore = metrics.avg_effectiveness || 0;

    return (
      confidenceScore * 0.3 +
      priorityScore * 0.3 +
      synthesisScore * 0.2 +
      effectivenessScore * 0.2
    );
  }

  private async calculatePersistenceScore(domainId: string): Promise<number> {
    const query = `
      WITH memory_timeline AS (
        SELECT 
          DATE_TRUNC('week', created_at) as week,
          COUNT(*) as memory_count,
          AVG(confidence) as avg_confidence
        FROM competitive_memories
        WHERE domain_id = $1
        GROUP BY DATE_TRUNC('week', created_at)
        ORDER BY week DESC
        LIMIT 12
      )
      SELECT 
        COUNT(*) as active_weeks,
        AVG(memory_count) as avg_weekly_memories,
        STDDEV(memory_count) as memory_variance,
        AVG(avg_confidence) as overall_confidence
      FROM memory_timeline
    `;

    const result = await this.pool.query(query, [domainId]);
    const persistence = result.rows[0];

    if (!persistence.active_weeks) return 0;

    // Calculate persistence components
    const continuity = persistence.active_weeks / 12; // Proportion of active weeks
    const stability = persistence.memory_variance 
      ? 1 / (1 + persistence.memory_variance / persistence.avg_weekly_memories)
      : 0;
    const quality = persistence.overall_confidence || 0;

    return continuity * 0.4 + stability * 0.3 + quality * 0.3;
  }

  private async generateMemoryVector(
    domainId: string, 
    components: { recency: number; frequency: number; significance: number; persistence: number }
  ): Promise<number[]> {
    // Fetch existing embeddings and memories
    const query = `
      SELECT 
        response_embedding,
        confidence,
        memory_weight
      FROM domain_responses dr
      JOIN competitive_memories cm ON cm.domain_id = dr.domain_id
      WHERE dr.domain_id = $1
      AND response_embedding IS NOT NULL
      ORDER BY cm.updated_at DESC
      LIMIT 50
    `;

    const result = await this.pool.query(query, [domainId]);
    
    if (result.rows.length === 0) {
      // Return zero vector if no embeddings
      return new Array(this.VECTOR_DIMENSIONS).fill(0);
    }

    // Aggregate embeddings with weighted average
    const weightedVector = new Array(this.VECTOR_DIMENSIONS).fill(0);
    let totalWeight = 0;

    for (const row of result.rows) {
      const embedding = row.response_embedding;
      const weight = row.confidence * row.memory_weight;
      
      for (let i = 0; i < this.VECTOR_DIMENSIONS; i++) {
        weightedVector[i] += embedding[i] * weight;
      }
      totalWeight += weight;
    }

    // Normalize and apply component weights
    const componentMultiplier = (
      components.recency * 0.25 +
      components.frequency * 0.25 +
      components.significance * 0.3 +
      components.persistence * 0.2
    );

    return weightedVector.map(v => (v / totalWeight) * componentMultiplier);
  }

  private calculateVectorMagnitude(vector: number[]): number {
    return Math.sqrt(vector.reduce((sum, v) => sum + v * v, 0));
  }

  private calculateCompositeScore(components: {
    recency: number;
    frequency: number;
    significance: number;
    persistence: number;
  }): number {
    // Weighted combination with non-linear scaling
    const weightedSum = 
      Math.pow(components.recency, 1.2) * 0.25 +
      Math.pow(components.frequency, 1.1) * 0.25 +
      Math.pow(components.significance, 1.3) * 0.3 +
      Math.pow(components.persistence, 1.15) * 0.2;

    // Apply sigmoid for bounded output
    return 1 / (1 + Math.exp(-4 * (weightedSum - 0.5)));
  }

  private async storeMemoryTensor(domainId: string, tensor: any): Promise<void> {
    const query = `
      INSERT INTO memory_tensors (
        domain_id, vector, magnitude, recency_score, frequency_score,
        significance_score, persistence_score, composite_score
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      ON CONFLICT (domain_id) WHERE tensor_type = 'memory'
      DO UPDATE SET
        vector = EXCLUDED.vector,
        magnitude = EXCLUDED.magnitude,
        recency_score = EXCLUDED.recency_score,
        frequency_score = EXCLUDED.frequency_score,
        significance_score = EXCLUDED.significance_score,
        persistence_score = EXCLUDED.persistence_score,
        composite_score = EXCLUDED.composite_score,
        updated_at = CURRENT_TIMESTAMP
    `;

    await this.pool.query(query, [
      domainId,
      tensor.vector,
      tensor.magnitude,
      tensor.recency,
      tensor.frequency,
      tensor.significance,
      tensor.persistence,
      tensor.compositeScore
    ]);
  }

  async trackMemoryAccess(domainId: string, accessType: string, context?: any): Promise<void> {
    const query = `
      INSERT INTO memory_access_patterns (domain_id, access_type, access_context, impact_score)
      VALUES ($1, $2, $3, $4)
    `;

    const impactScore = this.calculateAccessImpact(accessType, context);
    await this.pool.query(query, [domainId, accessType, context || {}, impactScore]);

    // Update tensor recency
    await this.updateTensorRecency(domainId);
  }

  private calculateAccessImpact(accessType: string, context: any): number {
    const impactWeights: Record<string, number> = {
      'query': 0.3,
      'analysis': 0.5,
      'prediction': 0.7,
      'alert': 0.9,
      'synthesis': 0.8
    };

    return impactWeights[accessType] || 0.1;
  }

  private async updateTensorRecency(domainId: string): Promise<void> {
    const query = `
      UPDATE memory_tensors 
      SET last_accessed = CURRENT_TIMESTAMP,
          recency_score = LEAST(1.0, recency_score * 1.1)
      WHERE domain_id = $1
    `;

    await this.pool.query(query, [domainId]);
  }

  async applyMemoryDecay(): Promise<void> {
    try {
      const query = `
        UPDATE memory_tensors
        SET recency_score = recency_score * decay_rate,
            composite_score = (
              recency_score * decay_rate * 0.25 +
              frequency_score * 0.25 +
              significance_score * 0.3 +
              persistence_score * 0.2
            ),
            updated_at = CURRENT_TIMESTAMP
        WHERE last_accessed < NOW() - INTERVAL '24 hours'
      `;

      const result = await this.pool.query(query);
      this.logger.info(`📉 Applied memory decay to ${result.rowCount} tensors`);

    } catch (error) {
      this.logger.error('Failed to apply memory decay:', error);
      throw error;
    }
  }

  async getTopMemories(limit: number = 10): Promise<MemoryTensorResult[]> {
    const query = `
      SELECT 
        mt.*,
        d.domain
      FROM memory_tensors mt
      JOIN domains d ON d.id = mt.domain_id
      ORDER BY mt.composite_score DESC
      LIMIT $1
    `;

    const result = await this.pool.query(query, [limit]);
    
    return result.rows.map(row => ({
      domainId: row.domain_id,
      memoryScore: row.composite_score,
      components: {
        recency: row.recency_score,
        frequency: row.frequency_score,
        significance: row.significance_score,
        persistence: row.persistence_score
      },
      vector: row.vector,
      computedAt: row.updated_at
    }));
  }

  async findSimilarMemories(domainId: string, threshold: number = 0.8): Promise<string[]> {
    const query = `
      WITH target_tensor AS (
        SELECT vector FROM memory_tensors WHERE domain_id = $1
      )
      SELECT 
        mt.domain_id,
        1 - (mt.vector <=> t.vector) as similarity
      FROM memory_tensors mt, target_tensor t
      WHERE mt.domain_id != $1
      AND 1 - (mt.vector <=> t.vector) > $2
      ORDER BY similarity DESC
      LIMIT 20
    `;

    const result = await this.pool.query(query, [domainId, threshold]);
    return result.rows.map(row => row.domain_id);
  }
}