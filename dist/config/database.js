"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.pool = void 0;
exports.query = query;
exports.testConnection = testConnection;
exports.getClient = getClient;
exports.cleanup = cleanup;
const pg_1 = require("pg");
// Default pool configuration
const defaultConfig = {
    max: 20, // Maximum number of clients in the pool
    idleTimeoutMillis: 30000, // Close idle clients after 30 seconds
    connectionTimeoutMillis: 2000, // Return an error after 2 seconds if connection could not be established
    ssl: process.env.NODE_ENV === 'production' ? {
        rejectUnauthorized: false
    } : false
};
// Create pool with environment variables or defaults
exports.pool = new pg_1.Pool({
    ...defaultConfig,
    connectionString: process.env.DATABASE_URL || 'postgres://localhost:5432/raw_capture',
});
// Handle pool errors
exports.pool.on('error', (err, client) => {
    console.error('Unexpected error on idle client', err);
});
// Retry helper function
async function withRetry(operation, maxRetries = 5, baseDelay = 1000) {
    let lastError;
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            return await operation();
        }
        catch (error) {
            lastError = error;
            // Don't retry on certain errors (syntax errors, etc.)
            if (error && typeof error === 'object' && 'code' in error) {
                const pgError = error;
                if (pgError.code && !['ECONNREFUSED', 'ENOTFOUND', 'ETIMEDOUT'].includes(pgError.code)) {
                    throw error;
                }
            }
            if (attempt === maxRetries) {
                console.error(`Database operation failed after ${maxRetries} attempts:`, lastError);
                throw lastError;
            }
            const delay = baseDelay * Math.pow(2, attempt - 1);
            console.log(`Database connection attempt ${attempt} failed, retrying in ${delay}ms...`);
            await new Promise(resolve => setTimeout(resolve, delay));
        }
    }
    throw lastError;
}
// Export helper functions for common database operations with retry logic
async function query(text, params) {
    const start = Date.now();
    return withRetry(async () => {
        try {
            const res = await exports.pool.query(text, params);
            const duration = Date.now() - start;
            console.log('Executed query', { text: text.substring(0, 100) + '...', duration, rows: res.rowCount });
            return res;
        }
        catch (error) {
            console.error('Error executing query', { text: text.substring(0, 100) + '...', error: error.message });
            throw error;
        }
    });
}
// Test database connection
async function testConnection() {
    try {
        await withRetry(async () => {
            await exports.pool.query('SELECT 1');
        });
        console.log('Database connection successful');
        return true;
    }
    catch (error) {
        console.error('Failed to connect to database:', error);
        return false;
    }
}
// Get a client from the pool
async function getClient() {
    const client = await exports.pool.connect();
    const query = client.query.bind(client);
    const release = client.release.bind(client);
    // Set a timeout of 5 seconds on idle clients
    const timeout = setTimeout(() => {
        console.error('A client has been checked out for too long.');
        console.error(`The last executed query on this client was: ${client.lastQuery}`);
    }, 5000);
    // Monkey patch the query method to keep track of the last query
    client.query = (async (...args) => {
        client.lastQuery = args[0];
        return query(...args);
    });
    client.release = () => {
        clearTimeout(timeout);
        client.query = query;
        client.release = release;
        return release();
    };
    return client;
}
async function cleanup() {
    await exports.pool.end();
}
