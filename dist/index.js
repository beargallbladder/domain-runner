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
// Schema initialization with proper column verification
async function ensureSchemaExists() {
    try {
        console.log('🔍 Checking if database schema exists...');
        // Check if domains table has the correct structure
        try {
            await (0, database_1.query)(`SELECT status, last_processed_at, process_count FROM domains LIMIT 1`);
            // Check if processing_logs table exists
            await (0, database_1.query)(`SELECT event_type FROM processing_logs LIMIT 1`);
            console.log('✅ Database schema already exists with correct structure');
            return;
        }
        catch (error) {
            console.log(`📦 Schema issue detected (${error.code}): ${error.message}`);
            console.log('🔨 Initializing/fixing database schema...');
            // Force schema recreation
            const schemaPath = path_1.default.join(__dirname, '..', 'schemas', 'schema.sql');
            if (!fs.existsSync(schemaPath)) {
                throw new Error(`Schema file not found at: ${schemaPath}`);
            }
            const schema = fs.readFileSync(schemaPath, 'utf8');
            // Drop existing tables if they exist with wrong structure
            console.log('🗑️ Dropping existing incompatible tables...');
            await (0, database_1.query)(`DROP TABLE IF EXISTS processing_logs CASCADE`);
            await (0, database_1.query)(`DROP TABLE IF EXISTS responses CASCADE`);
            await (0, database_1.query)(`DROP TABLE IF EXISTS rate_limits CASCADE`);
            await (0, database_1.query)(`DROP TABLE IF EXISTS prompt_templates CASCADE`);
            await (0, database_1.query)(`DROP TABLE IF EXISTS domains CASCADE`);
            console.log('🔨 Creating fresh schema...');
            await (0, database_1.query)(schema);
            // Verify schema was created correctly
            await (0, database_1.query)(`SELECT status, last_processed_at, process_count FROM domains LIMIT 1`);
            await (0, database_1.query)(`SELECT event_type FROM processing_logs LIMIT 1`);
            console.log('✅ Database schema initialized successfully!');
        }
    }
    catch (error) {
        console.error('❌ Schema initialization failed:', error);
        throw error;
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
        // Ensure schema exists with proper structure
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
        else {
            console.log('📊 No pending domains found');
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
