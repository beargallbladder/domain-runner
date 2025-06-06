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
const dotenv = __importStar(require("dotenv"));
const monitoring_1 = require("./services/monitoring");
const express_1 = __importDefault(require("express"));
const path_1 = __importDefault(require("path"));
const database_1 = require("./config/database");
// Load environment variables
dotenv.config();
// Initialize monitoring
const monitoring = monitoring_1.MonitoringService.getInstance();
// Create Express app
const app = (0, express_1.default)();
const port = process.env.PORT || 3000;
// Serve static files
app.use(express_1.default.static(path_1.default.join(__dirname, 'dashboard/public')));
// API endpoints for metrics
app.get('/api/stats', async (req, res) => {
    try {
        const timeframe = req.query.timeframe || '24h';
        const stats = await monitoring.getStats(timeframe);
        res.json(stats);
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to fetch stats' });
    }
});
// Get recent alerts
app.get('/api/alerts', async (req, res) => {
    try {
        const alerts = await (0, database_1.query)(`
      SELECT details
      FROM processing_logs
      WHERE event_type = 'alert'
      ORDER BY created_at DESC
      LIMIT 100
    `);
        res.json(alerts.rows);
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to fetch alerts' });
    }
});
// Get recent errors
app.get('/api/errors', async (req, res) => {
    try {
        const errors = await (0, database_1.query)(`
      SELECT details
      FROM processing_logs
      WHERE event_type = 'error'
      ORDER BY created_at DESC
      LIMIT 50
    `);
        res.json(errors.rows);
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to fetch errors' });
    }
});
// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ status: 'ok' });
});
// Start the server
app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});
// Initialize the processing loop
async function processNextBatch() {
    try {
        const pendingDomains = await (0, database_1.query)(`
      SELECT id, domain
      FROM domains
      WHERE status = 'pending'
      ORDER BY last_processed_at ASC NULLS FIRST
      LIMIT 1
    `);
        if (pendingDomains.rows.length > 0) {
            const domain = pendingDomains.rows[0];
            await monitoring.logDomainProcessing(domain.id, 'processing');
            // Process domain here
            // ... your existing processing logic ...
            await monitoring.logDomainProcessing(domain.id, 'completed');
        }
    }
    catch (error) {
        const err = error;
        console.error('Processing error:', err);
        await monitoring.logError(err, { context: 'batch_processing' });
    }
    // Schedule next batch
    setTimeout(processNextBatch, 60000); // 1 minute delay
}
// Start processing
processNextBatch().catch((error) => {
    const err = error;
    console.error('Failed to start processing:', err);
    process.exit(1);
});
