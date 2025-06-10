// ============================================================================
// INDUSTRY INTELLIGENCE - FOUNDATIONAL SERVICE CLASS
// ============================================================================

import * as fs from 'fs';
import * as path from 'path';
import { 
  FoundationConfig, 
  JoltBenchmarkConfig, 
  Industry, 
  JoltBenchmark, 
  IndustryBenchmark,
  DomainAnalysis,
  JoltComparison,
  HealthStatus
} from './types';

export class IndustryIntelligenceService {
  private foundationConfig: FoundationConfig | null = null;
  private benchmarkConfig: JoltBenchmarkConfig | null = null;
  private startTime: number;
  private version: string = '1.0.0';

  constructor() {
    this.startTime = Date.now();
  }

  // ============================================================================
  // INITIALIZATION & CONFIGURATION
  // ============================================================================

  async initialize(): Promise<void> {
    console.log('🚀 Initializing Industry Intelligence Service...');
    
    try {
      await this.loadConfigurations();
      console.log('✅ Industry Intelligence Service initialized successfully');
    } catch (error) {
      console.error('❌ Failed to initialize Industry Intelligence Service:', error);
      throw error;
    }
  }

  private async loadConfigurations(): Promise<void> {
    const configDir = path.join(__dirname, '..', 'config');
    
    // Load foundation configuration
    const foundationPath = path.join(configDir, 'industry-mapping.json');
    const foundationData = fs.readFileSync(foundationPath, 'utf8');
    this.foundationConfig = JSON.parse(foundationData) as FoundationConfig;
    console.log(`📋 Loaded foundation config: ${Object.keys(this.foundationConfig.industries).length} industries`);

    // Load benchmark configuration  
    const benchmarkPath = path.join(configDir, 'jolt-benchmarks.json');
    const benchmarkData = fs.readFileSync(benchmarkPath, 'utf8');
    this.benchmarkConfig = JSON.parse(benchmarkData) as JoltBenchmarkConfig;
    console.log(`📊 Loaded benchmark config: ${Object.keys(this.benchmarkConfig.jolt_benchmarks).length} JOLT cases`);
  }

  // ============================================================================
  // FOUNDATIONAL DATA ACCESS
  // ============================================================================

  getIndustries(): Record<string, Industry> {
    this.ensureInitialized();
    return this.foundationConfig!.industries;
  }

  getIndustry(industryKey: string): Industry | null {
    this.ensureInitialized();
    return this.foundationConfig!.industries[industryKey] || null;
  }

  getJoltBenchmarks(): Record<string, JoltBenchmark> {
    this.ensureInitialized();
    return this.benchmarkConfig!.jolt_benchmarks;
  }

  getJoltBenchmark(benchmarkKey: string): JoltBenchmark | null {
    this.ensureInitialized();
    return this.benchmarkConfig!.jolt_benchmarks[benchmarkKey] || null;
  }

  getIndustryBenchmarks(): Record<string, IndustryBenchmark> {
    this.ensureInitialized();
    return this.benchmarkConfig!.industry_benchmarks;
  }

  getIndustryBenchmark(industryKey: string): IndustryBenchmark | null {
    this.ensureInitialized();
    return this.benchmarkConfig!.industry_benchmarks[industryKey] || null;
  }

  // ============================================================================
  // FOUNDATIONAL ANALYSIS METHODS
  // ============================================================================

  classifyDomain(domain: string): { industry: string; sector: string; confidence: number } | null {
    // This is a foundational stub - will be enhanced later
    // For now, return null to indicate classification not implemented
    return null;
  }

  isJoltDomain(domain: string): boolean {
    this.ensureInitialized();
    const benchmarks = this.getJoltBenchmarks();
    
    for (const benchmark of Object.values(benchmarks)) {
      if (benchmark.old_domain === domain || benchmark.new_domain === domain) {
        return true;
      }
    }
    
    return false;
  }

  getJoltMetadata(domain: string): JoltBenchmark | null {
    this.ensureInitialized();
    const benchmarks = this.getJoltBenchmarks();
    
    for (const benchmark of Object.values(benchmarks)) {
      if (benchmark.old_domain === domain || benchmark.new_domain === domain) {
        return benchmark;
      }
    }
    
    return null;
  }

  getAdditionalPromptCount(domain: string): number {
    const joltData = this.getJoltMetadata(domain);
    if (!joltData) return 0;
    
    const criteria = this.foundationConfig?.jolt_criteria[joltData.type];
    return criteria?.additional_prompts || 0;
  }

  // ============================================================================
  // FOUNDATIONAL COMPARISON METHODS
  // ============================================================================

  compareToBenchmarks(domain: string, currentScore: number, industry: string): JoltComparison[] {
    this.ensureInitialized();
    const benchmarks = this.getJoltBenchmarks();
    const comparisons: JoltComparison[] = [];

    for (const [key, benchmark] of Object.entries(benchmarks)) {
      if (benchmark.industry === industry) {
        const benchmarkScore = this.getBenchmarkScore(benchmark);
        if (benchmarkScore !== null) {
          comparisons.push({
            benchmark_name: key,
            score_difference: currentScore - benchmarkScore,
            similarity_factors: this.calculateSimilarityFactors(domain, benchmark),
            outcome_prediction: this.predictOutcome(currentScore, benchmarkScore, benchmark)
          });
        }
      }
    }

    return comparisons.sort((a, b) => Math.abs(a.score_difference) - Math.abs(b.score_difference));
  }

  private getBenchmarkScore(benchmark: JoltBenchmark): number | null {
    // Get the primary score from the benchmark
    const scores = Object.values(benchmark.current_scores);
    const validScores = scores.filter(score => score !== null) as number[];
    return validScores.length > 0 ? validScores[0] : null;
  }

  private calculateSimilarityFactors(domain: string, benchmark: JoltBenchmark): string[] {
    const factors: string[] = [];
    
    // Basic similarity factors (foundational implementation)
    factors.push(`Same industry: ${benchmark.industry}`);
    factors.push(`Transition type: ${benchmark.type}`);
    factors.push(`Severity: ${benchmark.severity}`);
    
    return factors;
  }

  private predictOutcome(currentScore: number, benchmarkScore: number, benchmark: JoltBenchmark): string {
    const difference = currentScore - benchmarkScore;
    
    if (Math.abs(difference) < 5) {
      return `Similar trajectory to ${benchmark.old_domain}`;
    } else if (difference > 0) {
      return `Performing better than ${benchmark.old_domain} by ${difference.toFixed(1)} points`;
    } else {
      return `Underperforming vs ${benchmark.old_domain} by ${Math.abs(difference).toFixed(1)} points`;
    }
  }

  // ============================================================================
  // HEALTH & STATUS
  // ============================================================================

  getHealthStatus(): HealthStatus {
    const uptime = Date.now() - this.startTime;
    
    return {
      status: this.isHealthy() ? 'healthy' : 'unhealthy',
      timestamp: new Date().toISOString(),
      service: 'industry-intelligence',
      version: this.version,
      config_loaded: this.foundationConfig !== null,
      benchmarks_loaded: this.benchmarkConfig !== null,
      uptime: Math.floor(uptime / 1000)
    };
  }

  private isHealthy(): boolean {
    return this.foundationConfig !== null && this.benchmarkConfig !== null;
  }

  // ============================================================================
  // UTILITIES
  // ============================================================================

  private ensureInitialized(): void {
    if (!this.foundationConfig || !this.benchmarkConfig) {
      throw new Error('Industry Intelligence Service not initialized. Call initialize() first.');
    }
  }

  getVersion(): string {
    return this.version;
  }

  getUptime(): number {
    return Math.floor((Date.now() - this.startTime) / 1000);
  }
} 