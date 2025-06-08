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
const dotenv = __importStar(require("dotenv"));
const pg_1 = require("pg");
dotenv.config();
const pool = new pg_1.Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false
    }
});
async function testDatabase() {
    console.log('Starting database test...');
    try {
        // Test connection
        console.log('Testing connection...');
        await pool.query('SELECT NOW()');
        console.log('✅ Database connection successful');
        // Test domain insertion
        console.log('\nTesting domain insertion...');
        const testDomain = 'test.example.com';
        const insertResult = await pool.query('INSERT INTO domains (domain) VALUES ($1) RETURNING *', [testDomain]);
        console.log('✅ Domain inserted:', insertResult.rows[0]);
        // Test domain retrieval
        console.log('\nTesting domain retrieval...');
        const selectResult = await pool.query('SELECT * FROM domains ORDER BY created_at DESC LIMIT 1');
        console.log('✅ Retrieved domain:', selectResult.rows[0]);
        // Test response insertion
        console.log('\nTesting response insertion...');
        const responseResult = await pool.query(`INSERT INTO responses 
       (domain_id, model_name, prompt_type, raw_response, token_count) 
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`, [
            selectResult.rows[0].id,
            'test-model',
            'test-prompt',
            'This is a test response',
            100
        ]);
        console.log('✅ Response inserted:', responseResult.rows[0]);
        // Test response retrieval
        console.log('\nTesting response retrieval...');
        const getResponseResult = await pool.query(`SELECT r.*, d.domain 
       FROM responses r 
       JOIN domains d ON r.domain_id = d.id 
       ORDER BY r.created_at DESC 
       LIMIT 1`);
        console.log('✅ Retrieved response with domain:', getResponseResult.rows[0]);
    }
    catch (error) {
        console.error('❌ Error during database test:', error);
    }
    finally {
        await pool.end();
        console.log('\nTest complete, connection closed.');
    }
}
// Run the test
testDatabase().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
});
