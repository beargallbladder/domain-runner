import { Industry, JoltComparison, HealthStatus } from './types';
export declare class IndustryIntelligenceService {
    private foundationConfig;
    private benchmarkConfig;
    private startTime;
    private version;
    private industryConfig;
    constructor();
    initialize(): Promise<void>;
    private loadConfigurations;
    getIndustries(): Record<string, Industry>;
    getIndustry(industryKey: string): Industry | null;
    getJoltBenchmarks(): Record<string, any>;
    getJoltBenchmark(domain: string): any | null;
    getIndustryBenchmarks(): Record<string, any>;
    getIndustryBenchmark(industryKey: string): any[];
    classifyDomain(domain: string): {
        industry: string;
        sector: string;
        confidence: number;
    } | null;
    isJoltDomain(domain: string): boolean;
    getJoltMetadata(domain: string): any | null;
    getAdditionalPromptCount(domain: string): number;
    compareToBenchmarks(domain: string, currentScore: number, industry: string): JoltComparison[];
    private calculateSimilarityFactors;
    private predictOutcome;
    getHealthStatus(): HealthStatus;
    private isHealthy;
    private ensureInitialized;
    getVersion(): string;
    getUptime(): number;
}
//# sourceMappingURL=IndustryIntelligenceService.d.ts.map