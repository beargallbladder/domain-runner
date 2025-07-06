"use strict";
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
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const dotenv = __importStar(require("dotenv"));
const database_1 = require("./database");
const providers_1 = require("./providers");
dotenv.config();
const app = (0, express_1.default)();
const PORT = process.env.PORT || 10000;
app.use((0, cors_1.default)());
app.use(express_1.default.json());
let isProcessing = false;
let startTime = Date.now();
let totalProcessed = 0;
app.get('/health', async (req, res) => {
    try {
        const dbConnected = await (0, database_1.testConnection)();
        const configuredProviders = (0, providers_1.getConfiguredProviders)();
        const uptime = Math.floor((Date.now() - startTime) / 1000);
        res.json({
            status: 'OK',
            service: 'LLM Memory Runner',
            version: '1.0.0',
            uptime_seconds: uptime,
            database_connected: dbConnected,
            providers_configured: configuredProviders.length,
            providers: configuredProviders,
            currently_processing: isProcessing,
            total_processed: totalProcessed,
            timestamp: new Date().toISOString()
        });
    }
    catch (error) {
        res.status(500).json({
            status: 'ERROR',
            error: 'Health check failed',
            timestamp: new Date().toISOString()
        });
    }
});
app.get('/stats', async (req, res) => {
    try {
        const stats = await (0, database_1.getStats)();
        const configuredProviders = (0, providers_1.getConfiguredProviders)();
        res.json({
            service: 'LLM Memory Runner',
            total_requests: stats.totalResponses,
            successful_requests: stats.totalResponses - stats.recentErrors,
            failed_requests: stats.recentErrors,
            providers_configured: configuredProviders.length,
            responses_by_provider: stats.responsesByProvider,
            currently_processing: isProcessing,
            total_processed: totalProcessed,
            timestamp: new Date().toISOString()
        });
    }
    catch (error) {
        res.status(500).json({
            error: 'Failed to get stats',
            timestamp: new Date().toISOString()
        });
    }
});
app.post('/process-domains', async (req, res) => {
    if (isProcessing) {
        return res.status(429).json({
            error: 'Already processing domains',
            message: 'Wait for current batch to complete'
        });
    }
    try {
        isProcessing = true;
        const limit = req.body.limit || 5;
        console.log(`🚀 Starting domain processing batch (limit: ${limit})`);
        const domains = await (0, database_1.getDomainsToProcess)(limit);
        if (domains.length === 0) {
            isProcessing = false;
            return res.json({
                message: 'No domains to process',
                processed: 0
            });
        }
        processDomainsAsync(domains);
        res.json({
            message: `Started processing ${domains.length} domains`,
            domains: domains,
            estimated_time_minutes: domains.length * 2
        });
    }
    catch (error) {
        isProcessing = false;
        console.error('❌ Process domains error:', error);
        res.status(500).json({
            error: 'Failed to start processing',
            message: 'Check server logs for details'
        });
    }
});
app.post('/test-domain', async (req, res) => {
    const { domain } = req.body;
    if (!domain) {
        return res.status(400).json({
            error: 'Domain required',
            message: 'Provide domain in request body'
        });
    }
    try {
        console.log(`🧪 Testing single domain: ${domain}`);
        await (0, providers_1.processAllProviders)(domain);
        res.json({
            message: `Successfully processed ${domain}`,
            domain: domain,
            providers: (0, providers_1.getConfiguredProviders)().length
        });
    }
    catch (error) {
        console.error(`❌ Test domain error for ${domain}:`, error);
        res.status(500).json({
            error: 'Failed to process domain',
            domain: domain
        });
    }
});
async function processDomainsAsync(domains) {
    try {
        console.log(`🔄 Processing ${domains.length} domains with all providers`);
        for (const domain of domains) {
            try {
                await (0, providers_1.processAllProviders)(domain);
                totalProcessed++;
                console.log(`✅ Completed ${domain} (${totalProcessed} total)`);
                await new Promise(resolve => setTimeout(resolve, 2000));
            }
            catch (error) {
                console.error(`❌ Failed to process ${domain}:`, error);
            }
        }
        console.log(`🎉 Batch complete! Processed ${domains.length} domains`);
    }
    catch (error) {
        console.error('❌ Batch processing error:', error);
    }
    finally {
        isProcessing = false;
    }
}
async function startServer() {
    try {
        console.log('🔧 Initializing LLM Memory Runner...');
        const dbConnected = await (0, database_1.testConnection)();
        if (!dbConnected) {
            throw new Error('Database connection failed');
        }
        await (0, database_1.initializeSchema)();
        const configuredProviders = (0, providers_1.getConfiguredProviders)();
        console.log(`✅ Configured providers: ${configuredProviders.join(', ')}`);
        if (configuredProviders.length === 0) {
            console.warn('⚠️ No AI providers configured! Set API keys in environment variables.');
        }
        app.listen(PORT, () => {
            console.log(`🚀 LLM Memory Runner running on port ${PORT}`);
            console.log(`📊 Health check: http://localhost:${PORT}/health`);
            console.log(`📈 Stats: http://localhost:${PORT}/stats`);
            console.log(`✅ Ready to process domains with ${configuredProviders.length} providers!`);
        });
    }
    catch (error) {
        console.error('❌ Failed to start server:', error);
        process.exit(1);
    }
}
process.on('SIGTERM', () => {
    console.log('🛑 Received SIGTERM, shutting down gracefully...');
    process.exit(0);
});
process.on('SIGINT', () => {
    console.log('🛑 Received SIGINT, shutting down gracefully...');
    process.exit(0);
});
startServer();
