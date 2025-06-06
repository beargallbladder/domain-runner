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
            // Try multiple possible schema file locations
            const possiblePaths = [
                path_1.default.join(__dirname, '..', 'schemas', 'schema.sql'),
                path_1.default.join(__dirname, '..', '..', 'schemas', 'schema.sql'),
                path_1.default.join(process.cwd(), 'schemas', 'schema.sql'),
                path_1.default.join('/opt/render/project/src', 'schemas', 'schema.sql'),
                path_1.default.join('/opt/render/project', 'schemas', 'schema.sql')
            ];
            let schemaContent = null;
            let foundPath = null;
            for (const schemaPath of possiblePaths) {
                console.log(`🔍 Trying schema path: ${schemaPath}`);
                if (fs.existsSync(schemaPath)) {
                    schemaContent = fs.readFileSync(schemaPath, 'utf8');
                    foundPath = schemaPath;
                    console.log(`✅ Found schema at: ${foundPath}`);
                    break;
                }
            }
            if (!schemaContent) {
                console.log('⚠️ Schema file not found, using embedded schema...');
                // Embedded schema as fallback
                schemaContent = `
          -- Enable UUID extension
          CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
          
          -- Create domains table with full temporal tracking
          CREATE TABLE IF NOT EXISTS domains (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            domain TEXT NOT NULL UNIQUE,
            status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'error')),
            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            last_processed_at TIMESTAMP WITH TIME ZONE,
            process_count INTEGER DEFAULT 0,
            error_count INTEGER DEFAULT 0,
            source TEXT
          );
          
          -- Create responses table with full temporal and cost tracking
          CREATE TABLE IF NOT EXISTS responses (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            domain_id UUID REFERENCES domains(id),
            model TEXT NOT NULL,
            prompt_type TEXT NOT NULL,
            interpolated_prompt TEXT NOT NULL,
            raw_response TEXT NOT NULL,
            token_count INTEGER,
            prompt_tokens INTEGER,
            completion_tokens INTEGER,
            token_usage JSONB,
            total_cost_usd DECIMAL(10,6),
            latency_ms INTEGER,
            captured_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
          );
          
          -- Create processing_logs table for detailed temporal monitoring
          CREATE TABLE IF NOT EXISTS processing_logs (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            domain_id UUID REFERENCES domains(id),
            event_type TEXT NOT NULL,
            details JSONB,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
          );
          
          -- Create rate_limits table for temporal API usage tracking
          CREATE TABLE IF NOT EXISTS rate_limits (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            model TEXT NOT NULL,
            requests_per_minute INTEGER NOT NULL,
            requests_per_hour INTEGER NOT NULL,
            requests_per_day INTEGER NOT NULL,
            current_minute_count INTEGER DEFAULT 0,
            current_hour_count INTEGER DEFAULT 0,
            current_day_count INTEGER DEFAULT 0,
            last_reset_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            window_start TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            UNIQUE (model)
          );
          
          -- Create prompt_templates table for template management
          CREATE TABLE IF NOT EXISTS prompt_templates (
            id TEXT PRIMARY KEY,
            template TEXT NOT NULL,
            category TEXT,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
          );
        `;
            }
            // Drop existing tables if they exist with wrong structure
            console.log('🗑️ Dropping existing incompatible tables...');
            await (0, database_1.query)(`DROP TABLE IF EXISTS processing_logs CASCADE`);
            await (0, database_1.query)(`DROP TABLE IF EXISTS responses CASCADE`);
            await (0, database_1.query)(`DROP TABLE IF EXISTS rate_limits CASCADE`);
            await (0, database_1.query)(`DROP TABLE IF EXISTS prompt_templates CASCADE`);
            await (0, database_1.query)(`DROP TABLE IF EXISTS domains CASCADE`);
            console.log('🔨 Creating fresh schema...');
            await (0, database_1.query)(schemaContent);
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
