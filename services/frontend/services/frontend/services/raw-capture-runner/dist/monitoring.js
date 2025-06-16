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
exports.incrementResponses = incrementResponses;
exports.incrementErrors = incrementErrors;
exports.getStorageMetrics = getStorageMetrics;
exports.getDailyStats = getDailyStats;
exports.getRunTimeMetrics = getRunTimeMetrics;
exports.logMetrics = logMetrics;
const pg_1 = require("pg");
const dotenv = __importStar(require("dotenv"));
dotenv.config();
const pool = new pg_1.Pool({
    connectionString: process.env.DATABASE_URL || 'postgres://localhost:5432/raw_capture_test',
    ssl: process.env.NODE_ENV === 'production' ? {
        rejectUnauthorized: false
    } : false
});
let metrics = {
    total_responses: 0,
    total_tokens: 0,
    total_chars: 0,
    avg_tokens_per_response: 0,
    avg_response_time_ms: 0,
    error_count: 0,
    start_time: new Date()
};
function incrementResponses(tokens, chars, responseTime) {
    metrics.total_responses++;
    metrics.total_tokens += tokens;
    metrics.total_chars += chars;
    metrics.avg_tokens_per_response = metrics.total_tokens / metrics.total_responses;
    metrics.avg_response_time_ms = ((metrics.avg_response_time_ms * (metrics.total_responses - 1)) + responseTime) / metrics.total_responses;
}
function incrementErrors() {
    metrics.error_count++;
}
async function getStorageMetrics() {
    const result = await pool.query(`
    SELECT 
      pg_size_pretty(pg_database_size('raw_capture_test')) as db_size,
      COUNT(*) as total_responses,
      SUM(length(raw_response)) as total_chars
    FROM responses;
  `);
    return result.rows[0];
}
async function getDailyStats() {
    const result = await pool.query(`
    SELECT 
      COUNT(*) as responses_today,
      AVG(token_count) as avg_tokens_today,
      SUM(CASE WHEN token_count IS NULL THEN 1 ELSE 0 END) as errors_today
    FROM responses 
    WHERE captured_at::date = CURRENT_DATE;
  `);
    return result.rows[0];
}
function getRunTimeMetrics() {
    return {
        ...metrics,
        avg_tokens_per_response: Math.round(metrics.avg_tokens_per_response * 100) / 100,
        avg_response_time_ms: Math.round(metrics.avg_response_time_ms)
    };
}
async function logMetrics() {
    const storage = await getStorageMetrics();
    const daily = await getDailyStats();
    const runtime = getRunTimeMetrics();
    console.log('\n=== Metrics Report ===');
    console.log('Storage:');
    console.log(`- Database Size: ${storage.db_size}`);
    console.log(`- Total Responses: ${storage.total_responses}`);
    console.log(`- Total Characters: ${storage.total_chars}`);
    console.log('\nToday\'s Stats:');
    console.log(`- Responses: ${daily.responses_today}`);
    console.log(`- Average Tokens: ${Math.round(daily.avg_tokens_today)}`);
    console.log(`- Errors: ${daily.errors_today}`);
    console.log('\nRuntime Stats:');
    console.log(`- Running since: ${runtime.start_time.toISOString()}`);
    console.log(`- Responses processed: ${runtime.total_responses}`);
    console.log(`- Average tokens: ${runtime.avg_tokens_per_response}`);
    console.log(`- Average response time: ${runtime.avg_response_time_ms}ms`);
    console.log(`- Errors: ${runtime.error_count}`);
    console.log('=====================\n');
}
