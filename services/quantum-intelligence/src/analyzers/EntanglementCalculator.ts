import { Pool } from 'pg';
import winston from 'winston';
import { QuantumState } from './QuantumBrandAnalyzer';

export interface EntanglementResult {
  domainAId: string;
  domainBId: string;
  entanglementEntropy: number;
  quantumDistance: number;
  correlationStrength: 'strong' | 'moderate' | 'weak' | 'none';
  sharedEigenstates: any;
  phaseCorrelation: number;
}

export class EntanglementCalculator {
  private pool: Pool;
  private logger: winston.Logger;

  constructor(pool: Pool, logger: winston.Logger) {
    this.pool = pool;
    this.logger = logger;
  }

  async calculateForDomain(domainId: string, quantumState: QuantumState): Promise<EntanglementResult[]> {
    try {
      // Get related domains (same industry or frequently compared)
      const relatedDomains = await this.getRelatedDomains(domainId);
      const results: EntanglementResult[] = [];

      for (const relatedDomain of relatedDomains) {
        // Get quantum state for related domain
        const relatedState = await this.getQuantumState(relatedDomain.id);
        
        if (relatedState) {
          const entanglement = this.calculateEntanglement(
            domainId,
            relatedDomain.id,
            quantumState,
            relatedState
          );
          
          results.push(entanglement);
          
          // Store in database
          await this.storeEntanglement(entanglement);
        }
      }

      return results;
    } catch (error) {
      this.logger.error(`Failed to calculate entanglement for ${domainId}:`, error);
      throw error;
    }
  }

  private calculateEntanglement(
    domainAId: string,
    domainBId: string,
    stateA: QuantumState,
    stateB: QuantumState
  ): EntanglementResult {
    // Calculate von Neumann entropy for entanglement
    const jointState = this.createJointState(stateA.coefficients, stateB.coefficients);
    const entanglementEntropy = this.vonNeumannEntropy(jointState);

    // Calculate quantum fidelity distance
    const quantumDistance = this.quantumFidelityDistance(stateA.coefficients, stateB.coefficients);

    // Determine correlation strength
    const correlationStrength = this.classifyCorrelation(entanglementEntropy, quantumDistance);

    // Find shared eigenstates (simplified)
    const sharedEigenstates = this.findSharedPatterns(stateA, stateB);

    // Calculate phase correlation
    const phaseCorrelation = this.calculatePhaseCorrelation(stateA.coefficients, stateB.coefficients);

    return {
      domainAId: domainAId < domainBId ? domainAId : domainBId,
      domainBId: domainAId < domainBId ? domainBId : domainAId,
      entanglementEntropy,
      quantumDistance,
      correlationStrength,
      sharedEigenstates,
      phaseCorrelation
    };
  }

  private createJointState(coeffsA: number[], coeffsB: number[]): number[][] {
    // Create density matrix for joint system (simplified tensor product)
    const size = coeffsA.length;
    const jointSize = size * size;
    const density = Array(jointSize).fill(0).map(() => Array(jointSize).fill(0));

    // Simplified: assuming pure states, create |ψ⟩⟨ψ| for joint system
    for (let i = 0; i < size; i++) {
      for (let j = 0; j < size; j++) {
        const idx1 = i * size + j;
        for (let k = 0; k < size; k++) {
          for (let l = 0; l < size; l++) {
            const idx2 = k * size + l;
            density[idx1][idx2] = coeffsA[i] * coeffsA[k] * coeffsB[j] * coeffsB[l];
          }
        }
      }
    }

    return density;
  }

  private vonNeumannEntropy(densityMatrix: number[][]): number {
    // Calculate eigenvalues (simplified - using trace for demonstration)
    // In production, would use proper eigenvalue decomposition
    const trace = densityMatrix.reduce((sum, row, i) => sum + row[i], 0);
    
    // Simplified entropy calculation
    const eigenvalues = [trace * 0.6, trace * 0.3, trace * 0.1]; // Mock eigenvalues
    
    let entropy = 0;
    for (const lambda of eigenvalues) {
      if (lambda > 1e-10) {
        entropy -= lambda * Math.log2(lambda);
      }
    }

    return Math.max(0, Math.min(1, entropy)); // Normalize to [0,1]
  }

  private quantumFidelityDistance(coeffsA: number[], coeffsB: number[]): number {
    // Calculate |⟨ψA|ψB⟩|²
    let overlap = 0;
    for (let i = 0; i < coeffsA.length; i++) {
      overlap += coeffsA[i] * coeffsB[i];
    }
    
    const fidelity = overlap * overlap;
    
    // Quantum distance = √(1 - F)
    return Math.sqrt(Math.max(0, 1 - fidelity));
  }

  private classifyCorrelation(entropy: number, distance: number): 'strong' | 'moderate' | 'weak' | 'none' {
    const score = (1 - distance) * (1 - entropy);
    
    if (score > 0.7) return 'strong';
    if (score > 0.4) return 'moderate';
    if (score > 0.2) return 'weak';
    return 'none';
  }

  private findSharedPatterns(stateA: QuantumState, stateB: QuantumState): any {
    // Find which basis states have high probability in both
    const sharedHigh = [];
    
    for (const basis of stateA.basisStates) {
      if (stateA.probabilities[basis] > 0.3 && stateB.probabilities[basis] > 0.3) {
        sharedHigh.push({
          state: basis,
          probabilityA: stateA.probabilities[basis],
          probabilityB: stateB.probabilities[basis]
        });
      }
    }

    return { sharedHighProbabilityStates: sharedHigh };
  }

  private calculatePhaseCorrelation(coeffsA: number[], coeffsB: number[]): number {
    // Simplified phase correlation (assuming real coefficients)
    // In full implementation would handle complex phases
    let correlation = 0;
    
    for (let i = 0; i < coeffsA.length; i++) {
      // Phase difference (simplified for real numbers)
      const phaseA = Math.sign(coeffsA[i]);
      const phaseB = Math.sign(coeffsB[i]);
      
      correlation += (phaseA === phaseB ? 1 : -1) * Math.abs(coeffsA[i] * coeffsB[i]);
    }

    return Math.max(-1, Math.min(1, correlation));
  }

  private async getRelatedDomains(domainId: string): Promise<any[]> {
    // Get domains in same industry or frequently compared
    const query = `
      SELECT DISTINCT d2.id, d2.domain
      FROM domains d1
      JOIN domains d2 ON d1.industry_category = d2.industry_category
      WHERE d1.id = $1 
      AND d2.id != $1
      AND EXISTS (
        SELECT 1 FROM domain_responses 
        WHERE domain_id = d2.id 
        AND created_at > NOW() - INTERVAL '7 days'
      )
      LIMIT 10
    `;

    const result = await this.pool.query(query, [domainId]);
    return result.rows;
  }

  private async getQuantumState(domainId: string): Promise<QuantumState | null> {
    // Fetch most recent quantum state from database
    const query = `
      SELECT 
        quantum_coefficients,
        basis_states,
        measurement_probabilities,
        uncertainty_score,
        llm_count
      FROM quantum_states
      WHERE domain_id = $1
      ORDER BY computed_at DESC
      LIMIT 1
    `;

    const result = await this.pool.query(query, [domainId]);
    
    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];
    return {
      coefficients: row.quantum_coefficients,
      basisStates: row.basis_states,
      probabilities: row.measurement_probabilities,
      uncertainty: row.uncertainty_score,
      llmCount: row.llm_count
    };
  }

  private async storeEntanglement(entanglement: EntanglementResult): Promise<void> {
    const query = `
      INSERT INTO quantum_entanglements (
        domain_a_id, domain_b_id, entanglement_entropy,
        quantum_distance, correlation_strength,
        shared_eigenstates, phase_correlation
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      ON CONFLICT (domain_a_id, domain_b_id, computed_at) DO NOTHING
    `;

    await this.pool.query(query, [
      entanglement.domainAId,
      entanglement.domainBId,
      entanglement.entanglementEntropy,
      entanglement.quantumDistance,
      entanglement.correlationStrength,
      JSON.stringify(entanglement.sharedEigenstates),
      entanglement.phaseCorrelation
    ]);
  }
}