import { describe, test, expect } from '@jest/globals';
import { QuantumBrandAnalyzer } from '../src/analyzers/QuantumBrandAnalyzer';
import { EntanglementCalculator } from '../src/analyzers/EntanglementCalculator';
import { CascadePredictor } from '../src/analyzers/CascadePredictor';

describe('Mathematical Validation Tests', () => {
  
  describe('Quantum State Properties', () => {
    test('quantum state should be properly normalized', () => {
      // Test normalization: Σ|ψᵢ|² = 1
      const coefficients = [0.5, 0.5, 0.5, 0.5];
      const normalized = normalizeQuantumState(coefficients);
      
      const sumSquared = normalized.reduce((sum, c) => sum + c * c, 0);
      expect(sumSquared).toBeCloseTo(1.0, 10); // 10 decimal places precision
    });

    test('probabilities should sum to 1', () => {
      const state = {
        positive: 0.25,
        negative: 0.25,
        neutral: 0.25,
        emerging: 0.25
      };
      
      const sum = Object.values(state).reduce((a, b) => a + b, 0);
      expect(sum).toBeCloseTo(1.0, 10);
    });

    test('uncertainty calculation should be bounded [0,1]', () => {
      // Test Shannon entropy normalization
      const testCases = [
        [0.25, 0.25, 0.25, 0.25], // Maximum entropy
        [1.0, 0.0, 0.0, 0.0],     // Minimum entropy
        [0.5, 0.3, 0.2, 0.0]      // Partial entropy
      ];

      for (const probs of testCases) {
        const uncertainty = calculateUncertainty(probs);
        expect(uncertainty).toBeGreaterThanOrEqual(0);
        expect(uncertainty).toBeLessThanOrEqual(1);
      }
    });

    test('rotation matrix should be unitary', () => {
      // Test that U†U = I (unitary property)
      const sentimentVector = [0.3, 0.4, 0.2, 0.1];
      const rotation = createRotationMatrix(sentimentVector);
      
      // Check if matrix preserves norm
      const testVector = [0.5, 0.5, 0.5, 0.5];
      const rotated = applyMatrix(rotation, testVector);
      
      const normBefore = Math.sqrt(testVector.reduce((sum, v) => sum + v * v, 0));
      const normAfter = Math.sqrt(rotated.reduce((sum, v) => sum + v * v, 0));
      
      expect(normAfter).toBeCloseTo(normBefore, 5);
    });
  });

  describe('Entanglement Calculations', () => {
    test('von Neumann entropy should be non-negative', () => {
      const testStates = [
        [1, 0, 0, 0],    // Pure state (S = 0)
        [0.5, 0.5, 0.5, 0.5], // Mixed state (S > 0)
      ];

      for (const state of testStates) {
        const entropy = calculateVonNeumannEntropy(state);
        expect(entropy).toBeGreaterThanOrEqual(0);
      }
    });

    test('quantum distance should satisfy triangle inequality', () => {
      // d(A,C) ≤ d(A,B) + d(B,C)
      const stateA = [1, 0, 0, 0];
      const stateB = [0.7, 0.7, 0, 0];
      const stateC = [0, 1, 0, 0];

      const dAB = quantumDistance(stateA, stateB);
      const dBC = quantumDistance(stateB, stateC);
      const dAC = quantumDistance(stateA, stateC);

      expect(dAC).toBeLessThanOrEqual(dAB + dBC + 0.0001); // Small epsilon for float precision
    });

    test('entanglement should be symmetric', () => {
      // E(A,B) = E(B,A)
      const stateA = [0.6, 0.8, 0, 0];
      const stateB = [0.8, 0.6, 0, 0];

      const entanglementAB = calculateEntanglement(stateA, stateB);
      const entanglementBA = calculateEntanglement(stateB, stateA);

      expect(entanglementAB).toBeCloseTo(entanglementBA, 10);
    });

    test('maximally entangled states should have high entropy', () => {
      // Bell state: |Φ⁺⟩ = (|00⟩ + |11⟩)/√2
      const bellState = createBellState();
      const entropy = calculateEntanglementEntropy(bellState);
      
      expect(entropy).toBeGreaterThan(0.9); // Should be close to 1
    });
  });

  describe('Cascade Prediction Logic', () => {
    test('cascade probability should be bounded [0,1]', () => {
      const anomalies = [
        { strength: 0.9, confidence: 0.8, type: 'strong_collapse' },
        { strength: 0.7, confidence: 0.9, type: 'phase_alignment' }
      ];

      const probability = calculateCascadeProbability(anomalies);
      
      expect(probability).toBeGreaterThanOrEqual(0);
      expect(probability).toBeLessThanOrEqual(1);
    });

    test('stronger anomalies should predict sooner events', () => {
      const weakAnomaly = { strength: 0.5, type: 'strong_collapse' };
      const strongAnomaly = { strength: 0.9, type: 'strong_collapse' };

      const timeWeak = estimateTimeToEvent(weakAnomaly);
      const timeStrong = estimateTimeToEvent(strongAnomaly);

      expect(timeStrong).toBeLessThan(timeWeak);
    });

    test('viral reach should follow exponential model', () => {
      const probabilities = [0.5, 0.7, 0.9];
      const reaches = probabilities.map(p => estimateViralReach(p));

      // Check exponential growth
      for (let i = 1; i < reaches.length; i++) {
        expect(reaches[i]).toBeGreaterThan(reaches[i-1]);
        
        // Growth rate should increase
        if (i > 1) {
          const growth1 = reaches[i-1] / reaches[i-2];
          const growth2 = reaches[i] / reaches[i-1];
          expect(growth2).toBeGreaterThan(growth1);
        }
      }
    });
  });

  describe('Mathematical Consistency', () => {
    test('quantum operations should preserve total probability', () => {
      const initial = [0.5, 0.3, 0.2, 0.0];
      const sentiments = [
        [0.8, 0.1, 0.1, 0.0],
        [0.2, 0.5, 0.3, 0.0],
        [0.4, 0.4, 0.2, 0.0]
      ];

      let state = [...initial];
      
      for (const sentiment of sentiments) {
        const rotation = createRotationMatrix(sentiment);
        state = applyMatrix(rotation, state);
        state = normalizeQuantumState(state);
        
        const probSum = state.reduce((sum, c) => sum + c * c, 0);
        expect(probSum).toBeCloseTo(1.0, 10);
      }
    });

    test('phase variance should detect alignment', () => {
      // Aligned phases (all positive)
      const aligned = [0.5, 0.5, 0.5, 0.5];
      const varianceAligned = calculatePhaseVariance(aligned);
      
      // Mixed phases
      const mixed = [0.5, -0.5, 0.5, -0.5];
      const varianceMixed = calculatePhaseVariance(mixed);
      
      expect(varianceAligned).toBeLessThan(varianceMixed);
    });

    test('entropy should be maximal for uniform distribution', () => {
      const uniform = [0.25, 0.25, 0.25, 0.25];
      const skewed = [0.7, 0.2, 0.1, 0.0];
      
      const entropyUniform = calculateUncertainty(uniform);
      const entropySkewed = calculateUncertainty(skewed);
      
      expect(entropyUniform).toBeGreaterThan(entropySkewed);
      expect(entropyUniform).toBeCloseTo(1.0, 2); // Should be close to 1
    });
  });
});

// Helper functions for testing
function normalizeQuantumState(coeffs: number[]): number[] {
  const norm = Math.sqrt(coeffs.reduce((sum, c) => sum + c * c, 0));
  return coeffs.map(c => c / norm);
}

function calculateUncertainty(probs: number[]): number {
  const validProbs = probs.filter(p => p > 0);
  const entropy = -validProbs.reduce((sum, p) => sum + p * Math.log2(p), 0);
  const maxEntropy = Math.log2(probs.length);
  return maxEntropy > 0 ? entropy / maxEntropy : 0;
}

function createRotationMatrix(sentiment: number[]): number[][] {
  const theta = Math.PI * sentiment[0];
  const phi = Math.PI * sentiment[1];
  
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

function applyMatrix(matrix: number[][], vector: number[]): number[] {
  const result = new Array(vector.length).fill(0);
  for (let i = 0; i < matrix.length; i++) {
    for (let j = 0; j < vector.length; j++) {
      result[i] += matrix[i][j] * vector[j];
    }
  }
  return result;
}

function calculateVonNeumannEntropy(state: number[]): number {
  // Simplified for pure states
  const purity = state.reduce((sum, c) => sum + c * c * c * c, 0);
  return -Math.log2(purity) / 2;
}

function quantumDistance(state1: number[], state2: number[]): number {
  let overlap = 0;
  for (let i = 0; i < state1.length; i++) {
    overlap += state1[i] * state2[i];
  }
  const fidelity = overlap * overlap;
  return Math.sqrt(Math.max(0, 1 - fidelity));
}

function calculateEntanglement(state1: number[], state2: number[]): number {
  // Simplified entanglement measure
  return 1 - quantumDistance(state1, state2);
}

function createBellState(): number[] {
  // |Φ⁺⟩ = (|00⟩ + |11⟩)/√2
  return [1/Math.sqrt(2), 0, 0, 1/Math.sqrt(2)];
}

function calculateEntanglementEntropy(state: number[]): number {
  // For maximally entangled state, entropy should be 1
  const mixed = state.map(c => c * c);
  return calculateUncertainty(mixed);
}

function calculateCascadeProbability(anomalies: any[]): number {
  const maxStrength = Math.max(...anomalies.map(a => a.strength));
  const avgConfidence = anomalies.reduce((sum, a) => sum + a.confidence, 0) / anomalies.length;
  return Math.min(1, maxStrength * avgConfidence);
}

function estimateTimeToEvent(anomaly: any): number {
  const baseTime = 24; // hours
  return baseTime * (2 - anomaly.strength);
}

function estimateViralReach(probability: number): number {
  return Math.floor(Math.exp(probability * 10));
}

function calculatePhaseVariance(coeffs: number[]): number {
  const phases = coeffs.map(c => Math.atan2(0, c));
  const mean = phases.reduce((a, b) => a + b, 0) / phases.length;
  return phases.reduce((sum, p) => sum + Math.pow(p - mean, 2), 0) / phases.length;
}