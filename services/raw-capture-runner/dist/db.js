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
exports.saveDomain = saveDomain;
exports.saveResponse = saveResponse;
exports.getResponsesInTimeRange = getResponsesInTimeRange;
exports.getLatestResponses = getLatestResponses;
exports.getDomains = getDomains;
exports.cleanup = cleanup;
const pg_1 = require("pg");
const dotenv = __importStar(require("dotenv"));
dotenv.config();
const pool = new pg_1.Pool({
    connectionString: process.env.DATABASE_URL || 'postgres://localhost:5432/raw_capture_test',
    ssl: process.env.NODE_ENV === 'production' ? {
        rejectUnauthorized: false
    } : false
});
async function saveDomain(domain) {
    const query = `
    INSERT INTO domains (domain)
    VALUES ($1)
    ON CONFLICT (domain) 
    DO UPDATE SET updated_at = CURRENT_TIMESTAMP
    RETURNING id
  `;
    const result = await pool.query(query, [domain]);
    return result.rows[0].id;
}
async function saveResponse(response) {
    const startTime = Date.now();
    const query = `
    INSERT INTO responses (
      domain_id, model_name, prompt_type, raw_response, 
      token_count, prompt_tokens, completion_tokens,
      total_cost_usd, latency_ms, captured_at
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, CURRENT_TIMESTAMP)
  `;
    await pool.query(query, [
        response.domain_id,
        response.model_name,
        response.prompt_type,
        response.raw_response,
        response.token_count,
        response.prompt_tokens || null,
        response.completion_tokens || null,
        response.total_cost_usd || null,
        response.latency_ms || (Date.now() - startTime)
    ]);
}
async function getResponsesInTimeRange(domain_id, start_time, end_time) {
    const query = `
    SELECT * FROM responses 
    WHERE domain_id = $1 
    AND captured_at BETWEEN $2 AND $3
    ORDER BY captured_at DESC
  `;
    const result = await pool.query(query, [domain_id, start_time, end_time]);
    return result.rows;
}
async function getLatestResponses(domain_id) {
    const query = `
    WITH latest_responses AS (
      SELECT DISTINCT ON (domain_id, model_name, prompt_type)
        *
      FROM responses
      WHERE domain_id = $1
      ORDER BY domain_id, model_name, prompt_type, captured_at DESC
    )
    SELECT * FROM latest_responses
    ORDER BY captured_at DESC
  `;
    const result = await pool.query(query, [domain_id]);
    return result.rows;
}
async function getDomains() {
    const result = await pool.query('SELECT * FROM domains ORDER BY created_at DESC');
    return result.rows;
}
async function cleanup() {
    await pool.end();
}
