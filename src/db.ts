import { Pool } from 'pg';
import { Domain, Response } from './types';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
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
  token_count?: number;
}): Promise<void> {
  const query = `
    INSERT INTO responses (
      domain_id, model_name, prompt_type, raw_response, 
      token_count, created_at
    )
    VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)
    ON CONFLICT (domain_id, model_name, prompt_type) 
    DO UPDATE SET 
      raw_response = $4,
      token_count = $5,
      created_at = CURRENT_TIMESTAMP
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