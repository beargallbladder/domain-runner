/**
 * Error Recovery System
 * Implements circuit breakers, retries, and failover mechanisms
 */

import { EventEmitter } from 'events';
import { PRODUCTION_CONFIG } from './production-config';

export enum CircuitState {
  CLOSED = 'closed',
  OPEN = 'open',
  HALF_OPEN = 'half_open',
}

export interface CircuitBreakerOptions {
  failureThreshold: number;
  resetTimeout: number;
  monitoringPeriod: number;
  halfOpenMaxAttempts: number;
}

export interface RetryOptions {
  maxRetries: number;
  backoffMs: number;
  maxBackoffMs: number;
  exponentialBackoff: boolean;
}

export class CircuitBreaker extends EventEmitter {
  private state: CircuitState = CircuitState.CLOSED;
  private failureCount: number = 0;
  private successCount: number = 0;
  private lastFailureTime: Date | null = null;
  private halfOpenAttempts: number = 0;
  
  constructor(
    private name: string,
    private options: CircuitBreakerOptions
  ) {
    super();
  }

  /**
   * Execute function with circuit breaker protection
   */
  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state === CircuitState.OPEN) {
      if (this.shouldAttemptReset()) {
        this.state = CircuitState.HALF_OPEN;
        this.halfOpenAttempts = 0;
      } else {
        throw new Error(`Circuit breaker ${this.name} is OPEN`);
      }
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  /**
   * Handle successful execution
   */
  private onSuccess(): void {
    this.failureCount = 0;
    
    if (this.state === CircuitState.HALF_OPEN) {
      this.successCount++;
      if (this.successCount >= this.options.halfOpenMaxAttempts) {
        this.state = CircuitState.CLOSED;
        this.emit('stateChange', CircuitState.CLOSED);
        console.log(`Circuit breaker ${this.name} is now CLOSED`);
      }
    }
  }

  /**
   * Handle failed execution
   */
  private onFailure(): void {
    this.failureCount++;
    this.lastFailureTime = new Date();
    
    if (this.state === CircuitState.HALF_OPEN) {
      this.state = CircuitState.OPEN;
      this.emit('stateChange', CircuitState.OPEN);
      console.log(`Circuit breaker ${this.name} is now OPEN (half-open test failed)`);
    } else if (this.failureCount >= this.options.failureThreshold) {
      this.state = CircuitState.OPEN;
      this.emit('stateChange', CircuitState.OPEN);
      console.log(`Circuit breaker ${this.name} is now OPEN (threshold reached)`);
    }
  }

  /**
   * Check if we should attempt to reset the circuit
   */
  private shouldAttemptReset(): boolean {
    if (!this.lastFailureTime) return false;
    
    const timeSinceLastFailure = Date.now() - this.lastFailureTime.getTime();
    return timeSinceLastFailure >= this.options.resetTimeout;
  }

  /**
   * Get current circuit state
   */
  getState(): CircuitState {
    return this.state;
  }

  /**
   * Force reset the circuit
   */
  reset(): void {
    this.state = CircuitState.CLOSED;
    this.failureCount = 0;
    this.successCount = 0;
    this.halfOpenAttempts = 0;
    this.emit('stateChange', CircuitState.CLOSED);
  }
}

export class RetryManager {
  /**
   * Execute function with retry logic
   */
  static async executeWithRetry<T>(
    fn: () => Promise<T>,
    options: RetryOptions,
    onRetry?: (attempt: number, error: Error) => void
  ): Promise<T> {
    let lastError: Error;
    let backoffMs = options.backoffMs;

    for (let attempt = 0; attempt <= options.maxRetries; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error as Error;
        
        if (attempt < options.maxRetries) {
          if (onRetry) {
            onRetry(attempt + 1, error as Error);
          }

          // Calculate backoff
          const delay = options.exponentialBackoff
            ? Math.min(backoffMs * Math.pow(2, attempt), options.maxBackoffMs)
            : backoffMs;

          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    throw lastError!;
  }

  /**
   * Execute with timeout
   */
  static async executeWithTimeout<T>(
    fn: () => Promise<T>,
    timeoutMs: number
  ): Promise<T> {
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error(`Operation timed out after ${timeoutMs}ms`)), timeoutMs);
    });

    return Promise.race([fn(), timeoutPromise]);
  }
}

export class ErrorRecoverySystem {
  private circuitBreakers: Map<string, CircuitBreaker> = new Map();
  private errorCounts: Map<string, number> = new Map();
  private recoveryStrategies: Map<string, () => Promise<void>> = new Map();

  constructor() {
    this.initializeCircuitBreakers();
    this.registerRecoveryStrategies();
  }

  /**
   * Initialize circuit breakers for critical components
   */
  private initializeCircuitBreakers(): void {
    // Database circuit breaker
    this.createCircuitBreaker('database', {
      failureThreshold: 5,
      resetTimeout: 60000,
      monitoringPeriod: 60000,
      halfOpenMaxAttempts: 3,
    });

    // LLM provider circuit breakers
    Object.keys(PRODUCTION_CONFIG.llmProviders).forEach(provider => {
      this.createCircuitBreaker(`llm-${provider}`, {
        failureThreshold: 10,
        resetTimeout: 30000,
        monitoringPeriod: 60000,
        halfOpenMaxAttempts: 2,
      });
    });

    // Service circuit breakers
    Object.keys(PRODUCTION_CONFIG.services).forEach(service => {
      this.createCircuitBreaker(`service-${service}`, {
        failureThreshold: 5,
        resetTimeout: 30000,
        monitoringPeriod: 60000,
        halfOpenMaxAttempts: 2,
      });
    });
  }

  /**
   * Create a circuit breaker
   */
  private createCircuitBreaker(name: string, options: CircuitBreakerOptions): void {
    const breaker = new CircuitBreaker(name, options);
    
    breaker.on('stateChange', (state: CircuitState) => {
      this.handleCircuitStateChange(name, state);
    });

    this.circuitBreakers.set(name, breaker);
  }

  /**
   * Register recovery strategies
   */
  private registerRecoveryStrategies(): void {
    // Database recovery
    this.recoveryStrategies.set('database', async () => {
      console.log('Attempting database recovery...');
      // Implement database connection pool reset
      // Clear prepared statements
      // Reconnect with fresh connections
    });

    // LLM provider recovery
    Object.keys(PRODUCTION_CONFIG.llmProviders).forEach(provider => {
      this.recoveryStrategies.set(`llm-${provider}`, async () => {
        console.log(`Attempting ${provider} recovery...`);
        // Rotate API keys
        // Clear rate limit counters
        // Switch to backup endpoints
      });
    });

    // Service recovery
    Object.keys(PRODUCTION_CONFIG.services).forEach(service => {
      this.recoveryStrategies.set(`service-${service}`, async () => {
        console.log(`Attempting ${service} recovery...`);
        // Restart service
        // Clear caches
        // Reset connections
      });
    });
  }

  /**
   * Handle circuit state changes
   */
  private handleCircuitStateChange(name: string, state: CircuitState): void {
    console.log(`Circuit ${name} state changed to ${state}`);

    if (state === CircuitState.OPEN) {
      // Attempt recovery
      const strategy = this.recoveryStrategies.get(name);
      if (strategy) {
        strategy().catch(error => {
          console.error(`Recovery failed for ${name}:`, error);
        });
      }

      // Alert operations team
      this.sendOperationalAlert(name, state);
    }
  }

  /**
   * Execute with circuit breaker protection
   */
  async executeWithProtection<T>(
    componentName: string,
    fn: () => Promise<T>
  ): Promise<T> {
    const breaker = this.circuitBreakers.get(componentName);
    
    if (!breaker) {
      // No circuit breaker, execute directly
      return fn();
    }

    return breaker.execute(fn);
  }

  /**
   * Execute with full protection (circuit breaker + retry + timeout)
   */
  async executeWithFullProtection<T>(
    componentName: string,
    fn: () => Promise<T>,
    options?: {
      timeout?: number;
      retryOptions?: RetryOptions;
    }
  ): Promise<T> {
    const breaker = this.circuitBreakers.get(componentName);
    const serviceConfig = PRODUCTION_CONFIG.services[componentName];
    
    const retryOptions = options?.retryOptions || {
      maxRetries: serviceConfig?.retryPolicy.maxRetries || 3,
      backoffMs: serviceConfig?.retryPolicy.backoffMs || 1000,
      maxBackoffMs: serviceConfig?.retryPolicy.maxBackoffMs || 30000,
      exponentialBackoff: true,
    };

    const timeout = options?.timeout || 30000;

    const executeWithBreaker = async () => {
      if (breaker) {
        return breaker.execute(() => RetryManager.executeWithTimeout(fn, timeout));
      }
      return RetryManager.executeWithTimeout(fn, timeout);
    };

    return RetryManager.executeWithRetry(
      executeWithBreaker,
      retryOptions,
      (attempt, error) => {
        console.log(`Retry attempt ${attempt} for ${componentName}:`, error.message);
        this.recordError(componentName, error);
      }
    );
  }

  /**
   * Record error for tracking
   */
  private recordError(componentName: string, error: Error): void {
    const count = this.errorCounts.get(componentName) || 0;
    this.errorCounts.set(componentName, count + 1);

    // Log to monitoring system
    console.error(`Error in ${componentName}:`, error);
  }

  /**
   * Send operational alert
   */
  private sendOperationalAlert(componentName: string, state: CircuitState): void {
    // Implement actual alerting
    console.error(`OPERATIONAL ALERT: ${componentName} circuit is ${state}`);
  }

  /**
   * Get system resilience metrics
   */
  getResilienceMetrics(): any {
    const metrics = {
      circuitBreakers: {},
      errorCounts: Object.fromEntries(this.errorCounts),
      summary: {
        totalErrors: Array.from(this.errorCounts.values()).reduce((a, b) => a + b, 0),
        openCircuits: 0,
        halfOpenCircuits: 0,
      },
    };

    this.circuitBreakers.forEach((breaker, name) => {
      const state = breaker.getState();
      metrics.circuitBreakers[name] = state;
      
      if (state === CircuitState.OPEN) {
        metrics.summary.openCircuits++;
      } else if (state === CircuitState.HALF_OPEN) {
        metrics.summary.halfOpenCircuits++;
      }
    });

    return metrics;
  }

  /**
   * Reset all circuit breakers (use with caution)
   */
  resetAllCircuits(): void {
    this.circuitBreakers.forEach(breaker => breaker.reset());
    this.errorCounts.clear();
  }
}

// Export singleton instance
export const errorRecoverySystem = new ErrorRecoverySystem();