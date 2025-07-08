const { Pool } = require('pg');
const axios = require('axios');
const fs = require('fs');
const os = require('os');

console.log('🚀 PRODUCTION TENSOR PROCESSOR - MULTI-KEY THROTTLING + 24/24 ENFORCEMENT');
console.log('=' * 80);

// BLOCK LOCAL EXECUTION
const hostname = os.hostname();
if (hostname.includes('MacBook') || hostname.includes('local') || !process.env.RENDER) {
  console.error('❌ ABORTING: Local execution detected. Must run on Render.');
  console.error('❌ NO LOCAL RUNS ALLOWED - TENSOR REQUIRES PRODUCTION');
  process.exit(1);
}

// Load environment
function loadEnvFile() {
  const envPath = './domain-runner/.env';
  if (!fs.existsSync(envPath)) {
    console.error('❌ .env file not found at:', envPath);
    process.exit(1);
  }
  
  const envContent = fs.readFileSync(envPath, 'utf8');
  const env = {};
  envContent.split('\n').forEach(line => {
    const [key, ...value] = line.split('=');
    if (key && value.length) {
      env[key.trim()] = value.join('=').trim().replace(/^["']|["']$/g, '');
    }
  });
  return env;
}

const env = loadEnvFile();

// Database connection
const pool = new Pool({
  connectionString: env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  max: 20,
  connectionTimeoutMillis: 30000
});

// ALL 8 AI PROVIDERS WITH MULTI-KEY THROTTLING
const AI_PROVIDERS = [
  {
    name: 'openai',
    model: 'gpt-4o-mini',
    keys: [env.OPENAI_API_KEY, env.OPENAI_API_KEY_2, env.OPENAI_API_KEY_3].filter(k => k && k.length > 10),
    endpoint: 'https://api.openai.com/v1/chat/completions',
    format: 'openai',
    rpm_per_key: 500,
    delay_ms: 120
  },
  {
    name: 'anthropic',
    model: 'claude-3-haiku-20240307',
    keys: [env.ANTHROPIC_API_KEY, env.ANTHROPIC_API_KEY_2, env.ANTHROPIC_API_KEY_3].filter(k => k && k.length > 10),
    endpoint: 'https://api.anthropic.com/v1/messages',
    format: 'anthropic',
    rpm_per_key: 50,
    delay_ms: 1200
  },
  {
    name: 'deepseek',
    model: 'deepseek-chat',
    keys: [env.DEEPSEEK_API_KEY, env.DEEPSEEK_API_KEY_2, env.DEEPSEEK_API_KEY_3].filter(k => k && k.length > 10),
    endpoint: 'https://api.deepseek.com/v1/chat/completions',
    format: 'openai',
    rpm_per_key: 60,
    delay_ms: 1000
  },
  {
    name: 'mistral',
    model: 'mistral-small-latest',
    keys: [env.MISTRAL_API_KEY, env.MISTRAL_API_KEY_2, env.MISTRAL_API_KEY_3].filter(k => k && k.length > 10),
    endpoint: 'https://api.mistral.ai/v1/chat/completions',
    format: 'openai',
    rpm_per_key: 100,
    delay_ms: 600
  },
  {
    name: 'xai',
    model: 'grok-beta',
    keys: [env.XAI_API_KEY, env.XAI_API_KEY_2, env.XAI_API_KEY_3].filter(k => k && k.length > 10),
    endpoint: 'https://api.x.ai/v1/chat/completions',
    format: 'openai',
    rpm_per_key: 60,
    delay_ms: 1000
  },
  {
    name: 'together',
    model: 'meta-llama/Meta-Llama-3.1-8B-Instruct-Turbo',
    keys: [env.TOGETHER_API_KEY, env.TOGETHER_API_KEY_2, env.TOGETHER_API_KEY_3].filter(k => k && k.length > 10),
    endpoint: 'https://api.together.xyz/v1/chat/completions',
    format: 'openai',
    rpm_per_key: 60,
    delay_ms: 1000
  },
  {
    name: 'perplexity',
    model: 'llama-3.1-sonar-small-128k-online',
    keys: [env.PERPLEXITY_API_KEY, env.PERPLEXITY_API_KEY_2, env.PERPLEXITY_API_KEY_3].filter(k => k && k.length > 10),
    endpoint: 'https://api.perplexity.ai/chat/completions',
    format: 'openai',
    rpm_per_key: 20,
    delay_ms: 3000
  },
  {
    name: 'google',
    model: 'gemini-pro',
    keys: [env.GOOGLE_API_KEY, env.GOOGLE_API_KEY_2, env.GOOGLE_API_KEY_3].filter(k => k && k.length > 10),
    endpoint: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent',
    format: 'google',
    rpm_per_key: 60,
    delay_ms: 1000
  }
].filter(p => p.keys.length > 0);

// BLOCK IF LESS THAN 8 PROVIDERS
if (AI_PROVIDERS.length < 8) {
  console.error(`❌ SYSTEM HALTED: Only ${AI_PROVIDERS.length}/8 providers configured.`);
  console.error('❌ TENSOR ANALYSIS IMPOSSIBLE - ALL 8 REQUIRED');
  process.exit(1);
}

// Track last request time for each key
const keyTimestamps = new Map();
const keyIndexes = new Map();

// Initialize key tracking
AI_PROVIDERS.forEach(provider => {
  keyIndexes.set(provider.name, 0);
  provider.keys.forEach(key => {
    keyTimestamps.set(key, 0);
  });
});

console.log(`🔧 Configured ${AI_PROVIDERS.length}/8 providers with ${AI_PROVIDERS.reduce((sum, p) => sum + p.keys.length, 0)} total API keys`);

// Round-robin key selection with throttling
function getNextApiKey(providerName) {
  const provider = AI_PROVIDERS.find(p => p.name === providerName);
  if (!provider || provider.keys.length === 0) return null;

  const currentIndex = keyIndexes.get(providerName) || 0;
  const key = provider.keys[currentIndex];
  
  // Advance to next key
  keyIndexes.set(providerName, (currentIndex + 1) % provider.keys.length);
  
  return { key, provider };
}

// Throttling enforcement
async function enforceThrottling(key, provider) {
  const now = Date.now();
  const lastRequest = keyTimestamps.get(key) || 0;
  const timeSinceLastRequest = now - lastRequest;
  
  if (timeSinceLastRequest < provider.delay_ms) {
    const delay = provider.delay_ms - timeSinceLastRequest;
    console.log(`⏱️ Throttling ${provider.name}: waiting ${delay}ms`);
    await new Promise(resolve => setTimeout(resolve, delay));
  }
  
  keyTimestamps.set(key, Date.now());
}

// 3 PROMPT TYPES
const PROMPT_TYPES = [
  'brand_memory',
  'product_recall', 
  'company_association'
];

// AI API calling with proper format handling
async function callAI(provider, key, prompt) {
  await enforceThrottling(key, provider);
  
  const timeout = 90000; // 90 seconds for slower providers
  
  try {
    let response;
    
    if (provider.format === 'anthropic') {
      response = await axios.post(provider.endpoint, {
        model: provider.model,
        max_tokens: 1000,
        messages: [{ role: 'user', content: prompt }]
      }, {
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': key,
          'anthropic-version': '2023-06-01'
        },
        timeout
      });
      
      return response.data.content[0].text;
      
    } else if (provider.format === 'google') {
      const url = `${provider.endpoint}?key=${key}`;
      response = await axios.post(url, {
        contents: [{ parts: [{ text: prompt }] }]
      }, {
        headers: { 'Content-Type': 'application/json' },
        timeout
      });
      
      return response.data.candidates[0].content.parts[0].text;
      
    } else {
      // OpenAI format (most providers)
      response = await axios.post(provider.endpoint, {
        model: provider.model,
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 1000,
        temperature: 0.7
      }, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${key}`
        },
        timeout
      });
      
      return response.data.choices[0].message.content;
    }
    
  } catch (error) {
    console.error(`❌ ${provider.name} API error:`, error.response?.data || error.message);
    throw error;
  }
}

// Process single domain with ALL 8 providers × 3 prompts = 24 responses
async function processDomainComplete(domain) {
  console.log(`\n🎯 Processing domain: ${domain.domain}`);
  
  const responses = [];
  let successCount = 0;
  let errorCount = 0;
  
  // Process ALL 8 providers × 3 prompts
  for (const provider of AI_PROVIDERS) {
    for (const promptType of PROMPT_TYPES) {
      try {
        const keyInfo = getNextApiKey(provider.name);
        if (!keyInfo) {
          console.error(`❌ No API key available for ${provider.name}`);
          errorCount++;
          continue;
        }
        
        const prompt = `Analyze the brand memory for ${domain.domain} regarding ${promptType}. Provide a detailed assessment.`;
        
        console.log(`📡 ${provider.name} (${promptType}) - using key ${keyInfo.key.substring(0, 10)}...`);
        
        const aiResponse = await callAI(keyInfo.provider, keyInfo.key, prompt);
        
        // Save to database
        await pool.query(`
          INSERT INTO domain_responses (domain_id, model, prompt_type, response, created_at)
          VALUES ($1, $2, $3, $4, NOW())
        `, [domain.id, provider.model, promptType, aiResponse]);
        
        responses.push({
          provider: provider.name,
          promptType,
          success: true,
          responseLength: aiResponse.length
        });
        
        successCount++;
        console.log(`✅ ${provider.name} (${promptType}) - ${aiResponse.length} chars`);
        
      } catch (error) {
        console.error(`❌ ${provider.name} (${promptType}) failed:`, error.message);
        errorCount++;
        
        responses.push({
          provider: provider.name,
          promptType,
          success: false,
          error: error.message
        });
      }
    }
  }
  
  console.log(`📊 Domain ${domain.domain}: ${successCount} success, ${errorCount} errors`);
  
  // ENFORCE 24/24 REQUIREMENT
  if (successCount === 24) {
    await pool.query(`
      UPDATE domains 
      SET status = 'completed', updated_at = NOW()
      WHERE id = $1
    `, [domain.id]);
    
    console.log(`✅ DOMAIN TRULY COMPLETE: ${domain.domain} (24/24 responses)`);
    return { success: true, responses: 24 };
  } else {
    console.log(`❌ DOMAIN INCOMPLETE: ${domain.domain} (${successCount}/24 responses)`);
    return { success: false, responses: successCount };
  }
}

// Main processing function
async function processDomainsWithEnforcement() {
  try {
    console.log('\n🚀 STARTING PRODUCTION TENSOR PROCESSING...');
    
    // Get pending domains
    const pendingResult = await pool.query(`
      SELECT id, domain 
      FROM domains 
      WHERE status = 'pending' 
      ORDER BY updated_at ASC 
      LIMIT 50
    `);
    
    if (pendingResult.rows.length === 0) {
      console.log('📭 No pending domains to process');
      return;
    }
    
    console.log(`📊 Processing ${pendingResult.rows.length} pending domains`);
    
    let totalCompleted = 0;
    let totalResponses = 0;
    
    // Process each domain
    for (const domain of pendingResult.rows) {
      const result = await processDomainComplete(domain);
      
      if (result.success) {
        totalCompleted++;
      }
      
      totalResponses += result.responses;
      
      // Brief pause between domains
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
    
    console.log('\n🎉 PROCESSING COMPLETE!');
    console.log(`✅ Domains completed: ${totalCompleted}/${pendingResult.rows.length}`);
    console.log(`📊 Total responses generated: ${totalResponses}`);
    console.log(`🎯 Completion rate: ${(totalCompleted / pendingResult.rows.length * 100).toFixed(1)}%`);
    
    // Final tensor readiness check
    const tensorReady = await pool.query(`
      SELECT COUNT(DISTINCT d.id) as ready_domains
      FROM domains d
      JOIN domain_responses r ON d.id = r.domain_id
      GROUP BY d.id
      HAVING COUNT(r.id) = 24
    `);
    
    console.log(`🎯 TENSOR-READY DOMAINS: ${tensorReady.rows[0].ready_domains}`);
    
  } catch (error) {
    console.error('💥 PROCESSING FAILED:', error.message);
    throw error;
  } finally {
    await pool.end();
  }
}

// Run the processor
processDomainsWithEnforcement()
  .then(() => {
    console.log('\n🏁 PRODUCTION TENSOR PROCESSOR COMPLETE');
    console.log('🔥 NO FAKE SUCCESS - ONLY REAL 24/24 COMPLETIONS');
  })
  .catch(error => {
    console.error('💥 FATAL ERROR:', error.message);
    process.exit(1);
  }); 