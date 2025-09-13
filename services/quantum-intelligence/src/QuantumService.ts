import { Pool } from 'pg';
import winston from 'winston';
import { QuantumBrandAnalyzer } from './analyzers/QuantumBrandAnalyzer';
import { EntanglementCalculator } from './analyzers/EntanglementCalculator';
import { CascadePredictor } from './analyzers/CascadePredictor';
import { QuantumStateCache } from './cache/QuantumStateCache';
import { QuantumMetrics } from './monitoring/QuantumMetrics';

export interface QuantumConfig {
  enabled: boolean;
  shadowMode: boolean;
  apiExposed: boolean;
  maxCalculationTimeMs: number;
  cacheEnabled: boolean;
  cacheTTLSeconds: number;
}

export class QuantumService {
  private pool: Pool;
  private logger: winston.Logger;
  private config: QuantumConfig;
  private brandAnalyzer: QuantumBrandAnalyzer;
  private entanglementCalc: EntanglementCalculator;
  private cascadePredictor: CascadePredictor;
  private cache: QuantumStateCache;
  private metrics: QuantumMetrics;
  private isHealthy: boolean = true;

  constructor(pool: Pool, logger: winston.Logger) {
    this.pool = pool;
    this.logger = logger;
    
    // Load configuration with safe defaults
    this.config = {
      enabled: process.env.QUANTUM_ENABLED === 'true' || false,
      shadowMode: process.env.QUANTUM_SHADOW_MODE !== 'false', // Default true
      apiExposed: process.env.QUANTUM_API_EXPOSED === 'true' || false,
      maxCalculationTimeMs: parseInt(process.env.QUANTUM_MAX_CALC_TIME_MS || '5000'),
      cacheEnabled: process.env.QUANTUM_CACHE_ENABLED !== 'false', // Default true
      cacheTTLSeconds: parseInt(process.env.QUANTUM_CACHE_TTL_SECONDS || '3600')
    };

    // Initialize components only if enabled
    if (this.config.enabled) {
      this.initializeComponents();
    } else {
      this.logger.info('🚫 Quantum Intelligence Module is DISABLED');
    }
  }

  private initializeComponents(): void {
    try {
      this.brandAnalyzer = new QuantumBrandAnalyzer(this.pool, this.logger);
      this.entanglementCalc = new EntanglementCalculator(this.pool, this.logger);
      this.cascadePredictor = new CascadePredictor(this.pool, this.logger);
      this.cache = new QuantumStateCache(this.config.cacheTTLSeconds);
      this.metrics = new QuantumMetrics();

      this.logger.info('🌌 Quantum Intelligence Module initialized', {
        shadowMode: this.config.shadowMode,
        apiExposed: this.config.apiExposed
      });
    } catch (error) {
      this.logger.error('Failed to initialize Quantum components:', error);
      this.isHealthy = false;
    }
  }

  /**
   * Main entry point for quantum analysis
   * Safe to call even when disabled - returns null
   */
  async analyzeQuantumState(domainId: string): Promise<any | null> {
    if (!this.config.enabled || !this.isHealthy) {
      return null;
    }

    const startTime = Date.now();
    const logEntry = {
      domain_id: domainId,
      operation_type: 'quantum_state_analysis',
      status: 'started'
    };

    try {
      // Check cache first
      if (this.config.cacheEnabled) {
        const cached = await this.cache.get(domainId);
        if (cached) {
          this.metrics.recordCacheHit();
          return cached;
        }
      }

      // Set calculation timeout
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Quantum calculation timeout')), 
          this.config.maxCalculationTimeMs);
      });

      // Run quantum analysis with timeout
      const analysisPromise = this.performQuantumAnalysis(domainId);
      const result = await Promise.race([analysisPromise, timeoutPromise]);

      // Cache result
      if (this.config.cacheEnabled && result) {
        await this.cache.set(domainId, result);
      }

      // Record metrics
      const calculationTime = Date.now() - startTime;
      this.metrics.recordCalculationTime(calculationTime);
      
      // Log success
      await this.logAnalysis({
        ...logEntry,
        status: 'success',
        calculation_time_ms: calculationTime,
        output_data: { summary: 'Quantum state calculated' }
      });

      return result;

    } catch (error) {
      // Log failure but don't throw - graceful degradation
      this.logger.error(`Quantum analysis failed for ${domainId}:`, error);
      
      await this.logAnalysis({
        ...logEntry,
        status: 'failed',
        error_message: error.message,
        calculation_time_ms: Date.now() - startTime
      });

      this.metrics.recordError(error.message);
      
      // Return null instead of throwing
      return null;
    }
  }

  private async performQuantumAnalysis(domainId: string): Promise<any> {
    // Step 1: Calculate quantum state
    const quantumState = await this.brandAnalyzer.calculateQuantumState(domainId);
    
    // Step 2: Check for anomalies
    const anomalies = await this.brandAnalyzer.detectAnomalies(quantumState);
    
    // Step 3: Calculate entanglements (async, don't wait)
    if (!this.config.shadowMode) {
      this.calculateEntanglementsAsync(domainId, quantumState);
    }
    
    // Step 4: Predict cascades if anomalies detected
    let cascadePrediction = null;
    if (anomalies.length > 0) {
      cascadePrediction = await this.cascadePredictor.predict(domainId, anomalies);
    }
    
    // Step 5: Store results (only if not in shadow mode)
    if (!this.config.shadowMode) {
      await this.storeQuantumState(domainId, quantumState, anomalies, cascadePrediction);
    }
    
    return {
      domainId,
      quantumState,
      anomalies,
      cascadePrediction,
      timestamp: new Date().toISOString(),
      mode: this.config.shadowMode ? 'shadow' : 'active'
    };
  }

  private async calculateEntanglementsAsync(domainId: string, quantumState: any): Promise<void> {
    // Run in background, don't block main analysis
    setImmediate(async () => {
      try {
        await this.entanglementCalc.calculateForDomain(domainId, quantumState);
      } catch (error) {
        this.logger.error(`Background entanglement calculation failed: ${error.message}`);
      }
    });
  }

  private async storeQuantumState(
    domainId: string, 
    quantumState: any, 
    anomalies: any[], 
    cascadePrediction: any
  ): Promise<void> {
    const client = await this.pool.connect();
    
    try {
      await client.query('BEGIN');
      
      // Store quantum state
      const stateResult = await client.query(`
        INSERT INTO quantum_states (
          domain_id, quantum_coefficients, basis_states, 
          measurement_probabilities, uncertainty_score, 
          llm_count, coherence_time_hours, decoherence_rate
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING id
      `, [
        domainId,
        quantumState.coefficients,
        quantumState.basisStates,
        JSON.stringify(quantumState.probabilities),
        quantumState.uncertainty,
        quantumState.llmCount,
        quantumState.coherenceTime || 24,
        quantumState.decoherenceRate || 0.1
      ]);
      
      const quantumStateId = stateResult.rows[0].id;
      
      // Store anomalies
      for (const anomaly of anomalies) {
        await client.query(`
          INSERT INTO quantum_anomalies (
            domain_id, anomaly_type, strength, confidence,
            description, recommendation, affected_models
          ) VALUES ($1, $2, $3, $4, $5, $6, $7)
        `, [
          domainId,
          anomaly.type,
          anomaly.strength,
          anomaly.confidence,
          anomaly.description,
          anomaly.recommendation,
          anomaly.affectedModels
        ]);
      }
      
      // Store cascade prediction if exists
      if (cascadePrediction) {
        await client.query(`
          INSERT INTO cascade_predictions (
            domain_id, trigger_type, cascade_probability,
            predicted_reach, time_to_cascade_hours,
            quantum_state_id, prediction_window_end
          ) VALUES ($1, $2, $3, $4, $5, $6, $7)
        `, [
          domainId,
          cascadePrediction.triggerType,
          cascadePrediction.probability,
          cascadePrediction.predictedReach,
          cascadePrediction.timeToEventHours,
          quantumStateId,
          cascadePrediction.windowEnd
        ]);
      }
      
      await client.query('COMMIT');
      
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  private async logAnalysis(logEntry: any): Promise<void> {
    try {
      await this.pool.query(`
        INSERT INTO quantum_analysis_log (
          domain_id, operation_type, input_data, output_data,
          calculation_time_ms, status, error_message
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      `, [
        logEntry.domain_id,
        logEntry.operation_type,
        JSON.stringify(logEntry.input_data || {}),
        JSON.stringify(logEntry.output_data || {}),
        logEntry.calculation_time_ms,
        logEntry.status,
        logEntry.error_message
      ]);
    } catch (error) {
      // Don't fail main operation if logging fails
      this.logger.error('Failed to log quantum analysis:', error);
    }
  }

  /**
   * Health check for monitoring
   */
  async healthCheck(): Promise<any> {
    if (!this.config.enabled) {
      return {
        status: 'disabled',
        message: 'Quantum module is disabled'
      };
    }

    try {
      // Test database connection
      const result = await this.pool.query('SELECT COUNT(*) FROM quantum_states');
      const stateCount = parseInt(result.rows[0].count);
      
      // Get metrics
      const metrics = this.metrics.getSnapshot();
      
      return {
        status: 'healthy',
        shadowMode: this.config.shadowMode,
        quantumStatesCount: stateCount,
        metrics,
        uptime: process.uptime()
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        error: error.message
      };
    }
  }

  /**
   * Graceful shutdown
   */
  async shutdown(): Promise<void> {
    this.logger.info('Shutting down Quantum Intelligence Module...');
    this.config.enabled = false;
    
    if (this.cache) {
      await this.cache.clear();
    }
    
    if (this.metrics) {
      await this.metrics.flush();
    }
  }
}

// Export singleton instance
let quantumService: QuantumService | null = null;

export function initializeQuantumService(pool: Pool, logger: winston.Logger): QuantumService {
  if (!quantumService) {
    quantumService = new QuantumService(pool, logger);
  }
  return quantumService;
}

export function getQuantumService(): QuantumService | null {
  return quantumService;
}