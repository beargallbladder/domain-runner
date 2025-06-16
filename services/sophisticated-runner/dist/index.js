"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const cache_population_scheduler_1 = __importDefault(require("./cache-population-scheduler"));
const app = (0, express_1.default)();
const port = process.env.PORT || 3003;
// Enable CORS for all routes
app.use((0, cors_1.default)());
app.use(express_1.default.json());
console.log('🚀 Starting Sophisticated Runner Service...');
// Initialize cache population scheduler
const scheduler = new cache_population_scheduler_1.default();
// Health check endpoint
app.get('/health', (req, res) => {
    res.json({
        status: 'healthy',
        service: 'sophisticated-runner',
        timestamp: new Date().toISOString(),
        version: '2.0-competitive-scoring'
    });
});
// Manual cache regeneration trigger - FIXES 100% SCORES
app.get('/trigger-cache-regen', async (req, res) => {
    try {
        console.log('🔥 MANUAL CACHE REGENERATION TRIGGERED...');
        console.log('📊 This will fix the 100% AI recall scores using competitive algorithms');
        // Run cache population with corrected scoring
        await scheduler.populateCache();
        res.json({
            success: true,
            message: 'Cache regeneration completed with corrected scoring!',
            timestamp: new Date().toISOString(),
            note: 'Microsoft and all domains should now show realistic scores (not 100%)'
        });
    }
    catch (error) {
        console.error('❌ Cache regeneration failed:', error);
        res.status(500).json({
            success: false,
            error: error?.message || 'Unknown error occurred',
            timestamp: new Date().toISOString()
        });
    }
});
// Start the cache population scheduler
scheduler.startScheduler();
app.listen(port, () => {
    console.log(`✅ Sophisticated Runner Service running on port ${port}`);
    console.log(`🔧 Manual cache regen available at: /trigger-cache-regen`);
    console.log(`🏥 Health check available at: /health`);
});
//# sourceMappingURL=index.js.map