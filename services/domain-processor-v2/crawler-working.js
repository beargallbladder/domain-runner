#!/usr/bin/env node

// FIXED CRAWLER - Matches the working Python crawler schema
const { Pool } = require('pg');
const axios = require('axios');

// Database - Use the Render PostgreSQL
const pool = new Pool({
  connectionString: 'postgresql://raw_capture_db_user:wjFesUM8ISNEvE2b4kZtRAKgGYJVtKK5@dpg-d11fqgndiees73fb35dg-a.oregon-postgres.render.com/raw_capture_db',
  ssl: { rejectUnauthorized: false }
});

// THE 16 PROVIDERS WE HIT - EXACT DB NAMES
const PROVIDERS = [
  // BASE LLMs (12) - Using EXACT names from database
  { name: 'openai', dbModel: 'openai/gpt-4o-mini', apiModel: 'gpt-4o-mini', apiKey: process.env.OPENAI_API_KEY },
  { name: 'deepseek', dbModel: 'deepseek/deepseek-chat', apiModel: 'deepseek-chat', apiKey: process.env.DEEPSEEK_API_KEY },
  { name: 'mistral', dbModel: 'mistral/mistral-small-latest', apiModel: 'mistral-small-latest', apiKey: process.env.MISTRAL_API_KEY },
  { name: 'cohere', dbModel: 'cohere/command-r', apiModel: 'command-r', apiKey: process.env.COHERE_API_KEY },
  { name: 'together', dbModel: 'together/llama-3-8b-chat', apiModel: 'meta-llama/Llama-3-8b-chat-hf', apiKey: process.env.TOGETHER_API_KEY },
  { name: 'anthropic', dbModel: 'anthropic/claude-3-haiku', apiModel: 'claude-3-haiku-20240307', apiKey: process.env.ANTHROPIC_API_KEY },
  { name: 'groq', dbModel: 'groq/llama-3.2-90b', apiModel: 'llama-3.2-90b-text-preview', apiKey: process.env.GROQ_API_KEY },
  { name: 'xai', dbModel: 'xai/grok-2', apiModel: 'grok-2', apiKey: process.env.XAI_API_KEY },
  { name: 'google', dbModel: 'google/gemini-1.5-flash', apiModel: 'gemini-1.5-flash', apiKey: process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY },
  { name: 'ai21', dbModel: 'ai21/jamba-1.5-large', apiModel: 'jamba-1.5-large', apiKey: process.env.AI21_API_KEY },
  { name: 'openrouter', dbModel: 'openrouter/hermes-3-llama-3.1-70b', apiModel: 'meta-llama/llama-3.1-70b-instruct', apiKey: process.env.OPENROUTER_API_KEY },
  
  // SEARCH-ENHANCED (4) - Using EXACT names from database
  { name: 'perplexity', dbModel: 'perplexity/llama-3.1-sonar-small-128k-online', apiModel: 'llama-3.1-sonar-small-128k-online', apiKey: process.env.PERPLEXITY_API_KEY },
  { name: 'perplexity-pro', dbModel: 'perplexity/sonar-pro', apiModel: 'sonar-pro', apiKey: process.env.PERPLEXITY_API_KEY },
  { name: 'perplexity-large', dbModel: 'perplexity/llama-3.1-sonar-large-128k-online', apiModel: 'llama-3.1-sonar-large-128k-online', apiKey: process.env.PERPLEXITY_API_KEY },
  { name: 'perplexity-sonar', dbModel: 'perplexity/sonar', apiModel: 'sonar', apiKey: process.env.PERPLEXITY_API_KEY }
];

// THE 3 PROMPT TYPES (matching Python crawler)
const PROMPTS = [
  { type: 'business_analysis', template: 'Analyze the business potential and market position of {domain}. Provide comprehensive insights.' },
  { type: 'content_strategy', template: 'Develop a content and SEO strategy for {domain}. Include competitive analysis.' },
  { type: 'technical_assessment', template: 'Assess the technical implementation and infrastructure needs for {domain}.' }
];

// Stats tracking
let stats = {
  totalCalls: 0,
  successful: 0,
  failed: 0,
  startTime: Date.now(),
  providers: {}
};

PROVIDERS.forEach(p => {
  stats.providers[p.name] = { success: 0, failed: 0, errors: [] };
});

// Create batch ID for this run
const batchId = `js_crawler_${new Date().toISOString().replace(/[:.]/g, '_')}`;

async function ensureTableSchema() {
  /**
   * Ensure the domain_responses table has the correct schema
   * that matches the working Python crawlers
   */
  console.log('🔧 Ensuring database schema is correct...');
  
  try {
    // Add missing columns if they don't exist
    await pool.query(`
      ALTER TABLE domain_responses 
      ADD COLUMN IF NOT EXISTS prompt_type VARCHAR(50),
      ADD COLUMN IF NOT EXISTS prompt TEXT,
      ADD COLUMN IF NOT EXISTS response_time_ms INTEGER,
      ADD COLUMN IF NOT EXISTS retry_count INTEGER DEFAULT 0,
      ADD COLUMN IF NOT EXISTS quality_flag VARCHAR(50),
      ADD COLUMN IF NOT EXISTS processing_timestamp TIMESTAMP DEFAULT NOW(),
      ADD COLUMN IF NOT EXISTS batch_id VARCHAR(100)
    `);
    
    console.log('✅ Database schema verified/updated');
  } catch (error) {
    console.error('❌ Schema update error:', error.message);
    throw error;
  }
}

async function queryProvider(provider, domain, promptType, prompt) {
  const fullPrompt = prompt.replace('{domain}', domain);
  stats.totalCalls++;
  const startTime = Date.now();
  
  try {
    let response;
    
    // Provider-specific API calls - Check the first part of the name
    const providerType = provider.name.split('/')[0];
    
    switch(providerType) {
      case 'openai':
        response = await axios.post('https://api.openai.com/v1/chat/completions', {
          model: provider.apiModel,
          messages: [{ role: 'user', content: fullPrompt }],
          max_tokens: 500
        }, {
          headers: { 'Authorization': `Bearer ${provider.apiKey}` },
          timeout: 30000
        });
        return {
          content: response.data.choices[0].message.content,
          responseTime: Date.now() - startTime
        };
        
      case 'anthropic':
        response = await axios.post('https://api.anthropic.com/v1/messages', {
          model: provider.apiModel,
          messages: [{ role: 'user', content: fullPrompt }],
          max_tokens: 500
        }, {
          headers: { 
            'x-api-key': provider.apiKey,
            'anthropic-version': '2023-06-01'
          },
          timeout: 30000
        });
        return {
          content: response.data.content[0].text,
          responseTime: Date.now() - startTime
        };
        
      case 'perplexity':
        response = await axios.post('https://api.perplexity.ai/chat/completions', {
          model: provider.apiModel,
          messages: [{ role: 'user', content: fullPrompt }]
        }, {
          headers: { 'Authorization': `Bearer ${provider.apiKey}` },
          timeout: 30000
        });
        return {
          content: response.data.choices[0].message.content,
          responseTime: Date.now() - startTime
        };
        
      case 'groq':
        response = await axios.post('https://api.groq.com/openai/v1/chat/completions', {
          model: provider.apiModel,
          messages: [{ role: 'user', content: fullPrompt }],
          max_tokens: 500
        }, {
          headers: { 'Authorization': `Bearer ${provider.apiKey}` },
          timeout: 30000
        });
        return {
          content: response.data.choices[0].message.content,
          responseTime: Date.now() - startTime
        };
        
      // Add other providers...
      default:
        // OpenRouter fallback for providers we route through them
        response = await axios.post('https://openrouter.ai/api/v1/chat/completions', {
          model: provider.apiModel,
          messages: [{ role: 'user', content: fullPrompt }]
        }, {
          headers: { 
            'Authorization': `Bearer ${provider.apiKey}`,
            'HTTP-Referer': 'https://llmpagerank.com'
          },
          timeout: 30000
        });
        return {
          content: response.data.choices[0].message.content,
          responseTime: Date.now() - startTime
        };
    }
    
  } catch (error) {
    stats.providers[provider.name].failed++;
    stats.providers[provider.name].errors.push(error.message);
    stats.failed++;
    console.error(`❌ ${provider.name} failed for ${domain}: ${error.message}`);
    return null;
  }
}

async function crawlDomain(domainRow) {
  console.log(`\n🔄 Crawling ${domainRow.domain} (ID: ${domainRow.id})`);
  
  for (const provider of PROVIDERS) {
    if (!provider.apiKey) {
      console.log(`⚠️  Skipping ${provider.name} - no API key`);
      continue;
    }
    
    for (const promptConfig of PROMPTS) {
      const result = await queryProvider(provider, domainRow.domain, promptConfig.type, promptConfig.template);
      
      if (result && result.content) {
        // Store in database with CORRECT SCHEMA
        try {
          await pool.query(`
            INSERT INTO domain_responses (
              domain_id, model, prompt_type, prompt, response, 
              created_at, response_time_ms, retry_count, 
              quality_flag, processing_timestamp, batch_id
            ) 
            VALUES ($1, $2, $3, $4, $5, NOW(), $6, 0, $7, NOW(), $8)
            ON CONFLICT DO NOTHING
          `, [
            domainRow.id, 
            provider.dbModel, 
            promptConfig.type,
            promptConfig.template.replace('{domain}', domainRow.domain),
            result.content, 
            result.responseTime,
            'js_crawler_fixed',
            batchId
          ]);
          
          stats.providers[provider.name].success++;
          stats.successful++;
          console.log(`✅ ${provider.name} (${promptConfig.type}): Success`);
        } catch (dbError) {
          console.error(`❌ DB error for ${provider.name}: ${dbError.message}`);
        }
      }
      
      // Rate limiting
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }
}

async function startCrawl() {
  console.log(`
🚀 STARTING FIXED JAVASCRIPT CRAWLER
=====================================
Batch ID: ${batchId}
Schema: FIXED to match Python crawlers
Providers: ${PROVIDERS.length}
Prompts per domain: ${PROMPTS.length}
=====================================
  `);
  
  // Ensure database schema is correct
  await ensureTableSchema();
  
  // Check API keys
  console.log('\n🔑 Checking API keys...');
  let missingKeys = [];
  for (const provider of PROVIDERS) {
    if (!provider.apiKey) {
      missingKeys.push(provider.name);
    } else {
      console.log(`✅ ${provider.name}: API key found`);
    }
  }
  
  if (missingKeys.length > 0) {
    console.log(`\n⚠️  Missing API keys for: ${missingKeys.join(', ')}`);
    console.log('Continuing with available providers...\n');
  }
  
  // Force fresh crawl - get domains that haven't been crawled recently
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
    ORDER BY d.updated_at ASC
    LIMIT 100
  `);
  
  console.log(`\n📊 Found ${domains.rows.length} domains to crawl`);
  
  if (domains.rows.length === 0) {
    console.log('✅ All domains are already processed!');
    await pool.end();
    return;
  }
  
  // Crawl each domain
  for (const domain of domains.rows) {
    await crawlDomain(domain);
    
    // Progress update
    const elapsed = (Date.now() - stats.startTime) / 1000;
    const rate = stats.successful / elapsed;
    console.log(`\n📈 Progress: ${stats.successful}/${stats.totalCalls} calls (${rate.toFixed(1)}/sec)`);
  }
  
  // Final stats
  const totalTime = (Date.now() - stats.startTime) / 1000 / 60;
  console.log(`
=====================================
✅ CRAWL COMPLETE
=====================================
Batch ID: ${batchId}
Total calls: ${stats.totalCalls}
Successful: ${stats.successful}
Failed: ${stats.failed}
Success rate: ${((stats.successful / stats.totalCalls) * 100).toFixed(1)}%
Total time: ${totalTime.toFixed(1)} minutes

Provider breakdown:
${Object.entries(stats.providers).map(([name, data]) => 
  `  ${name}: ${data.success} success, ${data.failed} failed`
).join('\n')}
=====================================
  `);
  
  await pool.end();
}

// Start the crawl
startCrawl().catch(console.error);