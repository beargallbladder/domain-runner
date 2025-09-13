import { Pool } from 'pg';
import winston from 'winston';
import * as math from 'mathjs';

export interface QuantumState {
  coefficients: number[];
  basisStates: string[];
  probabilities: { [key: string]: number };
  uncertainty: number;
  llmCount: number;
  coherenceTime?: number;
  decoherenceRate?: number;
}

export interface QuantumAnomaly {
  type: 'strong_collapse' | 'phase_alignment' | 'entanglement_spike' | 'decoherence_event';
  strength: number;
  confidence: number;
  description: string;
  recommendation: string;
  affectedModels: string[];
}

export class QuantumBrandAnalyzer {
  private pool: Pool;
  private logger: winston.Logger;
  
  constructor(pool: Pool, logger: winston.Logger) {
    this.pool = pool;
    this.logger = logger;
  }

  async calculateQuantumState(domainId: string): Promise<QuantumState> {
    try {
      // Fetch LLM responses from last 7 days
      const responses = await this.fetchLLMResponses(domainId);
      
      if (responses.length === 0) {
        throw new Error('No LLM responses found for domain');
      }

      // Initialize quantum state in equal superposition
      const basisStates = ['positive', 'negative', 'neutral', 'emerging'];
      let coefficients = [0.5, 0.5, 0.5, 0.5]; // Initial equal superposition

      // Process each LLM response to evolve the quantum state
      const modelGroups = this.groupByModel(responses);
      
      for (const [model, modelResponses] of Object.entries(modelGroups)) {
        const sentimentVector = this.extractSentimentVector(modelResponses);
        const rotation = this.createRotationMatrix(sentimentVector);
        coefficients = this.applyQuantumOperation(coefficients, rotation);
      }

      // Normalize to ensure valid quantum state
      const norm = Math.sqrt(coefficients.reduce((sum, c) => sum + c * c, 0));
      coefficients = coefficients.map(c => c / norm);

      // Calculate probabilities (|ψ|²)
      const probabilities: { [key: string]: number } = {};
      basisStates.forEach((state, i) => {
        probabilities[state] = coefficients[i] * coefficients[i];
      });

      // Calculate uncertainty (Shannon entropy)
      const uncertainty = this.calculateUncertainty(Object.values(probabilities));

      return {
        coefficients,
        basisStates,
        probabilities,
        uncertainty,
        llmCount: Object.keys(modelGroups).length,
        coherenceTime: 24, // hours
        decoherenceRate: 0.1
      };

    } catch (error) {
      this.logger.error(`Failed to calculate quantum state for ${domainId}:`, error);
      throw error;
    }
  }

  async detectAnomalies(quantumState: QuantumState): Promise<QuantumAnomaly[]> {
    const anomalies: QuantumAnomaly[] = [];

    // Check for strong collapse (one state dominates)
    const maxProbability = Math.max(...Object.values(quantumState.probabilities));
    if (maxProbability > 0.8) {
      anomalies.push({
        type: 'strong_collapse',
        strength: maxProbability,
        confidence: 0.9,
        description: 'Strong consensus detected - quantum state collapsing to single perception',
        recommendation: 'Monitor for potential viral cascade within 24-48 hours',
        affectedModels: this.findDominantModels(quantumState)
      });
    }

    // Check for phase alignment (unusual agreement)
    const phaseVariance = this.calculatePhaseVariance(quantumState.coefficients);
    if (phaseVariance < 0.1) {
      anomalies.push({
        type: 'phase_alignment',
        strength: 1 - phaseVariance,
        confidence: 0.85,
        description: 'Unusual phase alignment detected across LLM models',
        recommendation: 'Investigate cause of sudden model convergence',
        affectedModels: ['all']
      });
    }

    // Check for low uncertainty (all models agree)
    if (quantumState.uncertainty < 0.2) {
      anomalies.push({
        type: 'strong_collapse',
        strength: 1 - quantumState.uncertainty,
        confidence: 0.8,
        description: 'Low quantum uncertainty - strong agreement across models',
        recommendation: 'Prepare for potential trend amplification',
        affectedModels: ['all']
      });
    }

    return anomalies;
  }

  private async fetchLLMResponses(domainId: string): Promise<any[]> {
    const query = `
      SELECT 
        dr.model,
        dr.response as response_content,
        COALESCE(dr.sentiment_score, 70) / 100.0 as confidence_score,
        dr.prompt_type,
        dr.created_at
      FROM domain_responses dr
      WHERE dr.domain_id = $1
      AND dr.created_at > NOW() - INTERVAL '7 days'
      ORDER BY dr.created_at DESC
    `;

    const result = await this.pool.query(query, [domainId]);
    return result.rows;
  }

  private groupByModel(responses: any[]): { [model: string]: any[] } {
    return responses.reduce((groups, response) => {
      const model = response.model;
      if (!groups[model]) groups[model] = [];
      groups[model].push(response);
      return groups;
    }, {});
  }

  private extractSentimentVector(responses: any[]): number[] {
    // Sentiment keywords for each basis state
    const keywords = {
      positive: ['growth', 'innovation', 'success', 'leading', 'breakthrough', 'excellent'],
      negative: ['decline', 'failure', 'struggling', 'problem', 'crisis', 'poor'],
      neutral: ['stable', 'consistent', 'maintaining', 'steady', 'unchanged', 'average'],
      emerging: ['potential', 'developing', 'upcoming', 'future', 'transforming', 'evolving']
    };

    const vector = [0, 0, 0, 0];

    for (const response of responses) {
      const content = response.response_content.toLowerCase();
      const confidence = response.confidence_score;

      // Count keyword occurrences weighted by confidence
      Object.entries(keywords).forEach(([state, words], index) => {
        const count = words.filter(word => content.includes(word)).length;
        vector[index] += count * confidence;
      });
    }

    // Normalize
    const sum = vector.reduce((a, b) => a + b, 0);
    return sum > 0 ? vector.map(v => v / sum) : [0.25, 0.25, 0.25, 0.25];
  }

  private createRotationMatrix(sentimentVector: number[]): number[][] {
    // Create 4x4 rotation matrix based on sentiment
    // This is a simplified version - in production would use proper SU(2) matrices
    const theta = Math.PI * sentimentVector[0]; // Positive influence
    const phi = Math.PI * sentimentVector[1];   // Negative influence
    
    const cos_t = Math.cos(theta / 2);
    const sin_t = Math.sin(theta / 2);
    const cos_p = Math.cos(phi / 2);
    const sin_p = Math.sin(phi / 2);

    return [
      [cos_t * cos_p, -sin_t * cos_p, -cos_t * sin_p, sin_t * sin_p],
      [sin_t * cos_p, cos_t * cos_p, -sin_t * sin_p, -cos_t * sin_p],
      [cos_t * sin_p, -sin_t * sin_p, cos_t * cos_p, -sin_t * cos_p],
      [sin_t * sin_p, cos_t * sin_p, sin_t * cos_p, cos_t * cos_p]
    ];
  }

  private applyQuantumOperation(state: number[], matrix: number[][]): number[] {
    // Matrix multiplication
    const result = new Array(4).fill(0);
    for (let i = 0; i < 4; i++) {
      for (let j = 0; j < 4; j++) {
        result[i] += matrix[i][j] * state[j];
      }
    }
    return result;
  }

  private calculateUncertainty(probabilities: number[]): number {
    // Shannon entropy normalized to [0,1]
    const validProbs = probabilities.filter(p => p > 0);
    const entropy = -validProbs.reduce((sum, p) => sum + p * Math.log2(p), 0);
    const maxEntropy = Math.log2(probabilities.length);
    return maxEntropy > 0 ? entropy / maxEntropy : 0;
  }

  private calculatePhaseVariance(coefficients: number[]): number {
    // Calculate variance of phases (simplified - assumes real coefficients)
    const phases = coefficients.map(c => Math.atan2(0, c)); // Simplified for real numbers
    const mean = phases.reduce((a, b) => a + b, 0) / phases.length;
    const variance = phases.reduce((sum, p) => sum + Math.pow(p - mean, 2), 0) / phases.length;
    return variance;
  }

  private findDominantModels(quantumState: QuantumState): string[] {
    // In a full implementation, this would track which models contributed to dominant state
    return ['gpt-4', 'claude-3', 'gemini']; // Placeholder
  }
}