#!/usr/bin/env node

// EMERGENCY FAST CRAWLER - Only working providers, max concurrency
const { Pool } = require('pg');
const axios = require('axios');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://raw_capture_db_user:wjFesUM8ISNEvE2b4kZtRAKgGYJVtKK5@dpg-d11fqgndiees73fb35dg-a.oregon-postgres.render.com/raw_capture_db',
  ssl: { rejectUnauthorized: false },
  max: 20 // More connections
});

// ONLY WORKING PROVIDERS
const WORKING_PROVIDERS = [
  { name: 'openai', dbModel: 'openai/gpt-4o-mini', apiKey: process.env.OPENAI_API_KEY },
  { name: 'anthropic', dbModel: 'anthropic/claude-3-haiku', apiKey: process.env.ANTHROPIC_API_KEY },
  { name: 'openrouter', dbModel: 'openrouter/hermes-3-llama-3.1-70b', apiKey: process.env.OPENROUTER_API_KEY }
];

// Only 1 prompt to speed up
const PROMPT = 'Analyze {domain} for business potential, technical needs, and content strategy. Be concise.';

const batchId = `emergency_${Date.now()}`;
let completed = 0;
let startTime = Date.now();

async function queryProvider(provider, domain, domainId) {
  const fullPrompt = PROMPT.replace('{domain}', domain);
  
  try {
    let response;
    if (provider.name === 'openai') {
      response = await axios.post('https://api.openai.com/v1/chat/completions', {
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: fullPrompt }],
        max_tokens: 200
      }, {
        headers: { 'Authorization': `Bearer ${provider.apiKey}` },
        timeout: 10000
      });
      response = response.data.choices[0].message.content;
    } else if (provider.name === 'anthropic') {
      const r = await axios.post('https://api.anthropic.com/v1/messages', {
        model: 'claude-3-haiku-20240307',
        messages: [{ role: 'user', content: fullPrompt }],
        max_tokens: 200
      }, {
        headers: { 
          'x-api-key': provider.apiKey,
          'anthropic-version': '2023-06-01'
        },
        timeout: 10000
      });
      response = r.data.content[0].text;
    } else if (provider.name === 'openrouter') {
      const r = await axios.post('https://openrouter.ai/api/v1/chat/completions', {
        model: 'meta-llama/llama-3.1-70b-instruct',
        messages: [{ role: 'user', content: fullPrompt }]
      }, {
        headers: { 
          'Authorization': `Bearer ${provider.apiKey}`,
          'HTTP-Referer': 'https://llmpagerank.com'
        },
        timeout: 15000
      });
      response = r.data.choices[0].message.content;
    }
    
    // Store immediately
    await pool.query(`
      INSERT INTO domain_responses (
        domain_id, model, prompt_type, prompt, response, 
        created_at, batch_id
      ) VALUES ($1, $2, $3, $4, $5, NOW(), $6)
    `, [domainId, provider.dbModel, 'emergency_analysis', PROMPT, response, batchId]);
    
    return true;
  } catch (error) {
    console.error(`❌ ${provider.name} failed: ${error.message}`);
    return false;
  }
}

async function processDomainBatch(domains) {
  const promises = [];
  
  for (const domain of domains) {
    for (const provider of WORKING_PROVIDERS) {
      if (provider.apiKey) {
        promises.push(queryProvider(provider, domain.domain, domain.id));
      }
    }
  }
  
  const results = await Promise.allSettled(promises);
  completed += domains.length;
  
  const elapsed = (Date.now() - startTime) / 1000;
  const rate = completed / elapsed;
  const remaining = 3249 - completed;
  const eta = remaining / rate / 60;
  
  console.log(`✅ Batch done: ${completed}/3249 domains | Rate: ${rate.toFixed(1)}/sec | ETA: ${eta.toFixed(1)} min`);
}

async function emergencyCrawl() {
  console.log(`
🚨 EMERGENCY FAST CRAWL
=======================
Working providers: ${WORKING_PROVIDERS.filter(p => p.apiKey).length}
Target: 3,249 domains in < 60 minutes
Batch size: 50 domains parallel
=======================
`);
  
  // Get ALL domains at once
  const domains = await pool.query(`
    WITH recent_responses AS (
      SELECT domain_id, MAX(created_at) as last_crawled
      FROM domain_responses
      WHERE created_at > NOW() - INTERVAL '7 days'
      GROUP BY domain_id
    )
    SELECT d.id, d.domain
    FROM domains d
    LEFT JOIN recent_responses rr ON d.id = rr.domain_id
    WHERE rr.last_crawled IS NULL
    ORDER BY d.priority DESC, d.updated_at ASC
  `);
  
  console.log(`📊 Found ${domains.rows.length} domains to crawl\n`);
  
  // Process in batches of 50 for max parallel
  const batchSize = 50;
  for (let i = 0; i < domains.rows.length; i += batchSize) {
    const batch = domains.rows.slice(i, i + batchSize);
    await processDomainBatch(batch);
    
    // Check if we're past 55 minutes
    if ((Date.now() - startTime) / 1000 / 60 > 55) {
      console.log('⚠️  Approaching 1 hour limit, stopping gracefully');
      break;
    }
  }
  
  const totalTime = (Date.now() - startTime) / 1000 / 60;
  console.log(`
=======================
CRAWL COMPLETE
Domains: ${completed}
Time: ${totalTime.toFixed(1)} minutes
Rate: ${(completed / (totalTime * 60)).toFixed(1)} domains/sec
=======================
`);
  
  await pool.end();
}

emergencyCrawl().catch(console.error);