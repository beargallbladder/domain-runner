const { Pool } = require('pg');
const axios = require('axios');

// ULTRA HIGH-CONCURRENCY TENSOR PROCESSOR
// Uses ALL 16 API keys with provider-specific throttling
console.log('🚀 ULTRA TENSOR PROCESSOR - ALL 8 MODELS × ALL DOMAINS');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || "postgresql://raw_capture_db_user:wjFesUM8ISNEvE2b4kZtRAKgGYJVtKK5@dpg-d11fqgndiees73fb35dg-a.oregon-postgres.render.com/raw_capture_db",
  ssl: { rejectUnauthorized: false },
  max: 20
});

// PROVIDER-SPECIFIC RATE LIMITS & CONFIGURATIONS
const AI_PROVIDERS = [
  // OPENAI - 500 RPM per key
  {
    name: 'openai',
    model: 'gpt-4o-mini',
    keys: [process.env.OPENAI_API_KEY, process.env.OPENAI_API_KEY2],
    endpoint: 'https://api.openai.com/v1/chat/completions',
    rpm_per_key: 500,
    delay_ms: 120, // 60000ms / 500 = 120ms between requests per key
    format: 'openai'
  },
  // ANTHROPIC - 50 RPM per key (strict limits!)
  {
    name: 'anthropic', 
    model: 'claude-3-5-sonnet-20241022',
    keys: [process.env.ANTHROPIC_API_KEY, process.env.ANTHROPIC_API_KEY2],
    endpoint: 'https://api.anthropic.com/v1/messages',
    rpm_per_key: 50,
    delay_ms: 1200, // 60000ms / 50 = 1200ms between requests per key
    format: 'anthropic'
  },
  // DEEPSEEK - 60 RPM per key
  {
    name: 'deepseek',
    model: 'deepseek-chat', 
    keys: [process.env.DEEPSEEK_API_KEY, process.env.DEEPSEEK_API_KEY2],
    endpoint: 'https://api.deepseek.com/v1/chat/completions',
    rpm_per_key: 60,
    delay_ms: 1000, // 60000ms / 60 = 1000ms between requests per key
    format: 'openai'
  },
  // MISTRAL - 100 RPM per key
  {
    name: 'mistral',
    model: 'mistral-large-latest',
    keys: [process.env.MISTRAL_API_KEY, process.env.MISTRAL_API_KEY2], 
    endpoint: 'https://api.mistral.ai/v1/chat/completions',
    rpm_per_key: 100,
    delay_ms: 600, // 60000ms / 100 = 600ms between requests per key
    format: 'openai'
  },
  // XAI - 60 RPM per key
  {
    name: 'xai',
    model: 'grok-2-1212',
    keys: [process.env.XAI_API_KEY, process.env.XAI_API_KEY2],
    endpoint: 'https://api.x.ai/v1/chat/completions', 
    rpm_per_key: 60,
    delay_ms: 1000, // 60000ms / 60 = 1000ms between requests per key
    format: 'openai'
  },
  // TOGETHER - 60 RPM per key
  {
    name: 'together',
    model: 'meta-llama/Meta-Llama-3.1-8B-Instruct-Turbo',
    keys: [process.env.TOGETHER_API_KEY, process.env.TOGETHER_API_KEY2],
    endpoint: 'https://api.together.xyz/v1/chat/completions',
    rpm_per_key: 60, 
    delay_ms: 1000, // 60000ms / 60 = 1000ms between requests per key
    format: 'openai'
  },
  // PERPLEXITY - 20 RPM per key (very strict!)
  {
    name: 'perplexity',
    model: 'llama-3.1-sonar-small-128k-online', 
    keys: [process.env.PERPLEXITY_API_KEY, process.env.PERPLEXITY_API_KEY2],
    endpoint: 'https://api.perplexity.ai/chat/completions',
    rpm_per_key: 20,
    delay_ms: 3000, // 60000ms / 20 = 3000ms between requests per key
    format: 'openai'
  },
  // GOOGLE - 60 RPM per key
  {
    name: 'google',
    model: 'gemini-pro',
    keys: [process.env.GOOGLE_API_KEY, process.env.GOOGLE_API_KEY2],
    endpoint: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent',
    rpm_per_key: 60,
    delay_ms: 1000, // 60000ms / 60 = 1000ms between requests per key
    format: 'google'
  }
].filter(p => p.keys[0] && p.keys[1]); // Only use providers with BOTH keys

// Track last request time for each key
const keyTimestamps = new Map();

// Initialize all key timestamps
AI_PROVIDERS.forEach(provider => {
  provider.keys.forEach(key => {
    if (key) keyTimestamps.set(key, 0);
  });
});

console.log(`🔧 Configured ${AI_PROVIDERS.length} providers with ${AI_PROVIDERS.reduce((sum, p) => sum + p.keys.filter(k => k).length, 0)} total API keys`);

// THROTTLED API CALL WITH KEY ROTATION
async function makeThrottledCall(provider, domain, prompt) {
  // Find the key that's been idle longest
  let bestKey = null;
  let oldestTime = Date.now();
  
  for (const key of provider.keys) {
    if (!key) continue;
    const lastUsed = keyTimestamps.get(key) || 0;
    if (lastUsed < oldestTime) {
      oldestTime = lastUsed;
      bestKey = key;
    }
  }
  
  if (!bestKey) {
    throw new Error(`No available keys for ${provider.name}`);
  }
  
  // Calculate required wait time
  const now = Date.now();
  const timeSinceLastUse = now - oldestTime;
  const requiredDelay = provider.delay_ms;
  
  if (timeSinceLastUse < requiredDelay) {
    const waitTime = requiredDelay - timeSinceLastUse;
    console.log(`⏳ ${provider.name}: waiting ${waitTime}ms for rate limit`);
    await new Promise(resolve => setTimeout(resolve, waitTime));
  }
  
  // Update timestamp
  keyTimestamps.set(bestKey, Date.now());
  
  // Build request
  const payload = buildPayload(provider, domain, prompt);
  const headers = buildHeaders(provider, bestKey);
  
  try {
    const response = await axios.post(provider.endpoint, payload, { 
      headers,
      timeout: 30000
    });
    
    const content = extractContent(response.data, provider);
    console.log(`✅ ${provider.name}: ${domain} processed`);
    return {
      success: true,
      model: `${provider.name}/${provider.model}`,
      content,
      provider: provider.name
    };
    
  } catch (error) {
    console.error(`❌ ${provider.name}: ${domain} failed - ${error.message}`);
    return {
      success: false,
      model: `${provider.name}/${provider.model}`,
      error: error.message,
      provider: provider.name
    };
  }
}

// BUILD REQUEST PAYLOAD
function buildPayload(provider, domain, prompt) {
  const fullPrompt = `${prompt}\n\nDomain: ${domain}`;
  
  switch (provider.format) {
    case 'openai':
      return {
        model: provider.model,
        messages: [{ role: 'user', content: fullPrompt }],
        max_tokens: 500,
        temperature: 0.7
      };
      
    case 'anthropic':
      return {
        model: provider.model,
        messages: [{ role: 'user', content: fullPrompt }],
        max_tokens: 500
      };
      
    case 'google':
      return {
        contents: [{
          parts: [{ text: fullPrompt }]
        }]
      };
      
    default:
      throw new Error(`Unknown format: ${provider.format}`);
  }
}

// BUILD REQUEST HEADERS
function buildHeaders(provider, apiKey) {
  const headers = { 'Content-Type': 'application/json' };
  
  switch (provider.format) {
    case 'openai':
      headers['Authorization'] = `Bearer ${apiKey}`;
      break;
      
    case 'anthropic':
      headers['x-api-key'] = apiKey;
      headers['anthropic-version'] = '2023-06-01';
      break;
      
    case 'google':
      // Google uses API key in URL
      break;
  }
  
  return headers;
}

// EXTRACT CONTENT FROM RESPONSE
function extractContent(data, provider) {
  switch (provider.format) {
    case 'openai':
      return data.choices?.[0]?.message?.content || 'No content';
      
    case 'anthropic':
      return data.content?.[0]?.text || 'No content';
      
    case 'google':
      return data.candidates?.[0]?.content?.parts?.[0]?.text || 'No content';
      
    default:
      return 'Unknown format';
  }
}

// PROCESS DOMAINS IN HIGH-CONCURRENCY BATCHES
async function processDomainsUltraFast() {
  console.log('🚀 Starting ULTRA-FAST domain processing...');
  
  // Get all pending domains
  const result = await pool.query(
    'SELECT id, domain FROM domains WHERE status = $1 ORDER BY updated_at ASC LIMIT 500',
    ['pending']
  );
  
  if (result.rows.length === 0) {
    console.log('✅ No pending domains found');
    return { processed: 0, errors: 0 };
  }
  
  console.log(`📊 Processing ${result.rows.length} domains with ${AI_PROVIDERS.length} providers`);
  
  let processed = 0;
  let errors = 0;
  const prompts = ['business_analysis', 'content_strategy', 'technical_assessment'];
  
  // Process domains in batches of 50 to avoid overwhelming the system
  const batchSize = 50;
  for (let i = 0; i < result.rows.length; i += batchSize) {
    const batch = result.rows.slice(i, i + batchSize);
    console.log(`🔄 Processing batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(result.rows.length/batchSize)}`);
    
    const batchPromises = [];
    
    // Create all combinations: domains × providers × prompts
    for (const domainRow of batch) {
      // Mark as processing
      await pool.query(
        'UPDATE domains SET status = $1, updated_at = NOW() WHERE id = $2',
        ['processing', domainRow.id]
      );
      
      for (const provider of AI_PROVIDERS) {
        for (const prompt of prompts) {
          batchPromises.push(
            makeThrottledCall(provider, domainRow.domain, prompt)
              .then(async (response) => {
                if (response.success) {
                  await pool.query(
                    'INSERT INTO domain_responses (domain_id, model, prompt_type, response, created_at) VALUES ($1, $2, $3, $4, NOW())',
                    [domainRow.id, response.model, prompt, response.content]
                  );
                }
                return { domainId: domainRow.id, ...response };
              })
              .catch(error => ({
                domainId: domainRow.id,
                success: false,
                error: error.message,
                provider: provider.name
              }))
          );
        }
      }
    }
    
    // Execute all API calls in parallel with proper throttling
    const results = await Promise.all(batchPromises);
    
    // Update domain statuses
    for (const domainRow of batch) {
      const domainResults = results.filter(r => r.domainId === domainRow.id);
      const successCount = domainResults.filter(r => r.success).length;
      const totalExpected = AI_PROVIDERS.length * prompts.length;
      
      if (successCount >= totalExpected * 0.8) { // 80% success rate required
        await pool.query(
          'UPDATE domains SET status = $1, updated_at = NOW() WHERE id = $2',
          ['completed', domainRow.id]
        );
        processed++;
        console.log(`✅ ${domainRow.domain}: ${successCount}/${totalExpected} responses`);
      } else {
        await pool.query(
          'UPDATE domains SET status = $1, updated_at = NOW() WHERE id = $2', 
          ['pending', domainRow.id]
        );
        errors++;
        console.log(`❌ ${domainRow.domain}: Only ${successCount}/${totalExpected} responses`);
      }
    }
    
    // Brief pause between batches
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
  
  console.log('🎉 ULTRA-FAST processing completed!');
  console.log(`✅ Processed: ${processed} domains`);
  console.log(`❌ Errors: ${errors} domains`);
  
  return { processed, errors };
}

// RUN THE PROCESSOR
if (require.main === module) {
  processDomainsUltraFast()
    .then(result => {
      console.log('📊 Final Results:', result);
      process.exit(0);
    })
    .catch(error => {
      console.error('💥 Fatal Error:', error);
      process.exit(1);
    });
}

module.exports = { processDomainsUltraFast }; 