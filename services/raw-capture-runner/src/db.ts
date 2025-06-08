import { Pool } from 'pg';
import { Domain, Response } from './types';
import * as dotenv from 'dotenv';

dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgres://localhost:5432/raw_capture_test',
  ssl: process.env.NODE_ENV === 'production' ? {
    rejectUnauthorized: false
  } : false
});

export async function saveDomain(domain: string): Promise<number> {
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

export async function saveResponse(response: {
  domain_id: number;
  model_name: string;
  prompt_type: string;
  raw_response: string;
  token_count: number;
  prompt_tokens?: number;
  completion_tokens?: number;
  total_cost_usd?: number;
  latency_ms?: number;
}): Promise<void> {
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

export async function getResponsesInTimeRange(
  domain_id: number,
  start_time: Date,
  end_time: Date
): Promise<Response[]> {
  const query = `
    SELECT * FROM responses 
    WHERE domain_id = $1 
    AND captured_at BETWEEN $2 AND $3
    ORDER BY captured_at DESC
  `;
  const result = await pool.query(query, [domain_id, start_time, end_time]);
  return result.rows;
}

export async function getLatestResponses(domain_id: number): Promise<Response[]> {
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

export async function getDomains(): Promise<Domain[]> {
  const result = await pool.query('SELECT * FROM domains ORDER BY created_at DESC');
  return result.rows;
}

export async function cleanup(): Promise<void> {
  await pool.end();
} 