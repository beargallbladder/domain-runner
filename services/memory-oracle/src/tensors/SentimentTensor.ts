import { Pool } from 'pg';
import winston from 'winston';

export interface SentimentVector {
  domainId: string;
  sentiment: {
    positive: number;
    negative: number;
    neutral: number;
    mixed: number;
  };
  emotions: {
    confidence: number;
    excitement: number;
    concern: number;
    urgency: number;
    opportunity: number;
  };
  vector: number[];
  timestamp: Date;
}

export interface SentimentTensorResult {
  domainId: string;
  sentimentScore: number;
  sentimentDistribution: {
    positive: number;
    negative: number;
    neutral: number;
    mixed: number;
  };
  emotionalProfile: {
    confidence: number;
    excitement: number;
    concern: number;
    urgency: number;
    opportunity: number;
  };
  marketSentiment: 'bullish' | 'bearish' | 'neutral' | 'volatile';
  vector: number[];
  computedAt: Date;
}

export class SentimentTensor {
  private pool: Pool;
  private logger: winston.Logger;
  private readonly VECTOR_DIMENSIONS = 768;
  private readonly SENTIMENT_WINDOW_DAYS = 90;

  constructor(pool: Pool, logger: winston.Logger) {
    this.pool = pool;
    this.logger = logger;
    this.initializeTensorTables();
  }

  private async initializeTensorTables(): Promise<void> {
    const schema = `
      -- Sentiment Tensor Storage
      CREATE TABLE IF NOT EXISTS sentiment_tensors (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        domain_id UUID REFERENCES domains(id),
        tensor_type TEXT NOT NULL DEFAULT 'sentiment',
        vector FLOAT[] NOT NULL,
        positive_score FLOAT NOT NULL,
        negative_score FLOAT NOT NULL,
        neutral_score FLOAT NOT NULL,
        mixed_score FLOAT NOT NULL,
        confidence_emotion FLOAT NOT NULL,
        excitement_emotion FLOAT NOT NULL,
        concern_emotion FLOAT NOT NULL,
        urgency_emotion FLOAT NOT NULL,
        opportunity_emotion FLOAT NOT NULL,
        composite_sentiment FLOAT NOT NULL,
        market_sentiment TEXT NOT NULL,
        volatility_index FLOAT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      -- Sentiment Time Series
      CREATE TABLE IF NOT EXISTS sentiment_time_series (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        domain_id UUID REFERENCES domains(id),
        sentiment_value FLOAT NOT NULL,
        sentiment_type TEXT NOT NULL,
        source_model TEXT,
        confidence FLOAT,
        recorded_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      -- Sentiment Anomalies
      CREATE TABLE IF NOT EXISTS sentiment_anomalies (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        domain_id UUID REFERENCES domains(id),
        anomaly_type TEXT NOT NULL,
        severity FLOAT NOT NULL,
        description TEXT,
        detected_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        resolved_at TIMESTAMP WITH TIME ZONE
      );

      -- Indexes
      CREATE INDEX IF NOT EXISTS idx_sentiment_tensors_domain ON sentiment_tensors(domain_id);
      CREATE INDEX IF NOT EXISTS idx_sentiment_tensors_composite ON sentiment_tensors(composite_sentiment DESC);
      CREATE INDEX IF NOT EXISTS idx_sentiment_time_series_domain ON sentiment_time_series(domain_id, recorded_at DESC);
      CREATE INDEX IF NOT EXISTS idx_sentiment_anomalies_domain ON sentiment_anomalies(domain_id, detected_at DESC);
    `;

    try {
      await this.pool.query(schema);
      this.logger.info('💭 Sentiment Tensor tables initialized');
    } catch (error) {
      this.logger.error('Failed to initialize sentiment tensor tables:', error);
      throw error;
    }
  }

  async computeSentimentTensor(domainId: string): Promise<SentimentTensorResult> {
    try {
      // Extract sentiment components from domain responses
      const sentimentData = await this.extractSentimentData(domainId);
      
      // Calculate sentiment distribution
      const distribution = await this.calculateSentimentDistribution(sentimentData);
      
      // Calculate emotional profile
      const emotions = await this.calculateEmotionalProfile(domainId, sentimentData);
      
      // Generate sentiment vector
      const vector = await this.generateSentimentVector(domainId, distribution, emotions);
      
      // Determine market sentiment
      const marketSentiment = this.determineMarketSentiment(distribution, emotions);
      
      // Calculate composite sentiment score
      const sentimentScore = this.calculateCompositeSentiment(distribution, emotions);

      // Store tensor result
      await this.storeSentimentTensor(domainId, {
        vector,
        distribution,
        emotions,
        compositeSentiment: sentimentScore,
        marketSentiment
      });

      // Record time series data
      await this.recordSentimentTimeSeries(domainId, sentimentScore);

      // Check for anomalies
      await this.detectSentimentAnomalies(domainId, sentimentScore, distribution);

      const result: SentimentTensorResult = {
        domainId,
        sentimentScore,
        sentimentDistribution: distribution,
        emotionalProfile: emotions,
        marketSentiment,
        vector,
        computedAt: new Date()
      };

      this.logger.info(`💭 Sentiment tensor computed for domain ${domainId}: ${marketSentiment} (${sentimentScore.toFixed(3)})`);
      return result;

    } catch (error) {
      this.logger.error(`Failed to compute sentiment tensor for ${domainId}:`, error);
      throw error;
    }
  }

  private async extractSentimentData(domainId: string): Promise<any[]> {
    const query = `
      SELECT 
        dr.response_content,
        dr.model,
        dr.prompt_type,
        dr.confidence_score,
        dr.created_at
      FROM domain_responses dr
      WHERE dr.domain_id = $1
      AND dr.created_at > NOW() - INTERVAL '${this.SENTIMENT_WINDOW_DAYS} days'
      ORDER BY dr.created_at DESC
    `;

    const result = await this.pool.query(query, [domainId]);
    return result.rows;
  }

  private async calculateSentimentDistribution(sentimentData: any[]): Promise<{
    positive: number;
    negative: number;
    neutral: number;
    mixed: number;
  }> {
    if (sentimentData.length === 0) {
      return { positive: 0, negative: 0, neutral: 1, mixed: 0 };
    }

    const sentiments = {
      positive: 0,
      negative: 0,
      neutral: 0,
      mixed: 0
    };

    // Analyze each response for sentiment indicators
    for (const data of sentimentData) {
      const content = data.response_content.toLowerCase();
      const sentimentScores = this.analyzeSentiment(content);
      
      // Weight by confidence
      const weight = data.confidence_score || 0.5;
      
      sentiments.positive += sentimentScores.positive * weight;
      sentiments.negative += sentimentScores.negative * weight;
      sentiments.neutral += sentimentScores.neutral * weight;
      sentiments.mixed += sentimentScores.mixed * weight;
    }

    // Normalize
    const total = Object.values(sentiments).reduce((a, b) => a + b, 0);
    if (total > 0) {
      for (const key in sentiments) {
        (sentiments as any)[key] /= total;
      }
    }

    return sentiments;
  }

  private analyzeSentiment(content: string): {
    positive: number;
    negative: number;
    neutral: number;
    mixed: number;
  } {
    // Sentiment indicators (simplified - in production would use NLP)
    const positiveIndicators = [
      'growth', 'success', 'innovative', 'leading', 'strong',
      'opportunity', 'advantage', 'positive', 'excellent', 'superior'
    ];
    
    const negativeIndicators = [
      'risk', 'threat', 'weakness', 'concern', 'challenge',
      'decline', 'loss', 'negative', 'poor', 'inferior'
    ];

    let positiveCount = 0;
    let negativeCount = 0;

    for (const indicator of positiveIndicators) {
      if (content.includes(indicator)) positiveCount++;
    }

    for (const indicator of negativeIndicators) {
      if (content.includes(indicator)) negativeCount++;
    }

    const total = positiveCount + negativeCount;
    
    if (total === 0) {
      return { positive: 0, negative: 0, neutral: 1, mixed: 0 };
    }

    const positiveRatio = positiveCount / total;
    const negativeRatio = negativeCount / total;

    // Determine sentiment distribution
    if (positiveRatio > 0.7) {
      return { positive: 0.8, negative: 0.1, neutral: 0.1, mixed: 0 };
    } else if (negativeRatio > 0.7) {
      return { positive: 0.1, negative: 0.8, neutral: 0.1, mixed: 0 };
    } else if (Math.abs(positiveRatio - negativeRatio) < 0.2) {
      return { positive: 0.2, negative: 0.2, neutral: 0.1, mixed: 0.5 };
    } else {
      return { positive: positiveRatio * 0.6, negative: negativeRatio * 0.6, neutral: 0.3, mixed: 0.1 };
    }
  }

  private async calculateEmotionalProfile(domainId: string, sentimentData: any[]): Promise<{
    confidence: number;
    excitement: number;
    concern: number;
    urgency: number;
    opportunity: number;
  }> {
    // Analyze competitive memories for emotional indicators
    const query = `
      SELECT 
        memory_type,
        confidence,
        alert_priority,
        content
      FROM competitive_memories
      WHERE domain_id = $1
      ORDER BY created_at DESC
      LIMIT 50
    `;

    const result = await this.pool.query(query, [domainId]);
    const memories = result.rows;

    const profile = {
      confidence: 0,
      excitement: 0,
      concern: 0,
      urgency: 0,
      opportunity: 0
    };

    // Calculate based on memory characteristics
    for (const memory of memories) {
      profile.confidence += memory.confidence * 0.02;
      
      if (memory.alert_priority === 'critical') {
        profile.urgency += 0.03;
        profile.concern += 0.02;
      } else if (memory.alert_priority === 'high') {
        profile.urgency += 0.02;
      }

      // Analyze content for emotional indicators
      const content = memory.content.toLowerCase();
      if (content.includes('opportunity') || content.includes('potential')) {
        profile.opportunity += 0.02;
        profile.excitement += 0.01;
      }
      if (content.includes('threat') || content.includes('risk')) {
        profile.concern += 0.02;
      }
      if (content.includes('breakthrough') || content.includes('innovative')) {
        profile.excitement += 0.02;
      }
    }

    // Normalize to 0-1 range
    for (const key in profile) {
      (profile as any)[key] = Math.min(1, (profile as any)[key]);
    }

    // Add baseline from sentiment data
    if (sentimentData.length > 0) {
      const avgConfidence = sentimentData.reduce((sum, d) => sum + (d.confidence_score || 0), 0) / sentimentData.length;
      profile.confidence = profile.confidence * 0.7 + avgConfidence * 0.3;
    }

    return profile;
  }

  private async generateSentimentVector(
    domainId: string,
    distribution: any,
    emotions: any
  ): Promise<number[]> {
    // Fetch response embeddings
    const query = `
      SELECT response_embedding
      FROM domain_responses
      WHERE domain_id = $1
      AND response_embedding IS NOT NULL
      ORDER BY created_at DESC
      LIMIT 20
    `;

    const result = await this.pool.query(query, [domainId]);
    
    if (result.rows.length === 0) {
      return new Array(this.VECTOR_DIMENSIONS).fill(0);
    }

    // Create sentiment-weighted vector
    const vector = new Array(this.VECTOR_DIMENSIONS).fill(0);
    
    // Apply sentiment and emotion weights to embeddings
    for (const row of result.rows) {
      const embedding = row.response_embedding;
      
      // Weight by sentiment distribution
      const sentimentWeight = 
        distribution.positive * 1.2 +
        distribution.negative * 0.8 +
        distribution.neutral * 1.0 +
        distribution.mixed * 0.9;

      // Weight by emotional profile
      const emotionWeight = 
        emotions.confidence * 0.3 +
        emotions.excitement * 0.2 +
        emotions.concern * 0.15 +
        emotions.urgency * 0.2 +
        emotions.opportunity * 0.15;

      const totalWeight = sentimentWeight * emotionWeight;

      for (let i = 0; i < this.VECTOR_DIMENSIONS; i++) {
        vector[i] += embedding[i] * totalWeight;
      }
    }

    // Normalize
    const magnitude = Math.sqrt(vector.reduce((sum, v) => sum + v * v, 0));
    if (magnitude > 0) {
      return vector.map(v => v / magnitude);
    }

    return vector;
  }

  private determineMarketSentiment(distribution: any, emotions: any): 'bullish' | 'bearish' | 'neutral' | 'volatile' {
    const posNegRatio = distribution.positive / (distribution.negative + 0.001);
    const volatility = distribution.mixed + emotions.urgency * 0.5;

    if (volatility > 0.6) return 'volatile';
    if (posNegRatio > 2) return 'bullish';
    if (posNegRatio < 0.5) return 'bearish';
    return 'neutral';
  }

  private calculateCompositeSentiment(distribution: any, emotions: any): number {
    // Weighted sentiment calculation
    const sentimentBase = 
      distribution.positive * 1.0 +
      distribution.negative * -1.0 +
      distribution.neutral * 0.0 +
      distribution.mixed * -0.2;

    // Emotion modifiers
    const emotionModifier = 
      emotions.confidence * 0.2 +
      emotions.excitement * 0.15 +
      emotions.concern * -0.1 +
      emotions.urgency * -0.05 +
      emotions.opportunity * 0.1;

    // Combine and normalize to 0-1 range
    const rawScore = (sentimentBase + 1) / 2 + emotionModifier;
    return Math.max(0, Math.min(1, rawScore));
  }

  private async storeSentimentTensor(domainId: string, tensor: any): Promise<void> {
    const query = `
      INSERT INTO sentiment_tensors (
        domain_id, vector, positive_score, negative_score, neutral_score, mixed_score,
        confidence_emotion, excitement_emotion, concern_emotion, urgency_emotion, opportunity_emotion,
        composite_sentiment, market_sentiment, volatility_index
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
      ON CONFLICT (domain_id) WHERE tensor_type = 'sentiment'
      DO UPDATE SET
        vector = EXCLUDED.vector,
        positive_score = EXCLUDED.positive_score,
        negative_score = EXCLUDED.negative_score,
        neutral_score = EXCLUDED.neutral_score,
        mixed_score = EXCLUDED.mixed_score,
        confidence_emotion = EXCLUDED.confidence_emotion,
        excitement_emotion = EXCLUDED.excitement_emotion,
        concern_emotion = EXCLUDED.concern_emotion,
        urgency_emotion = EXCLUDED.urgency_emotion,
        opportunity_emotion = EXCLUDED.opportunity_emotion,
        composite_sentiment = EXCLUDED.composite_sentiment,
        market_sentiment = EXCLUDED.market_sentiment,
        volatility_index = EXCLUDED.volatility_index,
        updated_at = CURRENT_TIMESTAMP
    `;

    const volatilityIndex = tensor.distribution.mixed + Math.abs(tensor.distribution.positive - tensor.distribution.negative);

    await this.pool.query(query, [
      domainId,
      tensor.vector,
      tensor.distribution.positive,
      tensor.distribution.negative,
      tensor.distribution.neutral,
      tensor.distribution.mixed,
      tensor.emotions.confidence,
      tensor.emotions.excitement,
      tensor.emotions.concern,
      tensor.emotions.urgency,
      tensor.emotions.opportunity,
      tensor.compositeSentiment,
      tensor.marketSentiment,
      volatilityIndex
    ]);
  }

  private async recordSentimentTimeSeries(domainId: string, sentimentValue: number): Promise<void> {
    const query = `
      INSERT INTO sentiment_time_series (domain_id, sentiment_value, sentiment_type, confidence)
      VALUES ($1, $2, 'composite', $3)
    `;

    await this.pool.query(query, [domainId, sentimentValue, 0.9]);
  }

  private async detectSentimentAnomalies(domainId: string, currentSentiment: number, distribution: any): Promise<void> {
    // Get historical sentiment
    const query = `
      SELECT AVG(sentiment_value) as avg_sentiment, STDDEV(sentiment_value) as stddev_sentiment
      FROM sentiment_time_series
      WHERE domain_id = $1
      AND recorded_at > NOW() - INTERVAL '30 days'
    `;

    const result = await this.pool.query(query, [domainId]);
    const stats = result.rows[0];

    if (!stats.avg_sentiment || !stats.stddev_sentiment) return;

    // Check for anomalies
    const zScore = Math.abs((currentSentiment - stats.avg_sentiment) / stats.stddev_sentiment);
    
    if (zScore > 2.5) {
      const anomalyType = currentSentiment > stats.avg_sentiment ? 'positive_spike' : 'negative_spike';
      const severity = Math.min(1, zScore / 4);

      await this.recordAnomaly(domainId, anomalyType, severity, 
        `Sentiment ${anomalyType} detected: z-score ${zScore.toFixed(2)}`);
    }

    // Check for high volatility
    if (distribution.mixed > 0.6) {
      await this.recordAnomaly(domainId, 'high_volatility', distribution.mixed,
        `High sentiment volatility detected: ${(distribution.mixed * 100).toFixed(1)}%`);
    }
  }

  private async recordAnomaly(domainId: string, anomalyType: string, severity: number, description: string): Promise<void> {
    const query = `
      INSERT INTO sentiment_anomalies (domain_id, anomaly_type, severity, description)
      VALUES ($1, $2, $3, $4)
    `;

    await this.pool.query(query, [domainId, anomalyType, severity, description]);
    this.logger.warn(`⚠️ Sentiment anomaly detected for ${domainId}: ${description}`);
  }

  async getSentimentTrends(domainId: string, days: number = 30): Promise<any> {
    const query = `
      SELECT 
        DATE_TRUNC('day', recorded_at) as date,
        AVG(sentiment_value) as avg_sentiment,
        MIN(sentiment_value) as min_sentiment,
        MAX(sentiment_value) as max_sentiment,
        COUNT(*) as data_points
      FROM sentiment_time_series
      WHERE domain_id = $1
      AND recorded_at > NOW() - INTERVAL '${days} days'
      GROUP BY DATE_TRUNC('day', recorded_at)
      ORDER BY date DESC
    `;

    const result = await this.pool.query(query, [domainId]);
    return result.rows;
  }

  async getMarketSentimentDistribution(): Promise<any> {
    const query = `
      SELECT 
        market_sentiment,
        COUNT(*) as count,
        AVG(composite_sentiment) as avg_sentiment
      FROM sentiment_tensors
      WHERE updated_at > NOW() - INTERVAL '7 days'
      GROUP BY market_sentiment
    `;

    const result = await this.pool.query(query);
    return result.rows;
  }

  async findSentimentCorrelations(domainId: string, minCorrelation: number = 0.7): Promise<any[]> {
    const query = `
      WITH target_sentiment AS (
        SELECT vector FROM sentiment_tensors WHERE domain_id = $1
      )
      SELECT 
        st.domain_id,
        d.domain,
        st.market_sentiment,
        st.composite_sentiment,
        1 - (st.vector <=> t.vector) as correlation
      FROM sentiment_tensors st, target_sentiment t
      JOIN domains d ON d.id = st.domain_id
      WHERE st.domain_id != $1
      AND 1 - (st.vector <=> t.vector) > $2
      ORDER BY correlation DESC
      LIMIT 10
    `;

    const result = await this.pool.query(query, [domainId, minCorrelation]);
    return result.rows;
  }
}