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
const fs = __importStar(require("fs"));
// Load environment variables
dotenv.config();
// Schema initialization fallback
async function ensureSchemaExists() {
    try {
        console.log('🔍 Checking if database schema exists...');
        // Test if tables exist by checking for the domains table
        await (0, database_1.query)('SELECT 1 FROM domains LIMIT 1');
        console.log('✅ Database schema already exists');
    }
    catch (error) {
        if (error.code === '42P01') { // Table does not exist
            console.log('📦 Database schema not found, initializing...');
            try {
                const schemaPath = path_1.default.join(__dirname, '..', 'schemas', 'schema.sql');
                const schema = fs.readFileSync(schemaPath, 'utf8');
                console.log('🔨 Executing schema SQL...');
                await (0, database_1.query)(schema);
                console.log('✅ Database schema initialized successfully!');
            }
            catch (schemaError) {
                console.error('❌ Failed to initialize schema:', schemaError);
                throw schemaError;
            }
        }
        else {
            console.error('❌ Database connection error:', error);
            throw error;
        }
    }
}
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
// Initialize application
async function initializeApp() {
    try {
        // Test database connection first
        console.log('🔍 Testing database connection...');
        const connected = await (0, database_1.testConnection)();
        if (!connected) {
            throw new Error('Database connection failed');
        }
        // Ensure schema exists
        await ensureSchemaExists();
        // Start the server
        app.listen(port, () => {
            console.log(`Server running at http://localhost:${port}`);
        });
        // Start processing
        console.log('🚀 Starting domain processing...');
        processNextBatch().catch((error) => {
            const err = error;
            console.error('Failed to start processing:', err);
            process.exit(1);
        });
    }
    catch (error) {
        console.error('❌ Application initialization failed:', error);
        process.exit(1);
    }
}
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
// Start the application
initializeApp();
