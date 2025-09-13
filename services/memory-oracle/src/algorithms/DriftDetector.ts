import { Pool } from 'pg';
import winston from 'winston';

export interface DriftMetrics {
  domainId: string;
  driftScore: number;
  driftType: 'gradual' | 'sudden' | 'seasonal' | 'none';
  driftDirection: 'positive' | 'negative' | 'neutral';
  components: {
    conceptDrift: number;
    dataDrift: number;
    modelDrift: number;
    temporalDrift: number;
  };
  detectedAt: Date;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

export interface DriftAlert {
  id: string;
  domainId: string;
  alertType: 'drift_detected' | 'drift_accelerating' | 'drift_stabilizing';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  metrics: DriftMetrics;
  recommendations: string[];
  createdAt: Date;
}

export class DriftDetector {
  private pool: Pool;
  private logger: winston.Logger;
  private readonly DRIFT_WINDOW_DAYS = 30;
  private readonly DRIFT_THRESHOLD = 0.3;
  private readonly CRITICAL_DRIFT_THRESHOLD = 0.7;

  constructor(pool: Pool, logger: winston.Logger) {
    this.pool = pool;
    this.logger = logger;
    this.initializeDriftTables();
  }

  private async initializeDriftTables(): Promise<void> {
    const schema = `
      -- Drift Detection Storage
      CREATE TABLE IF NOT EXISTS drift_detection_results (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        domain_id UUID REFERENCES domains(id),
        drift_score FLOAT NOT NULL,
        drift_type TEXT NOT NULL,
        drift_direction TEXT NOT NULL,
        concept_drift FLOAT NOT NULL,
        data_drift FLOAT NOT NULL,
        model_drift FLOAT NOT NULL,
        temporal_drift FLOAT NOT NULL,
        severity TEXT NOT NULL,
        detected_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        baseline_snapshot JSONB,
        current_snapshot JSONB
      );

      -- Drift Time Series
      CREATE TABLE IF NOT EXISTS drift_time_series (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        domain_id UUID REFERENCES domains(id),
        metric_type TEXT NOT NULL,
        metric_value FLOAT NOT NULL,
        recorded_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      -- Drift Alerts
      CREATE TABLE IF NOT EXISTS drift_alerts (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        domain_id UUID REFERENCES domains(id),
        alert_type TEXT NOT NULL,
        severity TEXT NOT NULL,
        description TEXT,
        metrics JSONB,
        recommendations TEXT[],
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        acknowledged_at TIMESTAMP WITH TIME ZONE,
        resolved_at TIMESTAMP WITH TIME ZONE
      );

      -- Model Performance Tracking
      CREATE TABLE IF NOT EXISTS model_performance_tracking (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        domain_id UUID REFERENCES domains(id),
        model TEXT NOT NULL,
        performance_metric FLOAT NOT NULL,
        baseline_metric FLOAT,
        deviation FLOAT,
        tracked_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      -- Indexes
      CREATE INDEX IF NOT EXISTS idx_drift_detection_domain ON drift_detection_results(domain_id, detected_at DESC);
      CREATE INDEX IF NOT EXISTS idx_drift_detection_severity ON drift_detection_results(severity, detected_at DESC);
      CREATE INDEX IF NOT EXISTS idx_drift_time_series_domain ON drift_time_series(domain_id, recorded_at DESC);
      CREATE INDEX IF NOT EXISTS idx_drift_alerts_domain ON drift_alerts(domain_id, created_at DESC);
      CREATE INDEX IF NOT EXISTS idx_model_performance_domain ON model_performance_tracking(domain_id, model);
    `;

    try {
      await this.pool.query(schema);
      this.logger.info('🌊 Drift Detection tables initialized');
    } catch (error) {
      this.logger.error('Failed to initialize drift detection tables:', error);
      throw error;
    }
  }

  async detectDrift(domainId: string): Promise<DriftMetrics> {
    try {
      // Calculate drift components
      const conceptDrift = await this.detectConceptDrift(domainId);
      const dataDrift = await this.detectDataDrift(domainId);
      const modelDrift = await this.detectModelDrift(domainId);
      const temporalDrift = await this.detectTemporalDrift(domainId);

      // Calculate composite drift score
      const driftScore = this.calculateCompositeDrift({
        conceptDrift,
        dataDrift,
        modelDrift,
        temporalDrift
      });

      // Determine drift characteristics
      const driftType = await this.determineDriftType(domainId, {
        conceptDrift,
        dataDrift,
        modelDrift,
        temporalDrift
      });

      const driftDirection = await this.determineDriftDirection(domainId, driftScore);
      const severity = this.determineSeverity(driftScore);

      // Store drift detection results
      await this.storeDriftResults(domainId, {
        driftScore,
        driftType,
        driftDirection,
        components: {
          conceptDrift,
          dataDrift,
          modelDrift,
          temporalDrift
        },
        severity
      });

      // Record time series
      await this.recordDriftTimeSeries(domainId, 'composite', driftScore);

      // Generate alerts if necessary
      if (driftScore > this.DRIFT_THRESHOLD) {
        await this.generateDriftAlert(domainId, {
          domainId,
          driftScore,
          driftType,
          driftDirection,
          components: {
            conceptDrift,
            dataDrift,
            modelDrift,
            temporalDrift
          },
          severity,
          detectedAt: new Date()
        });
      }

      const metrics: DriftMetrics = {
        domainId,
        driftScore,
        driftType,
        driftDirection,
        components: {
          conceptDrift,
          dataDrift,
          modelDrift,
          temporalDrift
        },
        detectedAt: new Date(),
        severity
      };

      this.logger.info(`🌊 Drift detected for domain ${domainId}: ${driftType} drift, severity: ${severity} (${driftScore.toFixed(3)})`);
      return metrics;

    } catch (error) {
      this.logger.error(`Failed to detect drift for ${domainId}:`, error);
      throw error;
    }
  }

  private async detectConceptDrift(domainId: string): Promise<number> {
    // Detect changes in semantic patterns and concept relationships
    const query = `
      WITH concept_windows AS (
        SELECT 
          DATE_TRUNC('week', cm.created_at) as week,
          cm.patterns,
          cm.relationships,
          cm.content,
          cm.confidence
        FROM competitive_memories cm
        WHERE cm.domain_id = $1
        AND cm.created_at > NOW() - INTERVAL '${this.DRIFT_WINDOW_DAYS * 2} days'
      ),
      recent_concepts AS (
        SELECT 
          UNNEST(patterns) as pattern,
          AVG(confidence) as avg_confidence
        FROM concept_windows
        WHERE week > NOW() - INTERVAL '${this.DRIFT_WINDOW_DAYS} days'
        GROUP BY pattern
      ),
      baseline_concepts AS (
        SELECT 
          UNNEST(patterns) as pattern,
          AVG(confidence) as avg_confidence
        FROM concept_windows
        WHERE week <= NOW() - INTERVAL '${this.DRIFT_WINDOW_DAYS} days'
        AND week > NOW() - INTERVAL '${this.DRIFT_WINDOW_DAYS * 2} days'
        GROUP BY pattern
      ),
      concept_comparison AS (
        SELECT 
          COALESCE(r.pattern, b.pattern) as pattern,
          COALESCE(r.avg_confidence, 0) as recent_confidence,
          COALESCE(b.avg_confidence, 0) as baseline_confidence,
          ABS(COALESCE(r.avg_confidence, 0) - COALESCE(b.avg_confidence, 0)) as confidence_drift
        FROM recent_concepts r
        FULL OUTER JOIN baseline_concepts b ON r.pattern = b.pattern
      )
      SELECT 
        AVG(confidence_drift) as avg_drift,
        MAX(confidence_drift) as max_drift,
        COUNT(*) FILTER (WHERE recent_confidence = 0 AND baseline_confidence > 0) as disappeared_concepts,
        COUNT(*) FILTER (WHERE recent_confidence > 0 AND baseline_confidence = 0) as new_concepts,
        COUNT(*) as total_concepts
      FROM concept_comparison
    `;

    const result = await this.pool.query(query, [domainId]);
    const stats = result.rows[0];

    if (!stats || !stats.total_concepts) return 0;

    // Calculate concept drift score
    const avgDrift = stats.avg_drift || 0;
    const maxDrift = stats.max_drift || 0;
    const disappearanceRate = stats.disappeared_concepts / stats.total_concepts;
    const emergenceRate = stats.new_concepts / stats.total_concepts;

    const conceptDrift = avgDrift * 0.3 +
                        maxDrift * 0.2 +
                        disappearanceRate * 0.25 +
                        emergenceRate * 0.25;

    return Math.max(0, Math.min(1, conceptDrift));
  }

  private async detectDataDrift(domainId: string): Promise<number> {
    // Detect changes in data distribution and characteristics
    const query = `
      WITH data_windows AS (
        SELECT 
          DATE_TRUNC('week', dr.created_at) as week,
          dr.confidence_score,
          LENGTH(dr.response_content) as response_length,
          dr.model,
          dr.prompt_type
        FROM domain_responses dr
        WHERE dr.domain_id = $1
        AND dr.created_at > NOW() - INTERVAL '${this.DRIFT_WINDOW_DAYS * 2} days'
      ),
      recent_stats AS (
        SELECT 
          AVG(confidence_score) as avg_confidence,
          STDDEV(confidence_score) as std_confidence,
          AVG(response_length) as avg_length,
          COUNT(DISTINCT model) as model_diversity,
          COUNT(DISTINCT prompt_type) as prompt_diversity
        FROM data_windows
        WHERE week > NOW() - INTERVAL '${this.DRIFT_WINDOW_DAYS} days'
      ),
      baseline_stats AS (
        SELECT 
          AVG(confidence_score) as avg_confidence,
          STDDEV(confidence_score) as std_confidence,
          AVG(response_length) as avg_length,
          COUNT(DISTINCT model) as model_diversity,
          COUNT(DISTINCT prompt_type) as prompt_diversity
        FROM data_windows
        WHERE week <= NOW() - INTERVAL '${this.DRIFT_WINDOW_DAYS} days'
        AND week > NOW() - INTERVAL '${this.DRIFT_WINDOW_DAYS * 2} days'
      )
      SELECT 
        r.*,
        b.avg_confidence as baseline_confidence,
        b.std_confidence as baseline_std,
        b.avg_length as baseline_length,
        b.model_diversity as baseline_models,
        b.prompt_diversity as baseline_prompts
      FROM recent_stats r, baseline_stats b
    `;

    const result = await this.pool.query(query, [domainId]);
    const stats = result.rows[0];

    if (!stats) return 0;

    // Calculate drift components
    const confidenceDrift = Math.abs((stats.avg_confidence || 0) - (stats.baseline_confidence || 0));
    const varianceDrift = Math.abs((stats.std_confidence || 0) - (stats.baseline_std || 0));
    const lengthDrift = Math.abs((stats.avg_length || 0) - (stats.baseline_length || 0)) / (stats.baseline_length || 1);
    const modelDiversityDrift = Math.abs((stats.model_diversity || 0) - (stats.baseline_models || 0)) / (stats.baseline_models || 1);

    const dataDrift = confidenceDrift * 0.4 +
                     varianceDrift * 0.3 +
                     lengthDrift * 0.2 +
                     modelDiversityDrift * 0.1;

    return Math.max(0, Math.min(1, dataDrift));
  }

  private async detectModelDrift(domainId: string): Promise<number> {
    // Detect changes in model performance and behavior
    const query = `
      WITH model_performance AS (
        SELECT 
          dr.model,
          DATE_TRUNC('week', dr.created_at) as week,
          AVG(dr.confidence_score) as avg_confidence,
          COUNT(*) as response_count
        FROM domain_responses dr
        WHERE dr.domain_id = $1
        AND dr.created_at > NOW() - INTERVAL '${this.DRIFT_WINDOW_DAYS * 2} days'
        GROUP BY dr.model, DATE_TRUNC('week', dr.created_at)
      ),
      recent_performance AS (
        SELECT 
          model,
          AVG(avg_confidence) as recent_confidence,
          SUM(response_count) as recent_count
        FROM model_performance
        WHERE week > NOW() - INTERVAL '${this.DRIFT_WINDOW_DAYS} days'
        GROUP BY model
      ),
      baseline_performance AS (
        SELECT 
          model,
          AVG(avg_confidence) as baseline_confidence,
          SUM(response_count) as baseline_count
        FROM model_performance
        WHERE week <= NOW() - INTERVAL '${this.DRIFT_WINDOW_DAYS} days'
        AND week > NOW() - INTERVAL '${this.DRIFT_WINDOW_DAYS * 2} days'
        GROUP BY model
      ),
      performance_comparison AS (
        SELECT 
          COALESCE(r.model, b.model) as model,
          COALESCE(r.recent_confidence, 0) as recent_conf,
          COALESCE(b.baseline_confidence, 0) as baseline_conf,
          ABS(COALESCE(r.recent_confidence, 0) - COALESCE(b.baseline_confidence, 0)) as conf_drift,
          COALESCE(r.recent_count, 0) as recent_usage,
          COALESCE(b.baseline_count, 0) as baseline_usage
        FROM recent_performance r
        FULL OUTER JOIN baseline_performance b ON r.model = b.model
      )
      SELECT 
        AVG(conf_drift) as avg_confidence_drift,
        MAX(conf_drift) as max_confidence_drift,
        COUNT(*) FILTER (WHERE recent_usage = 0 AND baseline_usage > 0) as models_stopped,
        COUNT(*) FILTER (WHERE recent_usage > 0 AND baseline_usage = 0) as models_added,
        SUM(ABS(recent_usage - baseline_usage)) / NULLIF(SUM(baseline_usage), 0) as usage_drift
      FROM performance_comparison
    `;

    const result = await this.pool.query(query, [domainId]);
    const stats = result.rows[0];

    if (!stats) return 0;

    // Calculate model drift score
    const confidenceDrift = (stats.avg_confidence_drift || 0) * 0.4;
    const maxDrift = (stats.max_confidence_drift || 0) * 0.2;
    const modelChurn = ((stats.models_stopped || 0) + (stats.models_added || 0)) * 0.1;
    const usageDrift = Math.min(1, stats.usage_drift || 0) * 0.3;

    const modelDrift = confidenceDrift + maxDrift + modelChurn + usageDrift;

    return Math.max(0, Math.min(1, modelDrift));
  }

  private async detectTemporalDrift(domainId: string): Promise<number> {
    // Detect time-based patterns and seasonal changes
    const query = `
      WITH temporal_data AS (
        SELECT 
          DATE_TRUNC('day', created_at) as day,
          AVG(confidence_score) as daily_confidence,
          COUNT(*) as daily_count,
          COUNT(DISTINCT model) as daily_models
        FROM domain_responses
        WHERE domain_id = $1
        AND created_at > NOW() - INTERVAL '${this.DRIFT_WINDOW_DAYS * 3} days'
        GROUP BY DATE_TRUNC('day', created_at)
      ),
      temporal_stats AS (
        SELECT 
          EXTRACT(DOW FROM day) as day_of_week,
          AVG(daily_confidence) as avg_confidence,
          AVG(daily_count) as avg_count
        FROM temporal_data
        GROUP BY EXTRACT(DOW FROM day)
      ),
      trend_analysis AS (
        SELECT 
          regr_slope(daily_confidence, EXTRACT(EPOCH FROM day)) as confidence_trend,
          regr_slope(daily_count::float, EXTRACT(EPOCH FROM day)) as volume_trend,
          corr(daily_confidence, daily_count) as conf_volume_correlation
        FROM temporal_data
      )
      SELECT 
        ts.*,
        ta.confidence_trend,
        ta.volume_trend,
        ta.conf_volume_correlation,
        STDDEV(ts.avg_confidence) as weekly_variance
      FROM temporal_stats ts, trend_analysis ta
    `;

    const result = await this.pool.query(query, [domainId]);
    
    if (result.rows.length === 0) return 0;

    // Analyze temporal patterns
    const trendStrength = Math.abs(result.rows[0].confidence_trend || 0) * 1e6; // Scale the trend
    const volumeTrend = Math.abs(result.rows[0].volume_trend || 0) * 1e3;
    const weeklyVariance = result.rows[0].weekly_variance || 0;
    const correlation = Math.abs(result.rows[0].conf_volume_correlation || 0);

    const temporalDrift = Math.min(1, trendStrength) * 0.4 +
                         Math.min(1, volumeTrend) * 0.2 +
                         weeklyVariance * 0.2 +
                         (1 - correlation) * 0.2;

    return Math.max(0, Math.min(1, temporalDrift));
  }

  private calculateCompositeDrift(components: {
    conceptDrift: number;
    dataDrift: number;
    modelDrift: number;
    temporalDrift: number;
  }): number {
    // Weighted combination emphasizing concept and data drift
    const weightedDrift = 
      components.conceptDrift * 0.35 +
      components.dataDrift * 0.3 +
      components.modelDrift * 0.2 +
      components.temporalDrift * 0.15;

    // Apply non-linear scaling to amplify significant drift
    return Math.tanh(weightedDrift * 2) * 0.9 + weightedDrift * 0.1;
  }

  private async determineDriftType(
    domainId: string,
    components: any
  ): Promise<'gradual' | 'sudden' | 'seasonal' | 'none'> {
    // Check drift progression over time
    const query = `
      SELECT 
        drift_score,
        detected_at
      FROM drift_detection_results
      WHERE domain_id = $1
      ORDER BY detected_at DESC
      LIMIT 10
    `;

    const result = await this.pool.query(query, [domainId]);
    const history = result.rows;

    if (history.length < 3) {
      // Not enough history, determine based on components
      if (Math.max(...Object.values(components as Record<string, number>)) < this.DRIFT_THRESHOLD) {
        return 'none';
      }
      return 'sudden';
    }

    // Analyze drift progression
    const recentScores = history.slice(0, 5).map(h => h.drift_score);
    const olderScores = history.slice(5).map(h => h.drift_score);

    const recentAvg = recentScores.reduce((a, b) => a + b, 0) / recentScores.length;
    const olderAvg = olderScores.length > 0 
      ? olderScores.reduce((a, b) => a + b, 0) / olderScores.length 
      : 0;

    const driftAcceleration = recentAvg - olderAvg;

    // Check for seasonal patterns
    if (components.temporalDrift > 0.6 && components.conceptDrift < 0.3) {
      return 'seasonal';
    }

    // Check for sudden drift
    if (driftAcceleration > 0.3 || recentScores[0] > recentAvg * 1.5) {
      return 'sudden';
    }

    // Check for gradual drift
    if (recentAvg > this.DRIFT_THRESHOLD && driftAcceleration < 0.1) {
      return 'gradual';
    }

    return 'none';
  }

  private async determineDriftDirection(
    domainId: string,
    driftScore: number
  ): Promise<'positive' | 'negative' | 'neutral'> {
    // Analyze the nature of the drift
    const query = `
      WITH recent_metrics AS (
        SELECT 
          AVG(cm.confidence) as avg_confidence,
          AVG(cm.effectiveness) as avg_effectiveness,
          COUNT(*) FILTER (WHERE cm.alert_priority IN ('high', 'critical')) as high_alerts
        FROM competitive_memories cm
        WHERE cm.domain_id = $1
        AND cm.created_at > NOW() - INTERVAL '${this.DRIFT_WINDOW_DAYS} days'
      ),
      baseline_metrics AS (
        SELECT 
          AVG(cm.confidence) as avg_confidence,
          AVG(cm.effectiveness) as avg_effectiveness,
          COUNT(*) FILTER (WHERE cm.alert_priority IN ('high', 'critical')) as high_alerts
        FROM competitive_memories cm
        WHERE cm.domain_id = $1
        AND cm.created_at <= NOW() - INTERVAL '${this.DRIFT_WINDOW_DAYS} days'
        AND cm.created_at > NOW() - INTERVAL '${this.DRIFT_WINDOW_DAYS * 2} days'
      )
      SELECT 
        r.avg_confidence - b.avg_confidence as confidence_change,
        r.avg_effectiveness - b.avg_effectiveness as effectiveness_change,
        r.high_alerts - b.high_alerts as alert_change
      FROM recent_metrics r, baseline_metrics b
    `;

    const result = await this.pool.query(query, [domainId]);
    const changes = result.rows[0];

    if (!changes) return 'neutral';

    const confidenceChange = changes.confidence_change || 0;
    const effectivenessChange = changes.effectiveness_change || 0;
    const alertChange = changes.alert_change || 0;

    // Determine direction based on metric changes
    const positiveIndicators = 
      (confidenceChange > 0 ? 1 : 0) +
      (effectivenessChange > 0 ? 1 : 0) +
      (alertChange < 0 ? 1 : 0); // Fewer high alerts is positive

    if (positiveIndicators >= 2) return 'positive';
    if (positiveIndicators <= 1 && driftScore > 0.5) return 'negative';
    
    return 'neutral';
  }

  private determineSeverity(driftScore: number): 'low' | 'medium' | 'high' | 'critical' {
    if (driftScore >= this.CRITICAL_DRIFT_THRESHOLD) return 'critical';
    if (driftScore >= 0.5) return 'high';
    if (driftScore >= this.DRIFT_THRESHOLD) return 'medium';
    return 'low';
  }

  private async storeDriftResults(domainId: string, results: any): Promise<void> {
    const query = `
      INSERT INTO drift_detection_results (
        domain_id, drift_score, drift_type, drift_direction,
        concept_drift, data_drift, model_drift, temporal_drift, severity
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    `;

    await this.pool.query(query, [
      domainId,
      results.driftScore,
      results.driftType,
      results.driftDirection,
      results.components.conceptDrift,
      results.components.dataDrift,
      results.components.modelDrift,
      results.components.temporalDrift,
      results.severity
    ]);
  }

  private async recordDriftTimeSeries(domainId: string, metricType: string, value: number): Promise<void> {
    const query = `
      INSERT INTO drift_time_series (domain_id, metric_type, metric_value)
      VALUES ($1, $2, $3)
    `;

    await this.pool.query(query, [domainId, metricType, value]);
  }

  private async generateDriftAlert(domainId: string, metrics: DriftMetrics): Promise<void> {
    const alertType = metrics.driftScore > this.CRITICAL_DRIFT_THRESHOLD 
      ? 'drift_detected' 
      : 'drift_accelerating';

    const recommendations = this.generateRecommendations(metrics);

    const query = `
      INSERT INTO drift_alerts (
        domain_id, alert_type, severity, description, metrics, recommendations
      ) VALUES ($1, $2, $3, $4, $5, $6)
    `;

    const description = `${metrics.driftType} drift detected with ${metrics.severity} severity. ` +
                       `Direction: ${metrics.driftDirection}. Score: ${metrics.driftScore.toFixed(3)}`;

    await this.pool.query(query, [
      domainId,
      alertType,
      metrics.severity,
      description,
      JSON.stringify(metrics),
      recommendations
    ]);

    this.logger.warn(`🚨 Drift alert generated for domain ${domainId}: ${description}`);
  }

  private generateRecommendations(metrics: DriftMetrics): string[] {
    const recommendations: string[] = [];

    if (metrics.components.conceptDrift > 0.5) {
      recommendations.push('Review and update domain analysis prompts to capture emerging concepts');
      recommendations.push('Increase monitoring frequency for concept evolution');
    }

    if (metrics.components.dataDrift > 0.5) {
      recommendations.push('Verify data sources and collection methods for consistency');
      recommendations.push('Consider expanding model diversity to improve data coverage');
    }

    if (metrics.components.modelDrift > 0.5) {
      recommendations.push('Evaluate model performance and consider retraining or replacement');
      recommendations.push('Review model confidence thresholds and adjustment strategies');
    }

    if (metrics.components.temporalDrift > 0.5) {
      recommendations.push('Analyze temporal patterns for seasonal or cyclical effects');
      recommendations.push('Adjust analysis windows to account for time-based variations');
    }

    if (metrics.severity === 'critical') {
      recommendations.unshift('URGENT: Manual review required for significant drift detected');
    }

    return recommendations;
  }

  async getDriftHistory(domainId: string, days: number = 30): Promise<any[]> {
    const query = `
      SELECT 
        drift_score,
        drift_type,
        drift_direction,
        severity,
        detected_at
      FROM drift_detection_results
      WHERE domain_id = $1
      AND detected_at > NOW() - INTERVAL '${days} days'
      ORDER BY detected_at DESC
    `;

    const result = await this.pool.query(query, [domainId]);
    return result.rows;
  }

  async getActiveDriftAlerts(): Promise<DriftAlert[]> {
    const query = `
      SELECT 
        da.*,
        d.domain
      FROM drift_alerts da
      JOIN domains d ON d.id = da.domain_id
      WHERE da.resolved_at IS NULL
      AND da.created_at > NOW() - INTERVAL '7 days'
      ORDER BY 
        CASE severity
          WHEN 'critical' THEN 1
          WHEN 'high' THEN 2
          WHEN 'medium' THEN 3
          WHEN 'low' THEN 4
        END,
        da.created_at DESC
    `;

    const result = await this.pool.query(query);
    return result.rows.map(row => ({
      id: row.id,
      domainId: row.domain_id,
      alertType: row.alert_type,
      severity: row.severity,
      description: row.description,
      metrics: row.metrics,
      recommendations: row.recommendations,
      createdAt: row.created_at
    }));
  }

  async acknowledgeAlert(alertId: string): Promise<void> {
    const query = `
      UPDATE drift_alerts 
      SET acknowledged_at = CURRENT_TIMESTAMP
      WHERE id = $1
    `;

    await this.pool.query(query, [alertId]);
  }

  async resolveAlert(alertId: string): Promise<void> {
    const query = `
      UPDATE drift_alerts 
      SET resolved_at = CURRENT_TIMESTAMP
      WHERE id = $1
    `;

    await this.pool.query(query, [alertId]);
  }

  async getDriftingSectors(threshold: number = 0.5): Promise<any[]> {
    const query = `
      WITH sector_drift AS (
        SELECT 
          d.industry_category as sector,
          AVG(ddr.drift_score) as avg_drift,
          MAX(ddr.drift_score) as max_drift,
          COUNT(DISTINCT d.id) as domain_count,
          COUNT(*) FILTER (WHERE ddr.severity IN ('high', 'critical')) as high_severity_count
        FROM drift_detection_results ddr
        JOIN domains d ON d.id = ddr.domain_id
        WHERE ddr.detected_at > NOW() - INTERVAL '7 days'
        GROUP BY d.industry_category
      )
      SELECT * FROM sector_drift
      WHERE avg_drift > $1
      ORDER BY avg_drift DESC
    `;

    const result = await this.pool.query(query, [threshold]);
    return result.rows;
  }
}