import { Industry, JoltBenchmark, IndustryBenchmark, JoltComparison, HealthStatus } from './types';
export declare class IndustryIntelligenceService {
    private foundationConfig;
    private benchmarkConfig;
    private startTime;
    private version;
    constructor();
    initialize(): Promise<void>;
    private loadConfigurations;
    getIndustries(): Record<string, Industry>;
    getIndustry(industryKey: string): Industry | null;
    getJoltBenchmarks(): Record<string, JoltBenchmark>;
    getJoltBenchmark(benchmarkKey: string): JoltBenchmark | null;
    getIndustryBenchmarks(): Record<string, IndustryBenchmark>;
    getIndustryBenchmark(industryKey: string): IndustryBenchmark | null;
    classifyDomain(domain: string): {
        industry: string;
        sector: string;
        confidence: number;
    } | null;
    isJoltDomain(domain: string): boolean;
    getJoltMetadata(domain: string): JoltBenchmark | null;
    getAdditionalPromptCount(domain: string): number;
    compareToBenchmarks(domain: string, currentScore: number, industry: string): JoltComparison[];
    private getBenchmarkScore;
    private calculateSimilarityFactors;
    private predictOutcome;
    getHealthStatus(): HealthStatus;
    private isHealthy;
    private ensureInitialized;
    getVersion(): string;
    getUptime(): number;
}
//# sourceMappingURL=IndustryIntelligenceService.d.ts.map