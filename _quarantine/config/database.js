const { Pool } = require('pg');

// Validate required environment variables
const requiredEnvVars = ['DATABASE_URL'];
for (const envVar of requiredEnvVars) {
    if (!process.env[envVar]) {
        throw new Error(`Missing required environment variable: ${envVar}`);
    }
}

// Create connection pool with enhanced security and performance
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? {
        rejectUnauthorized: false,
        ca: process.env.DATABASE_CA_CERT
    } : false,
    // Enhanced connection pool settings for migration workloads
    max: 50,                      // Increased for high concurrency
    min: 10,                      // Maintain minimum connections
    idleTimeoutMillis: 30000,     // Keep connections alive
    connectionTimeoutMillis: 15000, // Longer timeout for migrations
    statement_timeout: 300000,    // 5 minutes for long-running migrations
    query_timeout: 300000,        // 5 minutes for complex queries
    application_name: 'domain-runner-migration',
    // Enable keep-alive for stable connections
    keepAlive: true,
    keepAliveInitialDelayMillis: 10000
});

// Error handling
pool.on('error', (err, client) => {
    console.error('Unexpected error on idle client', err);
});

// Helper function for parameterized queries with enhanced logging
async function query(text, params) {
    const start = Date.now();
    const queryId = Math.random().toString(36).substr(2, 9);
    
    try {
        console.log(`🔍 [${queryId}] Starting query: ${text.substring(0, 100)}...`);
        const res = await pool.query(text, params);
        const duration = Date.now() - start;
        
        if (duration > 5000) {
            console.warn(`🐌 [${queryId}] Very slow query (${duration}ms): ${text.substring(0, 100)}...`);
        } else if (duration > 1000) {
            console.warn(`⏰ [${queryId}] Slow query (${duration}ms): ${text.substring(0, 100)}...`);
        } else {
            console.log(`✅ [${queryId}] Query completed (${duration}ms)`);
        }
        
        return res;
    } catch (err) {
        console.error(`❌ [${queryId}] Database query error:`, err);
        console.error(`   Query: ${text.substring(0, 200)}...`);
        console.error(`   Params: ${JSON.stringify(params)}`);
        throw err;
    }
}

// Enhanced transaction helper with retry logic
async function transaction(callback, retries = 3) {
    let lastError;
    
    for (let attempt = 1; attempt <= retries; attempt++) {
        const client = await pool.connect();
        const transactionId = Math.random().toString(36).substr(2, 9);
        
        try {
            console.log(`🔄 [${transactionId}] Starting transaction (attempt ${attempt}/${retries})`);
            await client.query('BEGIN');
            
            const result = await callback(client);
            
            await client.query('COMMIT');
            console.log(`✅ [${transactionId}] Transaction committed successfully`);
            return result;
            
        } catch (err) {
            console.error(`❌ [${transactionId}] Transaction error (attempt ${attempt}/${retries}):`, err.message);
            
            try {
                await client.query('ROLLBACK');
                console.log(`↩️  [${transactionId}] Transaction rolled back`);
            } catch (rollbackErr) {
                console.error(`🚨 [${transactionId}] Rollback failed:`, rollbackErr.message);
            }
            
            lastError = err;
            
            // Don't retry on certain errors
            if (err.code === '23505' || err.code === '23503') { // Unique constraint or foreign key violations
                throw err;
            }
            
            // Wait before retrying
            if (attempt < retries) {
                const delay = attempt * 1000; // Exponential backoff
                console.log(`⏳ [${transactionId}] Waiting ${delay}ms before retry...`);
                await new Promise(resolve => setTimeout(resolve, delay));
            }
            
        } finally {
            client.release();
        }
    }
    
    throw lastError;
}

// Migration-specific transaction helper
async function migrationTransaction(callback) {
    return transaction(callback, 1); // No retries for migrations
}

// Bulk insert helper for performance
async function bulkInsert(tableName, columns, values) {
    if (values.length === 0) return { rowCount: 0 };
    
    const placeholders = values.map((_, i) => 
        `(${columns.map((_, j) => `$${i * columns.length + j + 1}`).join(', ')})`
    ).join(', ');
    
    const query = `INSERT INTO ${tableName} (${columns.join(', ')}) VALUES ${placeholders}`;
    const flatValues = values.flat();
    
    return await pool.query(query, flatValues);
}

// Connection health check
async function healthCheck() {
    try {
        const start = Date.now();
        await pool.query('SELECT 1 as health_check');
        const duration = Date.now() - start;
        
        const poolStats = {
            totalCount: pool.totalCount,
            idleCount: pool.idleCount,
            waitingCount: pool.waitingCount
        };
        
        return {
            healthy: true,
            responseTime: duration,
            poolStats,
            timestamp: new Date().toISOString()
        };
    } catch (err) {
        return {
            healthy: false,
            error: err.message,
            timestamp: new Date().toISOString()
        };
    }
}

module.exports = {
    pool,
    query,
    transaction,
    migrationTransaction,
    bulkInsert,
    healthCheck
};