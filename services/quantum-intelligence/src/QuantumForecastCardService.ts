import { Pool } from 'pg';
import winston from 'winston';
import { QuantumService } from './QuantumService';
import { QuantumState, QuantumAnomaly } from './analyzers/QuantumBrandAnalyzer';

export interface QuantumForecastCard {
  card_id: string;
  brand: {
    domain: string;
    name: string;
    logo_url?: string;
  };
  quantum_state: {
    probabilities: {
      positive: number;
      negative: number;
      neutral: number;
      emerging: number;
    };
    uncertainty: number;
    coherence: number;
    dominant_state: string;
  };
  forecast: {
    collapse_risk: number;
    most_likely_outcome: string;
    outcome_probability: number;
    timeline_hours: [number, number];
    confidence: number;
  };
  entanglement: {
    top_correlations: Array<{
      brand: string;
      entropy: number;
      correlation_type: string;
    }>;
    cascade_risk: string;
    affected_brands_estimate: number;
  };
  metrics: {
    reality_probability_index: number;
    observer_effect_magnitude: number;
    quantum_volatility_score: number;
    temporal_stability: number;
  };
  triggers: string[];
  actions: Array<{
    type: string;
    direction?: string;
    confidence: number;
    timeline: string;
    description: string;
  }>;
  tier: 'free' | 'enterprise';
  created_at: string;
}

export class QuantumForecastCardService {
  private pool: Pool;
  private logger: winston.Logger;
  private quantumService: QuantumService;

  constructor(pool: Pool, logger: winston.Logger, quantumService: QuantumService) {
    this.pool = pool;
    this.logger = logger;
    this.quantumService = quantumService;
  }

  async generateForecastCard(domainId: string, tier: 'free' | 'enterprise' = 'free'): Promise<QuantumForecastCard | null> {
    try {
      // Get quantum analysis
      const quantumAnalysis = await this.quantumService.analyzeQuantumState(domainId);
      
      if (!quantumAnalysis) {
        return null;
      }

      // Get domain info
      const domainInfo = await this.getDomainInfo(domainId);
      
      // Calculate forecast metrics
      const forecast = await this.calculateForecastMetrics(quantumAnalysis);
      
      // Calculate entanglement data
      const entanglement = await this.calculateEntanglementData(domainId, tier);
      
      // Generate actions
      const actions = this.generateActionRecommendations(forecast, tier);
      
      // Create card
      const card: QuantumForecastCard = {
        card_id: `${domainInfo.domain}-${Date.now()}`,
        brand: {
          domain: domainInfo.domain,
          name: this.formatBrandName(domainInfo.domain),
          logo_url: this.generateLogoUrl(domainInfo.domain)
        },
        quantum_state: {
          probabilities: quantumAnalysis.quantumState.probabilities,
          uncertainty: quantumAnalysis.quantumState.uncertainty,
          coherence: this.calculateCoherence(quantumAnalysis.quantumState),
          dominant_state: this.findDominantState(quantumAnalysis.quantumState.probabilities)
        },
        forecast,
        entanglement,
        metrics: {
          reality_probability_index: this.calculateRPI(quantumAnalysis.quantumState),
          observer_effect_magnitude: this.calculateObserverEffect(domainId),
          quantum_volatility_score: this.calculateVolatilityScore(quantumAnalysis),
          temporal_stability: this.calculateTemporalStability(quantumAnalysis)
        },
        triggers: this.identifyTriggers(quantumAnalysis, tier),
        actions,
        tier,
        created_at: new Date().toISOString()
      };

      // Store card for caching
      await this.storeForecastCard(card);

      return card;

    } catch (error) {
      this.logger.error(`Failed to generate forecast card for ${domainId}:`, error);
      return null;
    }
  }

  private async calculateForecastMetrics(quantumAnalysis: any) {
    const collapseRisk = this.calculateCollapseRisk(quantumAnalysis.quantumState);
    const mostLikely = this.findDominantState(quantumAnalysis.quantumState.probabilities);
    const probability = Math.max(...Object.values(quantumAnalysis.quantumState.probabilities));
    
    return {
      collapse_risk: collapseRisk,
      most_likely_outcome: mostLikely,
      outcome_probability: probability,
      timeline_hours: this.estimateTimeline(quantumAnalysis.anomalies),
      confidence: this.calculateForecastConfidence(quantumAnalysis)
    };
  }

  private calculateCollapseRisk(quantumState: any): number {
    const maxProbability = Math.max(...Object.values(quantumState.probabilities));
    const uncertainty = quantumState.uncertainty;
    
    // High max probability + low uncertainty = high collapse risk
    const baseRisk = this.sigmoid(4 * (maxProbability - 0.5));
    const uncertaintyFactor = 1 - uncertainty;
    
    return Math.min(1.0, baseRisk * uncertaintyFactor);
  }

  private async calculateEntanglementData(domainId: string, tier: string) {
    const correlations = await this.getTopCorrelations(domainId, tier === 'enterprise' ? 10 : 3);
    const cascadeRisk = this.calculateCascadeRisk(correlations);
    
    return {
      top_correlations: correlations,
      cascade_risk: cascadeRisk,
      affected_brands_estimate: this.estimateAffectedBrands(correlations)
    };
  }

  private async getTopCorrelations(domainId: string, limit: number) {
    const query = `
      SELECT 
        CASE 
          WHEN domain_a_id = $1 THEN (SELECT domain FROM domains WHERE id = domain_b_id)
          ELSE (SELECT domain FROM domains WHERE id = domain_a_id)
        END as brand,
        entanglement_entropy as entropy,
        correlation_strength
      FROM quantum_entanglements qe
      WHERE (domain_a_id = $1 OR domain_b_id = $1)
      AND entanglement_entropy > 0.3
      ORDER BY entanglement_entropy DESC
      LIMIT $2
    `;

    const result = await this.pool.query(query, [domainId, limit]);
    
    return result.rows.map(row => ({
      brand: row.brand,
      entropy: row.entropy,
      correlation_type: this.classifyCorrelationType(row.correlation_strength)
    }));
  }

  private calculateCascadeRisk(correlations: any[]): string {
    const maxEntropy = Math.max(...correlations.map(c => c.entropy), 0);
    const strongCorrelations = correlations.filter(c => c.entropy > 0.7).length;
    
    if (maxEntropy > 0.8 && strongCorrelations > 3) return 'high';
    if (maxEntropy > 0.6 && strongCorrelations > 1) return 'moderate';
    return 'low';
  }

  private generateActionRecommendations(forecast: any, tier: string) {
    const actions = [];

    // Basic action for all tiers
    if (forecast.collapse_risk > 0.7) {
      actions.push({
        type: 'alert',
        confidence: forecast.confidence,
        timeline: `${forecast.timeline_hours[0]}-${forecast.timeline_hours[1]}h`,
        description: `High probability quantum state collapse to ${forecast.most_likely_outcome}`
      });
    }

    // Enterprise-only actions
    if (tier === 'enterprise') {
      if (forecast.collapse_risk > 0.8) {
        actions.push({
          type: 'trade_signal',
          direction: forecast.most_likely_outcome === 'negative' ? 'short' : 'long',
          confidence: forecast.confidence,
          timeline: `${forecast.timeline_hours[0]}-${forecast.timeline_hours[1]}h`,
          description: 'Quantum mechanics indicate high-probability directional move'
        });
      }

      if (forecast.collapse_risk > 0.6) {
        actions.push({
          type: 'hedge',
          confidence: forecast.confidence * 0.8,
          timeline: `${forecast.timeline_hours[1]}-${forecast.timeline_hours[1] * 2}h`,
          description: 'Consider protective positioning against quantum volatility'
        });
      }
    }

    return actions;
  }

  private identifyTriggers(quantumAnalysis: any, tier: string): string[] {
    const triggers = ['Market sentiment shift', 'News catalyst', 'Competitor action'];
    
    if (tier === 'enterprise') {
      // Add more detailed triggers for enterprise
      if (quantumAnalysis.anomalies?.some((a: any) => a.type === 'strong_collapse')) {
        triggers.push('Quantum state collapse event', 'LLM consensus formation');
      }
      
      if (quantumAnalysis.anomalies?.some((a: any) => a.type === 'phase_alignment')) {
        triggers.push('AI model synchronization', 'Perception coherence spike');
      }
    }

    return triggers;
  }

  // Utility methods
  private calculateRPI(quantumState: any): number {
    const dominantAmplitude = Math.max(...Object.values(quantumState.probabilities));
    const collapseProximity = 1 - quantumState.uncertainty;
    return dominantAmplitude * collapseProximity;
  }

  private calculateObserverEffect(domainId: string): number {
    // Simplified observer effect calculation
    return Math.random() * 0.2; // 0-20% observer effect
  }

  private calculateVolatilityScore(quantumAnalysis: any): number {
    const uncertainty = quantumAnalysis.quantumState.uncertainty;
    const anomalyCount = quantumAnalysis.anomalies?.length || 0;
    return Math.min(1.0, uncertainty + (anomalyCount * 0.1));
  }

  private calculateTemporalStability(quantumAnalysis: any): number {
    // Higher uncertainty = lower stability
    return 1 - quantumAnalysis.quantumState.uncertainty;
  }

  private calculateCoherence(quantumState: any): number {
    // Simplified coherence calculation
    const probabilities = Object.values(quantumState.probabilities);
    const variance = this.calculateVariance(probabilities);
    return 1 - (variance / 0.25); // Normalized variance
  }

  private findDominantState(probabilities: any): string {
    return Object.entries(probabilities)
      .sort((a: any, b: any) => b[1] - a[1])[0][0];
  }

  private estimateTimeline(anomalies: any[]): [number, number] {
    if (!anomalies || anomalies.length === 0) {
      return [48, 168]; // 48h to 1 week default
    }

    const strongestAnomaly = anomalies.reduce((max, current) => 
      current.strength > max.strength ? current : max
    );

    const baseTime = strongestAnomaly.type === 'strong_collapse' ? 24 : 48;
    const adjustedTime = baseTime * (2 - strongestAnomaly.strength);

    return [Math.round(adjustedTime * 0.75), Math.round(adjustedTime * 1.5)];
  }

  private calculateForecastConfidence(quantumAnalysis: any): number {
    const anomalyConfidence = quantumAnalysis.anomalies?.length > 0 
      ? Math.max(...quantumAnalysis.anomalies.map((a: any) => a.confidence))
      : 0.5;
    
    const uncertaintyFactor = 1 - quantumAnalysis.quantumState.uncertainty;
    
    return (anomalyConfidence + uncertaintyFactor) / 2;
  }

  private sigmoid(x: number): number {
    return 1 / (1 + Math.exp(-x));
  }

  private calculateVariance(values: number[]): number {
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    return values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
  }

  private formatBrandName(domain: string): string {
    return domain
      .replace('.com', '')
      .replace('.org', '')
      .replace('.io', '')
      .split('.')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  private generateLogoUrl(domain: string): string {
    return `https://logo.clearbit.com/${domain}`;
  }

  private classifyCorrelationType(strength: string): string {
    const typeMap = {
      'strong': 'quantum_entangled',
      'moderate': 'correlated', 
      'weak': 'weakly_linked',
      'none': 'independent'
    };
    return typeMap[strength] || 'unknown';
  }

  private estimateAffectedBrands(correlations: any[]): number {
    return correlations.reduce((sum, correlation) => {
      return sum + (correlation.entropy * 10); // Scale entropy to brand count estimate
    }, 0);
  }

  private async getDomainInfo(domainId: string) {
    const query = 'SELECT domain FROM domains WHERE id = $1';
    const result = await this.pool.query(query, [domainId]);
    return result.rows[0];
  }

  private async storeForecastCard(card: QuantumForecastCard): Promise<void> {
    const query = `
      INSERT INTO quantum_forecast_cards (
        card_id, domain_id, card_data, tier, created_at
      ) VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (card_id) DO UPDATE SET
        card_data = EXCLUDED.card_data,
        updated_at = NOW()
    `;

    // Get domain_id from domain name
    const domainQuery = 'SELECT id FROM domains WHERE domain = $1';
    const domainResult = await this.pool.query(domainQuery, [card.brand.domain]);
    const domainId = domainResult.rows[0]?.id;

    if (domainId) {
      await this.pool.query(query, [
        card.card_id,
        domainId,
        JSON.stringify(card),
        card.tier,
        card.created_at
      ]);
    }
  }
}