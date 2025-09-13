import { Pool } from 'pg';
import winston from 'winston';
import { QuantumAnomaly } from './QuantumBrandAnalyzer';

export interface CascadePrediction {
  domainId: string;
  triggerType: string;
  probability: number;
  predictedReach: number;
  timeToEventHours: number;
  windowEnd: Date;
  confidence: number;
  riskFactors: string[];
}

export class CascadePredictor {
  private pool: Pool;
  private logger: winston.Logger;
  
  // Cascade prediction thresholds
  private readonly CRITICAL_THRESHOLD = 0.85;
  private readonly HIGH_THRESHOLD = 0.70;
  private readonly MODERATE_THRESHOLD = 0.50;

  constructor(pool: Pool, logger: winston.Logger) {
    this.pool = pool;
    this.logger = logger;
  }

  async predict(domainId: string, anomalies: QuantumAnomaly[]): Promise<CascadePrediction | null> {
    try {
      // Check if we have significant anomalies
      const strongestAnomaly = this.findStrongestAnomaly(anomalies);
      if (!strongestAnomaly || strongestAnomaly.strength < this.MODERATE_THRESHOLD) {
        return null;
      }

      // Get historical cascade data for calibration
      const historicalCascades = await this.getHistoricalCascades(domainId);
      
      // Calculate cascade probability using quantum indicators
      const cascadeProbability = this.calculateCascadeProbability(
        anomalies,
        historicalCascades
      );

      // Estimate reach and timing
      const reachEstimate = this.estimateViralReach(cascadeProbability, anomalies);
      const timingEstimate = this.estimateTimeToEvent(strongestAnomaly);

      // Identify risk factors
      const riskFactors = this.identifyRiskFactors(anomalies, historicalCascades);

      // Calculate prediction window
      const windowEnd = new Date();
      windowEnd.setHours(windowEnd.getHours() + timingEstimate + 24); // Add buffer

      const prediction: CascadePrediction = {
        domainId,
        triggerType: strongestAnomaly.type,
        probability: cascadeProbability,
        predictedReach: reachEstimate,
        timeToEventHours: timingEstimate,
        windowEnd,
        confidence: this.calculateConfidence(anomalies, historicalCascades),
        riskFactors
      };

      // Store prediction for later validation
      await this.storePrediction(prediction, anomalies);

      return prediction;

    } catch (error) {
      this.logger.error(`Failed to predict cascade for ${domainId}:`, error);
      return null;
    }
  }

  private findStrongestAnomaly(anomalies: QuantumAnomaly[]): QuantumAnomaly | null {
    if (anomalies.length === 0) return null;
    
    return anomalies.reduce((strongest, current) => 
      current.strength > strongest.strength ? current : strongest
    );
  }

  private calculateCascadeProbability(
    anomalies: QuantumAnomaly[],
    historicalCascades: any[]
  ): number {
    // Base probability from quantum anomalies
    const maxAnomalyStrength = Math.max(...anomalies.map(a => a.strength));
    let probability = maxAnomalyStrength;

    // Adjust based on anomaly types
    const hasStrongCollapse = anomalies.some(a => a.type === 'strong_collapse' && a.strength > 0.8);
    const hasPhaseAlignment = anomalies.some(a => a.type === 'phase_alignment' && a.strength > 0.7);

    if (hasStrongCollapse && hasPhaseAlignment) {
      probability *= 1.3; // Boost for multiple strong indicators
    }

    // Calibrate with historical data
    if (historicalCascades.length > 0) {
      const historicalRate = historicalCascades.filter(h => h.actual_occurred).length / historicalCascades.length;
      probability = probability * 0.7 + historicalRate * 0.3; // Blend with history
    }

    return Math.max(0, Math.min(1, probability));
  }

  private estimateViralReach(probability: number, anomalies: QuantumAnomaly[]): number {
    // Base reach estimation
    let baseReach = Math.floor(Math.exp(probability * 10)); // Exponential growth model

    // Adjust based on anomaly characteristics
    const affectedModelsCount = new Set(
      anomalies.flatMap(a => a.affectedModels)
    ).size;

    if (affectedModelsCount > 5) {
      baseReach *= 2; // Double reach for broad model agreement
    }

    // Apply realistic bounds
    return Math.max(1000, Math.min(1000000, baseReach));
  }

  private estimateTimeToEvent(strongestAnomaly: QuantumAnomaly): number {
    // Time estimation based on anomaly type and strength
    const baseTime = {
      'strong_collapse': 24,
      'phase_alignment': 36,
      'entanglement_spike': 48,
      'decoherence_event': 12
    };

    let hours = baseTime[strongestAnomaly.type] || 24;

    // Adjust based on strength (stronger = sooner)
    hours = hours * (2 - strongestAnomaly.strength);

    return Math.max(6, Math.min(72, Math.round(hours)));
  }

  private identifyRiskFactors(anomalies: QuantumAnomaly[], historicalCascades: any[]): string[] {
    const factors: string[] = [];

    // Check anomaly patterns
    if (anomalies.filter(a => a.strength > 0.8).length > 1) {
      factors.push('Multiple strong quantum anomalies detected');
    }

    if (anomalies.some(a => a.type === 'strong_collapse' && a.confidence > 0.9)) {
      factors.push('High-confidence consensus collapse');
    }

    if (anomalies.some(a => a.affectedModels.includes('all'))) {
      factors.push('Universal model agreement');
    }

    // Historical patterns
    if (historicalCascades.length > 2) {
      factors.push('History of viral events');
    }

    // Time-based factors
    const now = new Date();
    const dayOfWeek = now.getDay();
    if (dayOfWeek === 1 || dayOfWeek === 2) { // Monday or Tuesday
      factors.push('Early week timing (higher engagement)');
    }

    return factors;
  }

  private calculateConfidence(anomalies: QuantumAnomaly[], historicalCascades: any[]): number {
    // Base confidence from anomaly confidence scores
    const avgAnomalyConfidence = anomalies.reduce((sum, a) => sum + a.confidence, 0) / anomalies.length;
    
    // Adjust based on historical accuracy
    let confidence = avgAnomalyConfidence;
    
    if (historicalCascades.length >= 5) {
      const accurate = historicalCascades.filter(h => h.accuracy_score > 0.7).length;
      const historicalAccuracy = accurate / historicalCascades.length;
      confidence = confidence * 0.6 + historicalAccuracy * 0.4;
    }

    return Math.max(0, Math.min(1, confidence));
  }

  private async getHistoricalCascades(domainId: string): Promise<any[]> {
    const query = `
      SELECT 
        cascade_probability,
        actual_occurred,
        actual_reach,
        predicted_reach,
        CASE 
          WHEN actual_occurred IS NOT NULL THEN
            1 - ABS(predicted_reach - COALESCE(actual_reach, 0))::FLOAT / GREATEST(predicted_reach, 1)
          ELSE NULL
        END as accuracy_score
      FROM cascade_predictions
      WHERE domain_id = $1
      AND validated_at IS NOT NULL
      ORDER BY predicted_at DESC
      LIMIT 10
    `;

    const result = await this.pool.query(query, [domainId]);
    return result.rows;
  }

  private async storePrediction(prediction: CascadePrediction, anomalies: QuantumAnomaly[]): Promise<void> {
    const query = `
      INSERT INTO cascade_predictions (
        domain_id, trigger_type, cascade_probability,
        predicted_reach, time_to_cascade_hours,
        prediction_window_end, anomaly_ids
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
    `;

    // In production, would store actual anomaly IDs
    const anomalyIds = anomalies.map(() => 
      'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
      })
    );

    await this.pool.query(query, [
      prediction.domainId,
      prediction.triggerType,
      prediction.probability,
      prediction.predictedReach,
      prediction.timeToEventHours,
      prediction.windowEnd,
      anomalyIds
    ]);
  }

  async validatePredictions(): Promise<void> {
    // This would run periodically to check if predictions came true
    const query = `
      UPDATE cascade_predictions
      SET 
        actual_occurred = CASE
          WHEN EXISTS (
            SELECT 1 FROM quantum_anomalies
            WHERE domain_id = cascade_predictions.domain_id
            AND detected_at BETWEEN cascade_predictions.predicted_at 
            AND cascade_predictions.prediction_window_end
            AND strength > 0.8
          ) THEN true
          ELSE false
        END,
        validated_at = NOW()
      WHERE prediction_window_end < NOW()
      AND validated_at IS NULL
    `;

    await this.pool.query(query);
  }
}