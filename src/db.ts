import { Pool } from 'pg';
import { RawResponse, Domain } from './types';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

export async function saveDomain(domain: string): Promise<void> {
  const query = `
    INSERT INTO domains (domain)
    VALUES ($1)
    ON CONFLICT (domain) DO NOTHING
  `;
  await pool.query(query, [domain]);
}

export async function saveResponse(response: {
  domain_id: number;
  model_name: string;
  prompt_type: string;
  raw_response: string;
  token_count?: number;
}): Promise<void> {
  const query = `
    INSERT INTO responses (
      domain_id, model_name, prompt_type, raw_response, 
      token_count, created_at
    )
    VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)
  `;
  
  await pool.query(query, [
    response.domain_id,
    response.model_name,
    response.prompt_type,
    response.raw_response,
    response.token_count || null
  ]);
}

export async function getDomains(): Promise<Domain[]> {
  const result = await pool.query('SELECT * FROM domains ORDER BY created_at DESC');
  return result.rows;
}

export async function cleanup(): Promise<void> {
  await pool.end();
} 