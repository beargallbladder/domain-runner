#!/usr/bin/env node

// FULL TENSOR CRAWL - 16 providers × 3 prompts × 3,249 domains
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
  { name: 'openai', dbModel: 'openai', apiModel: 'gpt-4o-mini', apiKey: process.env.OPENAI_API_KEY },
  { name: 'deepseek', dbModel: 'deepseek', apiModel: 'deepseek-chat', apiKey: process.env.DEEPSEEK_API_KEY },
  { name: 'mistral', dbModel: 'mistral', apiModel: 'mistral-small-latest', apiKey: process.env.MISTRAL_API_KEY },
  { name: 'cohere', dbModel: 'cohere', apiModel: 'command-r', apiKey: process.env.COHERE_API_KEY },
  { name: 'together', dbModel: 'together', apiModel: 'meta-llama/Llama-3-8b-chat-hf', apiKey: process.env.TOGETHER_API_KEY },
  { name: 'anthropic', dbModel: 'anthropic', apiModel: 'claude-3-haiku-20240307', apiKey: process.env.ANTHROPIC_API_KEY },
  { name: 'groq', dbModel: 'groq', apiModel: 'llama-3.2-90b-text-preview', apiKey: process.env.GROQ_API_KEY },
  { name: 'xai/grok-2', dbModel: 'xai/grok-2', apiModel: 'grok-2', apiKey: process.env.XAI_API_KEY },
  { name: 'google', dbModel: 'google', apiModel: 'gemini-1.5-flash', apiKey: process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY },
  { name: 'ai21/jamba-1.5-large', dbModel: 'ai21/jamba-1.5-large', apiModel: 'jamba-1.5-large', apiKey: process.env.AI21_API_KEY },
  { name: 'openrouter/hermes-3-llama-3.1-70b', dbModel: 'openrouter/hermes-3-llama-3.1-70b', apiModel: 'meta-llama/llama-3.1-70b-instruct', apiKey: process.env.OPENROUTER_API_KEY },
  { name: 'openai/gpt-4o-mini', dbModel: 'openai/gpt-4o-mini', apiModel: 'gpt-4o-mini', apiKey: process.env.OPENAI_API_KEY },
  
  // SEARCH-ENHANCED (4) - Using EXACT names from database
  { name: 'perplexity/llama-3.1-sonar-small-128k-online', dbModel: 'perplexity/llama-3.1-sonar-small-128k-online', apiModel: 'llama-3.1-sonar-small-128k-online', apiKey: process.env.PERPLEXITY_API_KEY },
  { name: 'perplexity/sonar-pro', dbModel: 'perplexity/sonar-pro', apiModel: 'sonar-pro', apiKey: process.env.PERPLEXITY_API_KEY },
  { name: 'perplexity/llama-3.1-sonar-large-128k-online', dbModel: 'perplexity/llama-3.1-sonar-large-128k-online', apiModel: 'llama-3.1-sonar-large-128k-online', apiKey: process.env.PERPLEXITY_API_KEY },
  { name: 'perplexity/sonar', dbModel: 'perplexity/sonar', apiModel: 'sonar', apiKey: process.env.PERPLEXITY_API_KEY }
];

// THE 3 PROMPTS (tensor analysis)
const PROMPTS = [
  "Tell me about {domain}",
  "What is the current reputation and recent news about {domain}?",
  "What are the key metrics and sentiment for {domain}?"
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

async function queryProvider(provider, domain, prompt) {
  const fullPrompt = prompt.replace('{domain}', domain);
  stats.totalCalls++;
  
  try {
    let response;
    
    // Provider-specific API calls - Check the first part of the name
    const providerType = provider.name.split('/')[0];
    
    switch(providerType) {
      case 'openai':
        response = await axios.post('https://api.openai.com/v1/chat/completions', {
          model: provider.apiModel,
          messages: [{ role: 'user', content: fullPrompt }],
          max_tokens: 300
        }, {
          headers: { 'Authorization': `Bearer ${provider.apiKey}` },
          timeout: 30000
        });
        return response.data.choices[0].message.content;
        
      case 'anthropic':
        response = await axios.post('https://api.anthropic.com/v1/messages', {
          model: provider.apiModel,
          messages: [{ role: 'user', content: fullPrompt }],
          max_tokens: 300
        }, {
          headers: { 
            'x-api-key': provider.apiKey,
            'anthropic-version': '2023-06-01'
          },
          timeout: 30000
        });
        return response.data.content[0].text;
        
      case 'perplexity':
        response = await axios.post('https://api.perplexity.ai/chat/completions', {
          model: provider.apiModel,
          messages: [{ role: 'user', content: fullPrompt }]
        }, {
          headers: { 'Authorization': `Bearer ${provider.apiKey}` },
          timeout: 30000
        });
        return response.data.choices[0].message.content;
        
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
        return response.data.choices[0].message.content;
    }
    
  } catch (error) {
    stats.providers[provider.name].failed++;
    stats.providers[provider.name].errors.push(error.message);
    stats.failed++;
    console.error(`❌ ${provider.name} failed for ${domain}: ${error.message}`);
    return null;
  }
}

async function calculateSentiment(text) {
  // Simple sentiment scoring (you have more sophisticated version)
  const positive = (text.match(/good|great|excellent|leader|innovative|successful/gi) || []).length;
  const negative = (text.match(/bad|poor|failing|scandal|lawsuit|problem/gi) || []).length;
  const score = 50 + (positive * 5) - (negative * 5);
  return Math.max(0, Math.min(100, score));
}

async function crawlDomain(domainRow) {
  console.log(`\n🔄 Crawling ${domainRow.domain} (ID: ${domainRow.id})`);
  
  for (const provider of PROVIDERS) {
    if (!provider.apiKey) {
      console.log(`⚠️  Skipping ${provider.name} - no API key`);
      continue;
    }
    
    for (const prompt of PROMPTS) {
      const response = await queryProvider(provider, domainRow.domain, prompt);
      
      if (response) {
        const sentiment = await calculateSentiment(response);
        
        // Store in database
        try {
          await pool.query(`
            INSERT INTO domain_responses (domain_id, model, response, sentiment_score, memory_score, created_at)
            VALUES ($1, $2, $3, $4, $5, NOW())
            ON CONFLICT (domain_id, model) 
            DO UPDATE SET 
              response = $3,
              sentiment_score = $4,
              memory_score = $5,
              created_at = NOW()
          `, [domainRow.id, provider.dbModel, response, sentiment, sentiment]);
          
          stats.providers[provider.name].success++;
          stats.successful++;
          console.log(`✅ ${provider.name}: Score ${sentiment}`);
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
🚀 STARTING FULL TENSOR CRAWL
=====================================
Domains: 3,249
Providers: 16 (12 base + 4 search)
Prompts per domain: 3
Total API calls: 155,952
Estimated cost: $141.46
Estimated time: 3-4 hours
=====================================
  `);
  
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
  
  // Get domains
  const domains = await pool.query('SELECT id, domain FROM domains ORDER BY id LIMIT 10'); // Start with 10 for testing
  console.log(`\n📊 Found ${domains.rows.length} domains to crawl`);
  
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