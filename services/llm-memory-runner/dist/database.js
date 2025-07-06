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
Object.defineProperty(exports, "__esModule", { value: true });
exports.pool = void 0;
exports.testConnection = testConnection;
exports.initializeSchema = initializeSchema;
exports.getDomainsToProcess = getDomainsToProcess;
exports.saveLLMResponse = saveLLMResponse;
exports.logProcessingEvent = logProcessingEvent;
exports.getStats = getStats;
const pg_1 = require("pg");
const dotenv = __importStar(require("dotenv"));
dotenv.config();
const pool = new pg_1.Pool({
    connectionString: process.env.DATABASE_URL || 'postgresql://raw_capture_db_user:wjFesUM8ISNEvE2b4kZtRAKgGYJVtKK5@dpg-d11fqgndiees73fb35dg-a.oregon-postgres.render.com/raw_capture_db',
    ssl: { rejectUnauthorized: false },
    max: 10,
    connectionTimeoutMillis: 30000,
    idleTimeoutMillis: 30000,
    query_timeout: 60000
});
exports.pool = pool;
pool.on('error', (err) => {
    console.error('💥 Database pool error:', err);
});
async function testConnection() {
    try {
        const client = await pool.connect();
        await client.query('SELECT NOW()');
        client.release();
        console.log('✅ Database connection successful');
        return true;
    }
    catch (error) {
        console.error('❌ Database connection failed:', error);
        return false;
    }
}
async function initializeSchema() {
    try {
        await pool.query(`
      CREATE TABLE IF NOT EXISTS domains (
        id SERIAL PRIMARY KEY,
        domain VARCHAR(255) UNIQUE NOT NULL,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);
        await pool.query(`
      CREATE TABLE IF NOT EXISTS llm_responses (
        id SERIAL PRIMARY KEY,
        domain_id INTEGER REFERENCES domains(id),
        provider VARCHAR(50) NOT NULL,
        model VARCHAR(100) NOT NULL,
        prompt_type VARCHAR(100) NOT NULL,
        raw_response TEXT NOT NULL,
        token_count INTEGER,
        response_time_ms INTEGER,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);
        await pool.query(`
      CREATE TABLE IF NOT EXISTS processing_logs (
        id SERIAL PRIMARY KEY,
        event_type VARCHAR(50) NOT NULL,
        provider VARCHAR(50),
        domain VARCHAR(255),
        success BOOLEAN NOT NULL,
        error_message TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);
        console.log('✅ Database schema initialized');
    }
    catch (error) {
        console.error('❌ Schema initialization failed:', error);
        throw error;
    }
}
async function getDomainsToProcess(limit = 10) {
    try {
        const result = await pool.query(`
      SELECT domain FROM domains 
      ORDER BY updated_at ASC 
      LIMIT $1
    `, [limit]);
        return result.rows.map(row => row.domain);
    }
    catch (error) {
        console.error('❌ Failed to get domains:', error);
        return [];
    }
}
async function saveLLMResponse(data) {
    try {
        const domainResult = await pool.query(`
      INSERT INTO domains (domain) VALUES ($1)
      ON CONFLICT (domain) DO UPDATE SET updated_at = NOW()
      RETURNING id
    `, [data.domain]);
        const domainId = domainResult.rows[0].id;
        await pool.query(`
      INSERT INTO llm_responses (
        domain_id, provider, model, prompt_type, raw_response, token_count, response_time_ms
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
    `, [
            domainId,
            data.provider,
            data.model,
            data.promptType,
            data.rawResponse,
            data.tokenCount || 0,
            data.responseTimeMs || 0
        ]);
        console.log(`✅ Saved response: ${data.provider} -> ${data.domain}`);
    }
    catch (error) {
        console.error('❌ Failed to save response:', error);
        throw error;
    }
}
async function logProcessingEvent(data) {
    try {
        await pool.query(`
      INSERT INTO processing_logs (event_type, provider, domain, success, error_message)
      VALUES ($1, $2, $3, $4, $5)
    `, [
            data.eventType,
            data.provider || null,
            data.domain || null,
            data.success,
            data.errorMessage || null
        ]);
    }
    catch (error) {
        console.error('❌ Failed to log event:', error);
    }
}
async function getStats() {
    try {
        const totalResponses = await pool.query('SELECT COUNT(*) as count FROM llm_responses');
        const responsesByProvider = await pool.query(`
      SELECT provider, COUNT(*) as count 
      FROM llm_responses 
      GROUP BY provider
    `);
        const recentErrors = await pool.query(`
      SELECT COUNT(*) as count 
      FROM processing_logs 
      WHERE success = false AND created_at > NOW() - INTERVAL '1 hour'
    `);
        return {
            totalResponses: parseInt(totalResponses.rows[0].count),
            responsesByProvider: responsesByProvider.rows.reduce((acc, row) => {
                acc[row.provider] = parseInt(row.count);
                return acc;
            }, {}),
            recentErrors: parseInt(recentErrors.rows[0].count)
        };
    }
    catch (error) {
        console.error('❌ Failed to get stats:', error);
        return {
            totalResponses: 0,
            responsesByProvider: {},
            recentErrors: 0
        };
    }
}
