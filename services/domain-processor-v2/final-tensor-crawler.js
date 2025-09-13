#!/usr/bin/env node

// FINAL TENSOR CRAWLER - 9 working providers, maximum speed for 1-hour SLA
const { Pool } = require('pg');
const axios = require('axios');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://raw_capture_db_user:wjFesUM8ISNEvE2b4kZtRAKgGYJVtKK5@dpg-d11fqgndiees73fb35dg-a.oregon-postgres.render.com/raw_capture_db',
  ssl: { rejectUnauthorized: false },
  max: 50
});

// 9 CONFIRMED WORKING PROVIDERS
const PROVIDERS = [
  { name: 'openai', model: 'openai/gpt-4o-mini', apiKey: process.env.OPENAI_API_KEY },
  { name: 'anthropic', model: 'anthropic/claude-3-haiku', apiKey: process.env.ANTHROPIC_API_KEY },
  { name: 'deepseek', model: 'deepseek/deepseek-chat', apiKey: process.env.DEEPSEEK_API_KEY },
  { name: 'mistral', model: 'mistral/mistral-small-latest', apiKey: process.env.MISTRAL_API_KEY },
  { name: 'cohere', model: 'cohere/command-r', apiKey: process.env.COHERE_API_KEY },
  { name: 'together', model: 'together/llama-3-8b-chat', apiKey: process.env.TOGETHER_API_KEY },
  { name: 'groq', model: 'groq/llama3-8b-8192', apiKey: process.env.GROQ_API_KEY },
  { name: 'google', model: 'google/gemini-1.5-flash', apiKey: process.env.GOOGLE_API_KEY },
  { name: 'openrouter', model: 'openrouter/hermes-3-llama-3.1-70b', apiKey: process.env.OPENROUTER_API_KEY }
];

const PROMPT = 'Analyze {domain} for business potential, market position, and technical requirements. Be concise (150 words max).';
const batchId = `tensor_${Date.now()}`;

let stats = {
  domains: 0,
  apiCalls: 0,
  successful: 0,
  failed: 0,
  startTime: Date.now()
};

async function callProvider(provider, domain, domainId) {
  const prompt = PROMPT.replace('{domain}', domain);
  
  try {
    let response;
    const startTime = Date.now();
    
    switch(provider.name) {
      case 'openai':
        response = await axios.post('https://api.openai.com/v1/chat/completions', {
          model: 'gpt-4o-mini',
          messages: [{ role: 'user', content: prompt }],
          max_tokens: 150
        }, {
          headers: { 'Authorization': `Bearer ${provider.apiKey}` },
          timeout: 10000
        });
        response = response.data.choices[0].message.content;
        break;
        
      case 'anthropic':
        const r1 = await axios.post('https://api.anthropic.com/v1/messages', {
          model: 'claude-3-haiku-20240307',
          messages: [{ role: 'user', content: prompt }],
          max_tokens: 150
        }, {
          headers: { 
            'x-api-key': provider.apiKey,
            'anthropic-version': '2023-06-01'
          },
          timeout: 10000
        });
        response = r1.data.content[0].text;
        break;
        
      case 'deepseek':
        response = await axios.post('https://api.deepseek.com/v1/chat/completions', {
          model: 'deepseek-chat',
          messages: [{ role: 'user', content: prompt }],
          max_tokens: 150
        }, {
          headers: { 'Authorization': `Bearer ${provider.apiKey}` },
          timeout: 10000
        });
        response = response.data.choices[0].message.content;
        break;
        
      case 'mistral':
        response = await axios.post('https://api.mistral.ai/v1/chat/completions', {
          model: 'mistral-small-latest',
          messages: [{ role: 'user', content: prompt }],
          max_tokens: 150
        }, {
          headers: { 'Authorization': `Bearer ${provider.apiKey}` },
          timeout: 10000
        });
        response = response.data.choices[0].message.content;
        break;
        
      case 'cohere':
        response = await axios.post('https://api.cohere.ai/v1/chat', {
          model: 'command-r',
          message: prompt,
          max_tokens: 150
        }, {
          headers: { 'Authorization': `Bearer ${provider.apiKey}` },
          timeout: 10000
        });
        response = response.data.text;
        break;
        
      case 'together':
        response = await axios.post('https://api.together.xyz/v1/chat/completions', {
          model: 'meta-llama/Llama-3-8b-chat-hf',
          messages: [{ role: 'user', content: prompt }],
          max_tokens: 150
        }, {
          headers: { 'Authorization': `Bearer ${provider.apiKey}` },
          timeout: 10000
        });
        response = response.data.choices[0].message.content;
        break;
        
      case 'groq':
        response = await axios.post('https://api.groq.com/openai/v1/chat/completions', {
          model: 'llama3-8b-8192',
          messages: [{ role: 'user', content: prompt }],
          max_tokens: 150
        }, {
          headers: { 'Authorization': `Bearer ${provider.apiKey}` },
          timeout: 8000
        });
        response = response.data.choices[0].message.content;
        break;
        
      case 'google':
        const gr = await axios.post(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${provider.apiKey}`,
          {
            contents: [{
              parts: [{ text: prompt }]
            }]
          },
          { timeout: 10000 }
        );
        response = gr.data.candidates[0].content.parts[0].text;
        break;
        
      case 'openrouter':
        response = await axios.post('https://openrouter.ai/api/v1/chat/completions', {
          model: 'meta-llama/llama-3.1-70b-instruct',
          messages: [{ role: 'user', content: prompt }]
        }, {
          headers: { 
            'Authorization': `Bearer ${provider.apiKey}`,
            'HTTP-Referer': 'https://llmpagerank.com'
          },
          timeout: 15000
        });
        response = response.data.choices[0].message.content;
        break;
    }
    
    const responseTime = Date.now() - startTime;
    
    // Store in database
    await pool.query(`
      INSERT INTO domain_responses (
        domain_id, model, prompt_type, prompt, response, 
        created_at, batch_id, response_time_ms
      ) VALUES ($1, $2, $3, $4, $5, NOW(), $6, $7)
    `, [
      domainId, provider.model, 'tensor_analysis', 
      prompt, response, batchId, responseTime
    ]);
    
    stats.successful++;
    return true;
    
  } catch (error) {
    stats.failed++;
    return false;
  }
}

async function processDomainBatch(domains) {
  const promises = [];
  
  for (const domain of domains) {
    for (const provider of PROVIDERS) {
      stats.apiCalls++;
      promises.push(callProvider(provider, domain.domain, domain.id));
    }
    stats.domains++;
  }
  
  await Promise.allSettled(promises);
}

async function main() {
  console.log(`
🚀 FINAL TENSOR CRAWLER - 9 PROVIDERS
======================================
Providers: ${PROVIDERS.map(p => p.name).join(', ')}
Target: 3,249 domains × 9 providers = 29,241 API calls
Batch size: 50 domains (450 parallel calls)
SLA: Complete in < 60 minutes
======================================
`);
  
  // Get all domains needing crawl
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
    ORDER BY d.priority DESC NULLS LAST
  `);
  
  const allDomains = result.rows;
  console.log(`\n📊 Found ${allDomains.length} domains to crawl\n`);
  
  const BATCH_SIZE = 50; // 50 domains × 9 providers = 450 parallel API calls
  
  for (let i = 0; i < allDomains.length; i += BATCH_SIZE) {
    const batch = allDomains.slice(i, i + BATCH_SIZE);
    await processDomainBatch(batch);
    
    // Progress
    const elapsed = (Date.now() - stats.startTime) / 1000;
    const domainsPerSec = stats.domains / elapsed;
    const remaining = allDomains.length - stats.domains;
    const eta = remaining / domainsPerSec / 60;
    
    console.log(`⚡ Batch ${Math.floor(i/BATCH_SIZE) + 1}: ${stats.domains}/${allDomains.length} domains`);
    console.log(`   Rate: ${domainsPerSec.toFixed(1)} domains/sec | ETA: ${eta.toFixed(1)} min`);
    console.log(`   API calls: ${stats.successful} success, ${stats.failed} failed\n`);
    
    // Stop at 58 minutes to be safe
    if (elapsed > 3480) {
      console.log('⏰ Approaching 1-hour limit, stopping gracefully');
      break;
    }
  }
  
  const totalTime = (Date.now() - stats.startTime) / 1000 / 60;
  
  console.log(`
======================================
✅ CRAWL COMPLETE
======================================
Domains processed: ${stats.domains}
Successful API calls: ${stats.successful}
Failed API calls: ${stats.failed}
Success rate: ${((stats.successful / stats.apiCalls) * 100).toFixed(1)}%
Total time: ${totalTime.toFixed(1)} minutes
Average: ${(stats.domains / (totalTime * 60)).toFixed(1)} domains/sec
======================================
`);
  
  await pool.end();
  process.exit(0);
}

main().catch(console.error);