#!/usr/bin/env node

// ULTRA FAST TENSOR CRAWL - Maximum parallelization for 1-hour SLA
const { Pool } = require('pg');
const axios = require('axios');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://raw_capture_db_user:wjFesUM8ISNEvE2b4kZtRAKgGYJVtKK5@dpg-d11fqgndiees73fb35dg-a.oregon-postgres.render.com/raw_capture_db',
  ssl: { rejectUnauthorized: false },
  max: 50 // Maximum connections
});

// Will be populated based on test results
const PROVIDERS = [];

// Quick provider implementations
const providerImplementations = {
  openai: async (apiKey, prompt) => {
    const r = await axios.post('https://api.openai.com/v1/chat/completions', {
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 150,
      temperature: 0.3
    }, {
      headers: { 'Authorization': `Bearer ${apiKey}` },
      timeout: 8000
    });
    return r.data.choices[0].message.content;
  },
  
  anthropic: async (apiKey, prompt) => {
    const r = await axios.post('https://api.anthropic.com/v1/messages', {
      model: 'claude-3-haiku-20240307',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 150
    }, {
      headers: { 
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      timeout: 8000
    });
    return r.data.content[0].text;
  },
  
  openrouter: async (apiKey, prompt) => {
    const r = await axios.post('https://openrouter.ai/api/v1/chat/completions', {
      model: 'meta-llama/llama-3.1-70b-instruct',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 150
    }, {
      headers: { 
        'Authorization': `Bearer ${apiKey}`,
        'HTTP-Referer': 'https://llmpagerank.com'
      },
      timeout: 12000
    });
    return r.data.choices[0].message.content;
  },
  
  groq: async (apiKey, prompt) => {
    const r = await axios.post('https://api.groq.com/openai/v1/chat/completions', {
      model: 'mixtral-8x7b-32768', // Fast model
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 150
    }, {
      headers: { 'Authorization': `Bearer ${apiKey}` },
      timeout: 5000
    });
    return r.data.choices[0].message.content;
  },
  
  deepseek: async (apiKey, prompt) => {
    const r = await axios.post('https://api.deepseek.com/v1/chat/completions', {
      model: 'deepseek-chat',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 150
    }, {
      headers: { 'Authorization': `Bearer ${apiKey}` },
      timeout: 8000
    });
    return r.data.choices[0].message.content;
  },
  
  together: async (apiKey, prompt) => {
    const r = await axios.post('https://api.together.xyz/v1/chat/completions', {
      model: 'meta-llama/Llama-3-8b-chat-hf',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 150
    }, {
      headers: { 'Authorization': `Bearer ${apiKey}` },
      timeout: 8000
    });
    return r.data.choices[0].message.content;
  }
};

// Initialize providers based on what's actually working
function initProviders() {
  if (process.env.OPENAI_API_KEY) {
    PROVIDERS.push({ name: 'openai', model: 'openai/gpt-4o-mini', apiKey: process.env.OPENAI_API_KEY });
  }
  if (process.env.ANTHROPIC_API_KEY) {
    PROVIDERS.push({ name: 'anthropic', model: 'anthropic/claude-3-haiku', apiKey: process.env.ANTHROPIC_API_KEY });
  }
  if (process.env.OPENROUTER_API_KEY) {
    PROVIDERS.push({ name: 'openrouter', model: 'openrouter/hermes-3', apiKey: process.env.OPENROUTER_API_KEY });
  }
  if (process.env.GROQ_API_KEY) {
    PROVIDERS.push({ name: 'groq', model: 'groq/mixtral-8x7b', apiKey: process.env.GROQ_API_KEY });
  }
  if (process.env.DEEPSEEK_API_KEY) {
    PROVIDERS.push({ name: 'deepseek', model: 'deepseek/chat', apiKey: process.env.DEEPSEEK_API_KEY });
  }
  if (process.env.TOGETHER_API_KEY) {
    PROVIDERS.push({ name: 'together', model: 'together/llama-3-8b', apiKey: process.env.TOGETHER_API_KEY });
  }
}

const PROMPT_TEMPLATE = 'Analyze {domain}: business potential, market position, technical needs. 100 words max.';
const batchId = `ultra_fast_${Date.now()}`;
let stats = {
  completed: 0,
  successful: 0,
  failed: 0,
  startTime: Date.now()
};

async function processDomain(domain, domainId) {
  const prompt = PROMPT_TEMPLATE.replace('{domain}', domain);
  const promises = [];
  
  for (const provider of PROVIDERS) {
    promises.push(
      providerImplementations[provider.name](provider.apiKey, prompt)
        .then(async (response) => {
          await pool.query(`
            INSERT INTO domain_responses (
              domain_id, model, prompt_type, prompt, response, 
              created_at, batch_id, response_time_ms
            ) VALUES ($1, $2, $3, $4, $5, NOW(), $6, $7)
          `, [
            domainId, provider.model, 'tensor_analysis', 
            prompt, response, batchId, Date.now() - stats.startTime
          ]);
          stats.successful++;
        })
        .catch(err => {
          stats.failed++;
        })
    );
  }
  
  await Promise.allSettled(promises);
  stats.completed++;
}

async function ultraFastCrawl() {
  initProviders();
  
  console.log(`
🚀 ULTRA FAST TENSOR CRAWL
==========================
Providers: ${PROVIDERS.length}
Parallelization: 100 domains concurrent
Target: 3,249 domains in < 60 minutes
==========================
`);
  
  if (PROVIDERS.length === 0) {
    console.error('❌ NO WORKING PROVIDERS! Check API keys!');
    process.exit(1);
  }
  
  // Get ALL domains needing crawl
  const result = await pool.query(`
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
    ORDER BY d.priority DESC NULLS LAST, d.updated_at ASC
  `);
  
  const domains = result.rows;
  console.log(`📊 Processing ${domains.length} domains...\n`);
  
  // Process 100 domains at a time for maximum speed
  const BATCH_SIZE = 100;
  
  for (let i = 0; i < domains.length; i += BATCH_SIZE) {
    const batch = domains.slice(i, i + BATCH_SIZE);
    const batchPromises = batch.map(d => processDomain(d.domain, d.id));
    
    await Promise.allSettled(batchPromises);
    
    // Progress update
    const elapsed = (Date.now() - stats.startTime) / 1000;
    const rate = stats.completed / elapsed;
    const remaining = domains.length - stats.completed;
    const eta = remaining / rate / 60;
    
    console.log(`⚡ Progress: ${stats.completed}/${domains.length} | Rate: ${rate.toFixed(1)} domains/sec | ETA: ${eta.toFixed(1)} min`);
    console.log(`   Success: ${stats.successful} | Failed: ${stats.failed}`);
    
    // Emergency stop at 58 minutes
    if (elapsed / 60 > 58) {
      console.log('⏰ Approaching 1-hour limit, stopping!');
      break;
    }
  }
  
  const totalTime = (Date.now() - stats.startTime) / 1000 / 60;
  console.log(`
==========================
CRAWL COMPLETE
Domains: ${stats.completed}
Successful calls: ${stats.successful}
Failed calls: ${stats.failed}
Time: ${totalTime.toFixed(1)} minutes
Rate: ${(stats.completed / (totalTime * 60)).toFixed(1)} domains/sec
==========================
`);
  
  await pool.end();
}

ultraFastCrawl().catch(console.error);