"use strict";
// ============================================================================
// INDUSTRY INTELLIGENCE - FOUNDATIONAL API SERVER
// ============================================================================
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
const IndustryIntelligenceService_1 = require("./IndustryIntelligenceService");
dotenv_1.default.config();
const app = (0, express_1.default)();
const PORT = process.env.PORT || 10001;
const service = new IndustryIntelligenceService_1.IndustryIntelligenceService();
// Middleware
app.use((0, cors_1.default)());
app.use(express_1.default.json());
// ============================================================================
// FOUNDATIONAL API ENDPOINTS
// ============================================================================
// Health check
app.get('/health', (req, res) => {
    const health = service.getHealthStatus();
    res.json(health);
});
// Service info
app.get('/', (req, res) => {
    res.json({
        service: 'Industry Intelligence',
        version: service.getVersion(),
        description: 'Foundational service for industry mapping, benchmark analysis, and strategic domain targeting',
        uptime: service.getUptime(),
        endpoints: {
            health: '/health',
            industries: '/industries',
            benchmarks: '/benchmarks',
            jolt: '/jolt/*',
            analysis: '/analysis/*'
        }
    });
});
// Get all industries
app.get('/industries', (req, res) => {
    try {
        const industries = service.getIndustries();
        const response = {
            success: true,
            data: industries,
            timestamp: new Date().toISOString(),
            version: service.getVersion()
        };
        res.json(response);
    }
    catch (error) {
        const response = {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
            timestamp: new Date().toISOString(),
            version: service.getVersion()
        };
        res.status(500).json(response);
    }
});
// Get specific industry
app.get('/industries/:industryKey', (req, res) => {
    try {
        const { industryKey } = req.params;
        const industry = service.getIndustry(industryKey);
        if (!industry) {
            const response = {
                success: false,
                error: `Industry '${industryKey}' not found`,
                timestamp: new Date().toISOString(),
                version: service.getVersion()
            };
            res.status(404).json(response);
            return;
        }
        const response = {
            success: true,
            data: industry,
            timestamp: new Date().toISOString(),
            version: service.getVersion()
        };
        res.json(response);
    }
    catch (error) {
        const response = {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
            timestamp: new Date().toISOString(),
            version: service.getVersion()
        };
        res.status(500).json(response);
    }
});
// Get all JOLT benchmarks
app.get('/benchmarks', (req, res) => {
    try {
        const benchmarks = service.getJoltBenchmarks();
        const response = {
            success: true,
            data: benchmarks,
            timestamp: new Date().toISOString(),
            version: service.getVersion()
        };
        res.json(response);
    }
    catch (error) {
        const response = {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
            timestamp: new Date().toISOString(),
            version: service.getVersion()
        };
        res.status(500).json(response);
    }
});
// Get industry benchmarks
app.get('/benchmarks/industry/:industryKey', (req, res) => {
    try {
        const { industryKey } = req.params;
        const benchmark = service.getIndustryBenchmark(industryKey);
        if (!benchmark) {
            const response = {
                success: false,
                error: `Industry benchmark for '${industryKey}' not found`,
                timestamp: new Date().toISOString(),
                version: service.getVersion()
            };
            res.status(404).json(response);
            return;
        }
        const response = {
            success: true,
            data: benchmark,
            timestamp: new Date().toISOString(),
            version: service.getVersion()
        };
        res.json(response);
    }
    catch (error) {
        const response = {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
            timestamp: new Date().toISOString(),
            version: service.getVersion()
        };
        res.status(500).json(response);
    }
});
// Check if domain is JOLT domain
app.get('/jolt/check/:domain', (req, res) => {
    try {
        const { domain } = req.params;
        const isJolt = service.isJoltDomain(domain);
        const metadata = isJolt ? service.getJoltMetadata(domain) : null;
        const additionalPrompts = service.getAdditionalPromptCount(domain);
        const data = {
            domain,
            is_jolt: isJolt,
            additional_prompts: additionalPrompts,
            metadata
        };
        const response = {
            success: true,
            data,
            timestamp: new Date().toISOString(),
            version: service.getVersion()
        };
        res.json(response);
    }
    catch (error) {
        const response = {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
            timestamp: new Date().toISOString(),
            version: service.getVersion()
        };
        res.status(500).json(response);
    }
});
// Get all JOLT domains
app.get('/jolt/domains', (req, res) => {
    try {
        const benchmarks = service.getJoltBenchmarks();
        const joltDomains = [];
        Object.values(benchmarks).forEach(benchmark => {
            joltDomains.push(benchmark.old_domain);
            if (benchmark.new_domain) {
                joltDomains.push(benchmark.new_domain);
            }
        });
        const data = {
            count: joltDomains.length,
            domains: joltDomains.sort()
        };
        const response = {
            success: true,
            data,
            timestamp: new Date().toISOString(),
            version: service.getVersion()
        };
        res.json(response);
    }
    catch (error) {
        const response = {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
            timestamp: new Date().toISOString(),
            version: service.getVersion()
        };
        res.status(500).json(response);
    }
});
// Compare domain to benchmarks
app.post('/analysis/compare', (req, res) => {
    try {
        const { domain, current_score, industry } = req.body;
        if (!domain || current_score === undefined || !industry) {
            const response = {
                success: false,
                error: 'Missing required fields: domain, current_score, industry',
                timestamp: new Date().toISOString(),
                version: service.getVersion()
            };
            res.status(400).json(response);
            return;
        }
        const comparisons = service.compareToBenchmarks(domain, current_score, industry);
        const industryBenchmark = service.getIndustryBenchmark(industry);
        const data = {
            domain,
            current_score,
            industry,
            comparisons,
            industry_benchmark: industryBenchmark
        };
        const response = {
            success: true,
            data,
            timestamp: new Date().toISOString(),
            version: service.getVersion()
        };
        res.json(response);
    }
    catch (error) {
        const response = {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
            timestamp: new Date().toISOString(),
            version: service.getVersion()
        };
        res.status(500).json(response);
    }
});
// ============================================================================
// SERVER INITIALIZATION
// ============================================================================
async function startServer() {
    try {
        console.log('🚀 Starting Industry Intelligence Service...');
        // Initialize the service
        await service.initialize();
        // Start the server
        app.listen(PORT, () => {
            console.log(`🌐 Industry Intelligence Service running on port ${PORT}`);
            console.log(`📊 Health: http://localhost:${PORT}/health`);
            console.log(`🏭 Industries: http://localhost:${PORT}/industries`);
            console.log(`⚡ JOLT Check: http://localhost:${PORT}/jolt/check/facebook.com`);
            console.log('✅ Foundational service ready!');
        });
    }
    catch (error) {
        console.error('❌ Failed to start Industry Intelligence Service:', error);
        process.exit(1);
    }
}
// Handle graceful shutdown
process.on('SIGTERM', () => {
    console.log('🛑 Received SIGTERM, shutting down gracefully...');
    process.exit(0);
});
process.on('SIGINT', () => {
    console.log('🛑 Received SIGINT, shutting down gracefully...');
    process.exit(0);
});
// Start the server
startServer();
//# sourceMappingURL=index.js.map