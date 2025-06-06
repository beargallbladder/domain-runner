"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.saveDomain = saveDomain;
exports.saveRawResponse = saveRawResponse;
exports.getDomains = getDomains;
exports.cleanup = cleanup;
const pg_1 = require("pg");
const pool = new pg_1.Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false
    }
});
async function saveDomain(domain) {
    const query = `
    INSERT INTO domains (domain, source)
    VALUES ($1, $2)
    ON CONFLICT (domain) DO NOTHING
  `;
    await pool.query(query, [domain.domain, domain.source]);
}
async function saveRawResponse(response) {
    const query = `
    INSERT INTO raw_responses (
      domain, model, prompt_template_id, interpolated_prompt,
      response, latency_ms, token_usage, cost_estimate
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
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
async function getDomains() {
    const result = await pool.query('SELECT * FROM domains');
    return result.rows;
}
async function cleanup() {
    await pool.end();
}
