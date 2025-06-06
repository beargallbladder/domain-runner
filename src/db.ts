import { Pool } from 'pg';
import { RawResponse, Domain } from './types';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

export async function saveDomain(domain: Omit<Domain, 'id' | 'added_at'>): Promise<void> {
  const query = `
    INSERT INTO domains (domain, source)
    VALUES ($1, $2)
    ON CONFLICT (domain) DO NOTHING
  `;
  await pool.query(query, [domain.domain, domain.source]);
}

export async function saveRawResponse(response: Omit<RawResponse, 'captured_at'>): Promise<void> {
  const query = `
    INSERT INTO raw_responses (
      domain, model, prompt_template_id, interpolated_prompt,
      response, latency_ms, token_usage, cost_estimate, captured_at
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, CURRENT_TIMESTAMP)
  `;
  
  await pool.query(query, [
    response.domain,
    response.model,
    response.prompt_template_id,
    response.interpolated_prompt,
    response.response,
    response.latency_ms,
    response.token_usage,
    response.cost_estimate
  ]);
}

export async function getDomains(): Promise<Domain[]> {
  const result = await pool.query('SELECT * FROM domains ORDER BY added_at DESC');
  return result.rows;
}

export async function cleanup(): Promise<void> {
  await pool.end();
} 