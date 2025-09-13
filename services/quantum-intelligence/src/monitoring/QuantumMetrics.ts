export class QuantumMetrics {
  private metrics: {
    calculations: number;
    cacheHits: number;
    cacheMisses: number;
    errors: Map<string, number>;
    calculationTimes: number[];
    startTime: number;
  };

  constructor() {
    this.metrics = {
      calculations: 0,
      cacheHits: 0,
      cacheMisses: 0,
      errors: new Map(),
      calculationTimes: [],
      startTime: Date.now()
    };
  }

  recordCalculationTime(timeMs: number): void {
    this.metrics.calculations++;
    this.metrics.calculationTimes.push(timeMs);
    
    // Keep only last 1000 times to prevent memory growth
    if (this.metrics.calculationTimes.length > 1000) {
      this.metrics.calculationTimes.shift();
    }
  }

  recordCacheHit(): void {
    this.metrics.cacheHits++;
  }

  recordCacheMiss(): void {
    this.metrics.cacheMisses++;
  }

  recordError(errorType: string): void {
    const count = this.metrics.errors.get(errorType) || 0;
    this.metrics.errors.set(errorType, count + 1);
  }

  getSnapshot(): any {
    const times = this.metrics.calculationTimes;
    const avgTime = times.length > 0 
      ? times.reduce((a, b) => a + b, 0) / times.length 
      : 0;
    
    const cacheTotal = this.metrics.cacheHits + this.metrics.cacheMisses;
    const cacheHitRate = cacheTotal > 0 
      ? this.metrics.cacheHits / cacheTotal 
      : 0;

    return {
      totalCalculations: this.metrics.calculations,
      averageCalculationTimeMs: Math.round(avgTime),
      cacheHitRate: Math.round(cacheHitRate * 100) / 100,
      errorCount: Array.from(this.metrics.errors.values()).reduce((a, b) => a + b, 0),
      errorTypes: Object.fromEntries(this.metrics.errors),
      uptimeSeconds: Math.floor((Date.now() - this.metrics.startTime) / 1000)
    };
  }

  async flush(): Promise<void> {
    // In production, would send metrics to monitoring service
    const snapshot = this.getSnapshot();
    console.log('Quantum Metrics Final:', snapshot);
  }
}