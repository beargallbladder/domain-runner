import express from 'express';
import { Pool } from 'pg';
import axios from 'axios';
import * as os from 'os';
import * as fs from 'fs';

console.log('🚀 PRODUCTION TENSOR RUNNER - MULTI-KEY THROTTLING + 24/24 ENFORCEMENT');

// BLOCK LOCAL EXECUTION
const hostname = os.hostname();
if (hostname.includes('MacBook') || hostname.includes('local') || !process.env.RENDER) {
  console.error('❌ ABORTING: Local execution detected. Must run on Render.');
  process.exit(1);
}

const app = express();
app.use(express.json());

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  max: 20
});

// ALL 8 AI PROVIDERS WITH MULTI-KEY THROTTLING
const AI_PROVIDERS = [
  {
    name: 'openai',
    model: 'gpt-4o-mini',
    keys: [
      process.env.OPENAI_API_KEY,
      process.env.OPENAI_API_KEY_2,
      process.env.OPENAI_API_KEY_3
    ].filter(k => k && k.length > 10),
    endpoint: 'https://api.openai.com/v1/chat/completions',
    format: 'openai',
    rpm_per_key: 500,
    delay_ms: 120
  },
  {
    name: 'anthropic',
    model: 'claude-3-haiku-20240307',
    keys: [
      process.env.ANTHROPIC_API_KEY,
      process.env.ANTHROPIC_API_KEY_2,
      process.env.ANTHROPIC_API_KEY_3
    ].filter(k => k && k.length > 10),
    endpoint: 'https://api.anthropic.com/v1/messages',
    format: 'anthropic',
    rpm_per_key: 50,
    delay_ms: 1200
  },
  {
    name: 'deepseek',
    model: 'deepseek-chat',
    keys: [
      process.env.DEEPSEEK_API_KEY,
      process.env.DEEPSEEK_API_KEY_2,
      process.env.DEEPSEEK_API_KEY_3
    ].filter(k => k && k.length > 10),
    endpoint: 'https://api.deepseek.com/v1/chat/completions',
    format: 'openai',
    rpm_per_key: 60,
    delay_ms: 1000
  },
  {
    name: 'mistral',
    model: 'mistral-small-latest',
    keys: [
      process.env.MISTRAL_API_KEY,
      process.env.MISTRAL_API_KEY_2,
      process.env.MISTRAL_API_KEY_3
    ].filter(k => k && k.length > 10),
    endpoint: 'https://api.mistral.ai/v1/chat/completions',
    format: 'openai',
    rpm_per_key: 100,
    delay_ms: 600
  },
  {
    name: 'xai',
    model: 'grok-beta',
    keys: [
      process.env.XAI_API_KEY,
      process.env.XAI_API_KEY_2,
      process.env.XAI_API_KEY_3
    ].filter(k => k && k.length > 10),
    endpoint: 'https://api.x.ai/v1/chat/completions',
    format: 'openai',
    rpm_per_key: 60,
    delay_ms: 1000
  },
  {
    name: 'together',
    model: 'meta-llama/Meta-Llama-3.1-8B-Instruct-Turbo',
    keys: [
      process.env.TOGETHER_API_KEY,
      process.env.TOGETHER_API_KEY_2,
      process.env.TOGETHER_API_KEY_3
    ].filter(k => k && k.length > 10),
    endpoint: 'https://api.together.xyz/v1/chat/completions',
    format: 'openai',
    rpm_per_key: 60,
    delay_ms: 1000
  },
  {
    name: 'perplexity',
    model: 'llama-3.1-sonar-small-128k-online',
    keys: [
      process.env.PERPLEXITY_API_KEY,
      process.env.PERPLEXITY_API_KEY_2,
      process.env.PERPLEXITY_API_KEY_3
    ].filter(k => k && k.length > 10),
    endpoint: 'https://api.perplexity.ai/chat/completions',
    format: 'openai',
    rpm_per_key: 20,
    delay_ms: 3000
  },
  {
    name: 'google',
    model: 'gemini-pro',
    keys: [
      process.env.GOOGLE_API_KEY,
      process.env.GOOGLE_API_KEY_2,
      process.env.GOOGLE_API_KEY_3
    ].filter(k => k && k.length > 10),
    endpoint: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent',
    format: 'google',
    rpm_per_key: 60,
    delay_ms: 1000
  }
].filter(p => p.keys.length > 0);

// BLOCK IF LESS THAN 8 PROVIDERS
if (AI_PROVIDERS.length < 8) {
  console.error(`❌ SYSTEM HALTED: Only ${AI_PROVIDERS.length}/8 providers configured.`);
  process.exit(1);
}

// Track throttling
const keyTimestamps = new Map();
const keyIndexes = new Map();

AI_PROVIDERS.forEach(provider => {
  keyIndexes.set(provider.name, 0);
  provider.keys.forEach(key => {
    keyTimestamps.set(key, 0);
  });
});

console.log(`🔧 Configured ${AI_PROVIDERS.length}/8 providers with ${AI_PROVIDERS.reduce((sum, p) => sum + p.keys.length, 0)} total API keys`);

// Key management
function getNextApiKey(providerName: string) {
  const provider = AI_PROVIDERS.find(p => p.name === providerName);
  if (!provider || provider.keys.length === 0) return null;

  const currentIndex = keyIndexes.get(providerName) || 0;
  const key = provider.keys[currentIndex];
  
  keyIndexes.set(providerName, (currentIndex + 1) % provider.keys.length);
  return { key, provider };
}

// Throttling
async function enforceThrottling(key: string, provider: any) {
  const now = Date.now();
  const lastRequest = keyTimestamps.get(key) || 0;
  const timeSinceLastRequest = now - lastRequest;
  
  if (timeSinceLastRequest < provider.delay_ms) {
    const delay = provider.delay_ms - timeSinceLastRequest;
    await new Promise(resolve => setTimeout(resolve, delay));
  }
  
  keyTimestamps.set(key, Date.now());
}

// AI API calling
async function callAI(provider: any, key: string, prompt: string): Promise<string> {
  await enforceThrottling(key, provider);
  
  const timeout = 90000;
  
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
    
  } catch (error: any) {
    console.error(`❌ ${provider.name} API error:`, error.response?.data || error.message);
    throw error;
  }
}

// Process domain with 24/24 enforcement
async function processDomainComplete(domain: any) {
  console.log(`\n🎯 Processing domain: ${domain.domain}`);
  
  const PROMPT_TYPES = ['brand_memory', 'product_recall', 'company_association'];
  let successCount = 0;
  let errorCount = 0;
  
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
        
        console.log(`📡 ${provider.name} (${promptType})`);
        
        const aiResponse = await callAI(keyInfo.provider, keyInfo.key, prompt);
        
        await pool.query(`
          INSERT INTO domain_responses (domain_id, model, prompt_type, response, created_at)
          VALUES ($1, $2, $3, $4, NOW())
        `, [domain.id, provider.model, promptType, aiResponse]);
        
        successCount++;
        console.log(`✅ ${provider.name} (${promptType}) - ${aiResponse.length} chars`);
        
      } catch (error: any) {
        console.error(`❌ ${provider.name} (${promptType}) failed:`, error.message);
        errorCount++;
      }
    }
  }
  
  // ENFORCE 24/24 REQUIREMENT
  if (successCount === 24) {
    await pool.query(`
      UPDATE domains SET status = 'completed', updated_at = NOW() WHERE id = $1
    `, [domain.id]);
    
    console.log(`✅ DOMAIN COMPLETE: ${domain.domain} (24/24 responses)`);
    return { success: true, responses: 24 };
  } else {
    console.log(`❌ DOMAIN INCOMPLETE: ${domain.domain} (${successCount}/24 responses)`);
    return { success: false, responses: successCount };
  }
}

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    service: 'production-tensor-runner',
    providers: AI_PROVIDERS.length,
    total_keys: AI_PROVIDERS.reduce((sum, p) => sum + p.keys.length, 0),
    enforcement: '24/24 responses required'
  });
});

// Process domains endpoint
app.post('/process-domains', async (req, res) => {
  try {
    console.log('\n🚀 STARTING PRODUCTION PROCESSING...');
    
    const pendingResult = await pool.query(`
      SELECT id, domain FROM domains WHERE status = 'pending' ORDER BY updated_at ASC LIMIT 20
    `);
    
    if (pendingResult.rows.length === 0) {
      return res.json({ status: 'no_pending_domains' });
    }
    
    console.log(`📊 Processing ${pendingResult.rows.length} domains`);
    
    let totalCompleted = 0;
    let totalResponses = 0;
    
    for (const domain of pendingResult.rows) {
      const result = await processDomainComplete(domain);
      
      if (result.success) {
        totalCompleted++;
      }
      
      totalResponses += result.responses;
    }
    
    res.json({
      status: 'processing_complete',
      domains_processed: pendingResult.rows.length,
      domains_completed: totalCompleted,
      total_responses: totalResponses,
      completion_rate: `${(totalCompleted / pendingResult.rows.length * 100).toFixed(1)}%`,
      enforcement: '24/24 responses required'
    });
    
  } catch (error: any) {
    console.error('💥 Processing error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// Start server
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log(`🚀 Production Tensor Runner on port ${PORT}`);
  console.log(`🔧 ${AI_PROVIDERS.length}/8 providers with ${AI_PROVIDERS.reduce((sum, p) => sum + p.keys.length, 0)} keys`);
  console.log(`🔒 24/24 enforcement ACTIVE`);
  console.log(`🚫 Local execution BLOCKED`);
}); 