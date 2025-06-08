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
const TEST_DOMAINS = [
    'microsoft.com',
    'apple.com',
    'amazon.com',
    'google.com',
    'meta.com'
];
const pool = new pg_1.Pool({
    connectionString: process.env.DATABASE_URL || 'postgres://localhost:5432/raw_capture_test',
    ssl: process.env.NODE_ENV === 'production' ? {
        rejectUnauthorized: false
    } : false
});
async function seedDomains() {
    console.log('Starting domain seeding...');
    try {
        // Check if we already have domains
        const existingCount = await pool.query('SELECT COUNT(*) FROM domains');
        if (parseInt(existingCount.rows[0].count) > 0) {
            console.log('Database already has domains, skipping seeding.');
            return;
        }
        // Insert domains
        for (const domain of TEST_DOMAINS) {
            const result = await pool.query('INSERT INTO domains (domain) VALUES ($1) ON CONFLICT (domain) DO NOTHING RETURNING *', [domain]);
            if (result.rows.length > 0) {
                console.log(`✅ Added domain: ${domain}`);
            }
            else {
                console.log(`ℹ️ Domain already exists: ${domain}`);
            }
        }
        // Verify domains
        const allDomains = await pool.query('SELECT * FROM domains ORDER BY created_at DESC');
        console.log('\nCurrent domains in database:');
        allDomains.rows.forEach(row => {
            console.log(`- ${row.domain} (ID: ${row.id}, Created: ${row.created_at})`);
        });
    }
    catch (error) {
        console.error('❌ Error seeding domains:', error);
        throw error;
    }
    finally {
        await pool.end();
        console.log('\nSeeding complete.');
    }
}
// Run seeding
seedDomains().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
});
