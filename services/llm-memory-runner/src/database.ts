import { Pool, PoolClient } from 'pg';
import * as dotenv from 'dotenv';

dotenv.config();

// BULLETPROOF DATABASE CONNECTION - NO PLACEHOLDERS
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://raw_capture_db_user:wjFesUM8ISNEvE2b4kZtRAKgGYJVtKK5@dpg-d11fqgndiees73fb35dg-a.oregon-postgres.render.com/raw_capture_db',
  ssl: { rejectUnauthorized: false }, // ALWAYS SSL for Render
  max: 10,
  connectionTimeoutMillis: 30000,
  idleTimeoutMillis: 30000,
  query_timeout: 60000
});

// Handle pool errors
pool.on('error', (err: Error) => {
  console.error('💥 Database pool error:', err);
});

// Test connection function
export async function testConnection(): Promise<boolean> {
  try {
    const client = await pool.connect();
    await client.query('SELECT NOW()');
    client.release();
    console.log('✅ Database connection successful');
    return true;
  } catch (error) {
    console.error('❌ Database connection failed:', error);
    return false;
  }
}

// Initialize database schema
export async function initializeSchema(): Promise<void> {
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
  } catch (error) {
    console.error('❌ Schema initialization failed:', error);
    throw error;
  }
}

// Get domains to process
export async function getDomainsToProcess(limit: number = 10): Promise<string[]> {
  try {
    const result = await pool.query(`
      SELECT domain FROM domains 
      ORDER BY updated_at ASC 
      LIMIT $1
    `, [limit]);
    
    return result.rows.map(row => row.domain);
  } catch (error) {
    console.error('❌ Failed to get domains:', error);
    return [];
  }
}

// Save LLM response
export async function saveLLMResponse(data: {
  domain: string;
  provider: string;
  model: string;
  promptType: string;
  rawResponse: string;
  tokenCount?: number;
  responseTimeMs?: number;
}): Promise<void> {
  try {
    // Get or create domain
    const domainResult = await pool.query(`
      INSERT INTO domains (domain) VALUES ($1)
      ON CONFLICT (domain) DO UPDATE SET updated_at = NOW()
      RETURNING id
    `, [data.domain]);
    
    const domainId = domainResult.rows[0].id;

    // Save response
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
  } catch (error) {
    console.error('❌ Failed to save response:', error);
    throw error;
  }
}

// Log processing event
export async function logProcessingEvent(data: {
  eventType: string;
  provider?: string;
  domain?: string;
  success: boolean;
  errorMessage?: string;
}): Promise<void> {
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
  } catch (error) {
    console.error('❌ Failed to log event:', error);
  }
}

// Get stats for health check
export async function getStats(): Promise<any> {
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
  } catch (error) {
    console.error('❌ Failed to get stats:', error);
    return {
      totalResponses: 0,
      responsesByProvider: {},
      recentErrors: 0
    };
  }
}

export { pool }; 