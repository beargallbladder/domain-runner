"use strict";
// ============================================================================
// INDUSTRY INTELLIGENCE - FOUNDATIONAL SERVICE CLASS
// ============================================================================
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.IndustryIntelligenceService = void 0;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
class IndustryIntelligenceService {
    constructor() {
        this.foundationConfig = null;
        this.benchmarkConfig = null;
        this.version = '1.0.0';
        this.startTime = Date.now();
    }
    // ============================================================================
    // INITIALIZATION & CONFIGURATION
    // ============================================================================
    async initialize() {
        console.log('🚀 Initializing Industry Intelligence Service...');
        try {
            await this.loadConfigurations();
            console.log('✅ Industry Intelligence Service initialized successfully');
        }
        catch (error) {
            console.error('❌ Failed to initialize Industry Intelligence Service:', error);
            throw error;
        }
    }
    async loadConfigurations() {
        const configDir = path.join(__dirname, '..', 'config');
        // Load foundation configuration
        const foundationPath = path.join(configDir, 'industry-mapping.json');
        const foundationData = fs.readFileSync(foundationPath, 'utf8');
        this.foundationConfig = JSON.parse(foundationData);
        console.log(`📋 Loaded foundation config: ${Object.keys(this.foundationConfig.industries).length} industries`);
        // Load benchmark configuration  
        const benchmarkPath = path.join(configDir, 'jolt-benchmarks.json');
        const benchmarkData = fs.readFileSync(benchmarkPath, 'utf8');
        this.benchmarkConfig = JSON.parse(benchmarkData);
        console.log(`📊 Loaded benchmark config: ${Object.keys(this.benchmarkConfig.jolt_benchmarks).length} JOLT cases`);
    }
    // ============================================================================
    // FOUNDATIONAL DATA ACCESS
    // ============================================================================
    getIndustries() {
        this.ensureInitialized();
        return this.foundationConfig.industries;
    }
    getIndustry(industryKey) {
        this.ensureInitialized();
        return this.foundationConfig.industries[industryKey] || null;
    }
    getJoltBenchmarks() {
        this.ensureInitialized();
        return this.benchmarkConfig.jolt_benchmarks;
    }
    getJoltBenchmark(benchmarkKey) {
        this.ensureInitialized();
        return this.benchmarkConfig.jolt_benchmarks[benchmarkKey] || null;
    }
    getIndustryBenchmarks() {
        this.ensureInitialized();
        return this.benchmarkConfig.industry_benchmarks;
    }
    getIndustryBenchmark(industryKey) {
        this.ensureInitialized();
        return this.benchmarkConfig.industry_benchmarks[industryKey] || null;
    }
    // ============================================================================
    // FOUNDATIONAL ANALYSIS METHODS
    // ============================================================================
    classifyDomain(domain) {
        // This is a foundational stub - will be enhanced later
        // For now, return null to indicate classification not implemented
        return null;
    }
    isJoltDomain(domain) {
        this.ensureInitialized();
        const benchmarks = this.getJoltBenchmarks();
        for (const benchmark of Object.values(benchmarks)) {
            if (benchmark.old_domain === domain || benchmark.new_domain === domain) {
                return true;
            }
        }
        return false;
    }
    getJoltMetadata(domain) {
        this.ensureInitialized();
        const benchmarks = this.getJoltBenchmarks();
        for (const benchmark of Object.values(benchmarks)) {
            if (benchmark.old_domain === domain || benchmark.new_domain === domain) {
                return benchmark;
            }
        }
        return null;
    }
    getAdditionalPromptCount(domain) {
        const joltData = this.getJoltMetadata(domain);
        if (!joltData)
            return 0;
        const criteria = this.foundationConfig?.jolt_criteria[joltData.type];
        return criteria?.additional_prompts || 0;
    }
    // ============================================================================
    // FOUNDATIONAL COMPARISON METHODS
    // ============================================================================
    compareToBenchmarks(domain, currentScore, industry) {
        this.ensureInitialized();
        const benchmarks = this.getJoltBenchmarks();
        const comparisons = [];
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
    getBenchmarkScore(benchmark) {
        // Get the primary score from the benchmark
        const scores = Object.values(benchmark.current_scores);
        const validScores = scores.filter(score => score !== null);
        return validScores.length > 0 ? validScores[0] : null;
    }
    calculateSimilarityFactors(domain, benchmark) {
        const factors = [];
        // Basic similarity factors (foundational implementation)
        factors.push(`Same industry: ${benchmark.industry}`);
        factors.push(`Transition type: ${benchmark.type}`);
        factors.push(`Severity: ${benchmark.severity}`);
        return factors;
    }
    predictOutcome(currentScore, benchmarkScore, benchmark) {
        const difference = currentScore - benchmarkScore;
        if (Math.abs(difference) < 5) {
            return `Similar trajectory to ${benchmark.old_domain}`;
        }
        else if (difference > 0) {
            return `Performing better than ${benchmark.old_domain} by ${difference.toFixed(1)} points`;
        }
        else {
            return `Underperforming vs ${benchmark.old_domain} by ${Math.abs(difference).toFixed(1)} points`;
        }
    }
    // ============================================================================
    // HEALTH & STATUS
    // ============================================================================
    getHealthStatus() {
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
    isHealthy() {
        return this.foundationConfig !== null && this.benchmarkConfig !== null;
    }
    // ============================================================================
    // UTILITIES
    // ============================================================================
    ensureInitialized() {
        if (!this.foundationConfig || !this.benchmarkConfig) {
            throw new Error('Industry Intelligence Service not initialized. Call initialize() first.');
        }
    }
    getVersion() {
        return this.version;
    }
    getUptime() {
        return Math.floor((Date.now() - this.startTime) / 1000);
    }
}
exports.IndustryIntelligenceService = IndustryIntelligenceService;
//# sourceMappingURL=IndustryIntelligenceService.js.map