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
  HealthStatus,
  IndustryConfig
} from './types';

export class IndustryIntelligenceService {
  private foundationConfig: FoundationConfig | null = null;
  private benchmarkConfig: JoltBenchmarkConfig | null = null;
  private startTime: number;
  private version: string = '1.0.0';
  private industryConfig: IndustryConfig | null = null;

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
    // Load industry mapping configuration
    const industryPath = path.join(__dirname, '../config/industry-mapping.json');
    const industryData = fs.readFileSync(industryPath, 'utf8');
    this.industryConfig = JSON.parse(industryData) as IndustryConfig;
    console.log(`📋 Loaded foundation config: ${Object.keys(this.industryConfig.industries).length} industries`);

    // Load JOLT benchmark configuration  
    const benchmarkPath = path.join(__dirname, '../config/jolt-benchmarks.json');
    const benchmarkData = fs.readFileSync(benchmarkPath, 'utf8');
    this.benchmarkConfig = JSON.parse(benchmarkData) as JoltBenchmarkConfig;
    console.log(`📊 Loaded benchmark config: ${Object.keys(this.benchmarkConfig.jolt_cases).length} JOLT cases`);
  }

  // ============================================================================
  // FOUNDATIONAL DATA ACCESS
  // ============================================================================

  getIndustries(): Record<string, Industry> {
    this.ensureInitialized();
    return this.industryConfig!.industries;
  }

  getIndustry(industryKey: string): Industry | null {
    this.ensureInitialized();
    return this.industryConfig!.industries[industryKey] || null;
  }

  getJoltBenchmarks(): Record<string, any> {
    this.ensureInitialized();
    return this.benchmarkConfig!.jolt_cases;
  }

  getJoltBenchmark(domain: string): any | null {
    this.ensureInitialized();
    return this.benchmarkConfig!.jolt_cases[domain] || null;
  }

  // Industry benchmarks are now derived from JOLT cases
  getIndustryBenchmarks(): Record<string, any> {
    this.ensureInitialized();
    const industries: Record<string, any> = {};
    
    for (const [domain, caseData] of Object.entries(this.benchmarkConfig!.jolt_cases)) {
      const industry = caseData.metadata.industry;
      if (!industries[industry]) {
        industries[industry] = [];
      }
      industries[industry].push({
        domain,
        ...caseData
      });
    }
    
    return industries;
  }

  getIndustryBenchmark(industryKey: string): any[] {
    this.ensureInitialized();
    const allBenchmarks = this.getIndustryBenchmarks();
    return allBenchmarks[industryKey] || [];
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
    const joltCases = this.benchmarkConfig!.jolt_cases;
    return domain in joltCases && joltCases[domain].is_jolt;
  }

  getJoltMetadata(domain: string): any | null {
    this.ensureInitialized();
    const joltCase = this.benchmarkConfig!.jolt_cases[domain];
    return joltCase ? joltCase.metadata : null;
  }

  getAdditionalPromptCount(domain: string): number {
    this.ensureInitialized();
    const joltCase = this.benchmarkConfig!.jolt_cases[domain];
    return joltCase ? joltCase.additional_prompts : 0;
  }

  // ============================================================================
  // FOUNDATIONAL COMPARISON METHODS
  // ============================================================================

  compareToBenchmarks(domain: string, currentScore: number, industry: string): JoltComparison[] {
    this.ensureInitialized();
    const joltCases = this.benchmarkConfig!.jolt_cases;
    const comparisons: JoltComparison[] = [];

    for (const [caseDomain, caseData] of Object.entries(joltCases)) {
      if (caseData.metadata.industry === industry) {
        const benchmarkScore = caseData.metadata.baseline_memory_score;
        if (benchmarkScore !== undefined) {
          comparisons.push({
            benchmark_name: caseDomain,
            score_difference: currentScore - benchmarkScore,
            similarity_factors: this.calculateSimilarityFactors(domain, caseData),
            outcome_prediction: this.predictOutcome(currentScore, benchmarkScore, caseData)
          });
        }
      }
    }

    return comparisons.sort((a, b) => Math.abs(a.score_difference) - Math.abs(b.score_difference));
  }

  private calculateSimilarityFactors(domain: string, caseData: any): string[] {
    const factors: string[] = [];
    
    // Basic similarity factors (foundational implementation)
    factors.push(`Same industry: ${caseData.metadata.industry}`);
    factors.push(`Transition type: ${caseData.metadata.type}`);
    factors.push(`Severity: ${caseData.metadata.severity}`);
    
    return factors;
  }

  private predictOutcome(currentScore: number, benchmarkScore: number, caseData: any): string {
    const difference = currentScore - benchmarkScore;
    
    if (Math.abs(difference) < 5) {
      return `Similar trajectory to ${caseData.metadata.description}`;
    } else if (difference > 0) {
      return `Performing better than ${caseData.metadata.description} by ${difference.toFixed(1)} points`;
    } else {
      return `Underperforming vs ${caseData.metadata.description} by ${Math.abs(difference).toFixed(1)} points`;
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
      config_loaded: this.industryConfig !== null,
      benchmarks_loaded: this.benchmarkConfig !== null,
      uptime: Math.floor(uptime / 1000)
    };
  }

  private isHealthy(): boolean {
    return this.industryConfig !== null && this.benchmarkConfig !== null;
  }

  // ============================================================================
  // UTILITIES
  // ============================================================================

  private ensureInitialized(): void {
    if (!this.industryConfig || !this.benchmarkConfig) {
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