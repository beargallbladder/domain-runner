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
        this.industryConfig = null;
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
        // Load industry mapping configuration
        const industryPath = path.join(__dirname, '../config/industry-mapping.json');
        const industryData = fs.readFileSync(industryPath, 'utf8');
        this.industryConfig = JSON.parse(industryData);
        console.log(`📋 Loaded foundation config: ${Object.keys(this.industryConfig.industries).length} industries`);
        // Load JOLT benchmark configuration  
        const benchmarkPath = path.join(__dirname, '../config/jolt-benchmarks.json');
        const benchmarkData = fs.readFileSync(benchmarkPath, 'utf8');
        this.benchmarkConfig = JSON.parse(benchmarkData);
        console.log(`📊 Loaded benchmark config: ${Object.keys(this.benchmarkConfig.jolt_cases).length} JOLT cases`);
    }
    // ============================================================================
    // FOUNDATIONAL DATA ACCESS
    // ============================================================================
    getIndustries() {
        this.ensureInitialized();
        return this.industryConfig.industries;
    }
    getIndustry(industryKey) {
        this.ensureInitialized();
        return this.industryConfig.industries[industryKey] || null;
    }
    getJoltBenchmarks() {
        this.ensureInitialized();
        return this.benchmarkConfig.jolt_cases;
    }
    getJoltBenchmark(domain) {
        this.ensureInitialized();
        return this.benchmarkConfig.jolt_cases[domain] || null;
    }
    // Industry benchmarks are now derived from JOLT cases
    getIndustryBenchmarks() {
        this.ensureInitialized();
        const industries = {};
        for (const [domain, caseData] of Object.entries(this.benchmarkConfig.jolt_cases)) {
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
    getIndustryBenchmark(industryKey) {
        this.ensureInitialized();
        const allBenchmarks = this.getIndustryBenchmarks();
        return allBenchmarks[industryKey] || [];
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
        const joltCases = this.benchmarkConfig.jolt_cases;
        return domain in joltCases && joltCases[domain].is_jolt;
    }
    getJoltMetadata(domain) {
        this.ensureInitialized();
        const joltCase = this.benchmarkConfig.jolt_cases[domain];
        return joltCase ? joltCase.metadata : null;
    }
    getAdditionalPromptCount(domain) {
        this.ensureInitialized();
        const joltCase = this.benchmarkConfig.jolt_cases[domain];
        return joltCase ? joltCase.additional_prompts : 0;
    }
    // ============================================================================
    // FOUNDATIONAL COMPARISON METHODS
    // ============================================================================
    compareToBenchmarks(domain, currentScore, industry) {
        this.ensureInitialized();
        const joltCases = this.benchmarkConfig.jolt_cases;
        const comparisons = [];
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
    calculateSimilarityFactors(domain, caseData) {
        const factors = [];
        // Basic similarity factors (foundational implementation)
        factors.push(`Same industry: ${caseData.metadata.industry}`);
        factors.push(`Transition type: ${caseData.metadata.type}`);
        factors.push(`Severity: ${caseData.metadata.severity}`);
        return factors;
    }
    predictOutcome(currentScore, benchmarkScore, caseData) {
        const difference = currentScore - benchmarkScore;
        if (Math.abs(difference) < 5) {
            return `Similar trajectory to ${caseData.metadata.description}`;
        }
        else if (difference > 0) {
            return `Performing better than ${caseData.metadata.description} by ${difference.toFixed(1)} points`;
        }
        else {
            return `Underperforming vs ${caseData.metadata.description} by ${Math.abs(difference).toFixed(1)} points`;
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
            config_loaded: this.industryConfig !== null,
            benchmarks_loaded: this.benchmarkConfig !== null,
            uptime: Math.floor(uptime / 1000)
        };
    }
    isHealthy() {
        return this.industryConfig !== null && this.benchmarkConfig !== null;
    }
    // ============================================================================
    // UTILITIES
    // ============================================================================
    ensureInitialized() {
        if (!this.industryConfig || !this.benchmarkConfig) {
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