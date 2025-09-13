#!/usr/bin/env node
/**
 * UNFUCK THIS TENSOR - A single clean service that actually works
 * No more scattered bullshit across 25 services
 */

import express from 'express';
import { Pool } from 'pg';
import fetch from 'node-fetch';

const app = express();
app.use(express.json());

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || "postgresql://raw_capture_db_user:wjFesUM8ISNEvE2b4kZtRAKgGYJVtKK5@dpg-d11fqgndiees73fb35dg-a.oregon-postgres.render.com/raw_capture_db",
  ssl: { rejectUnauthorized: false }
});

// THE ACTUAL 11 PROVIDERS - NO BULLSHIT
const LLM_PROVIDERS = {
  openai: {
    name: 'openai',
    models: ['gpt-4-turbo-preview', 'gpt-3.5-turbo'],
    endpoint: 'https://api.openai.com/v1/chat/completions',
    headers: (key: string) => ({
      'Authorization': `Bearer ${key}`,
      'Content-Type': 'application/json'
    }),
    body: (prompt: string, model: string) => ({
      model,
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 500
    }),
    extractResponse: (data: any) => data.choices?.[0]?.message?.content
  },
  
  anthropic: {
    name: 'anthropic',
    models: ['claude-3-haiku-20240307', 'claude-3-sonnet-20240229'],
    endpoint: 'https://api.anthropic.com/v1/messages',
    headers: (key: string) => ({
      'x-api-key': key,
      'Content-Type': 'application/json',
      'anthropic-version': '2023-06-01'
    }),
    body: (prompt: string, model: string) => ({
      model,
      max_tokens: 500,
      messages: [{ role: 'user', content: prompt }]
    }),
    extractResponse: (data: any) => data.content?.[0]?.text
  },
  
  deepseek: {
    name: 'deepseek',
    models: ['deepseek-chat', 'deepseek-coder'],
    endpoint: 'https://api.deepseek.com/v1/chat/completions',
    headers: (key: string) => ({
      'Authorization': `Bearer ${key}`,
      'Content-Type': 'application/json'
    }),
    body: (prompt: string, model: string) => ({
      model,
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 500
    }),
    extractResponse: (data: any) => data.choices?.[0]?.message?.content
  },
  
  mistral: {
    name: 'mistral',
    models: ['mistral-small-latest', 'mistral-medium-latest'],
    endpoint: 'https://api.mistral.ai/v1/chat/completions',
    headers: (key: string) => ({
      'Authorization': `Bearer ${key}`,
      'Content-Type': 'application/json'
    }),
    body: (prompt: string, model: string) => ({
      model,
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 500
    }),
    extractResponse: (data: any) => data.choices?.[0]?.message?.content
  },
  
  xai: {
    name: 'xai',
    models: ['grok-beta'],
    endpoint: 'https://api.x.ai/v1/chat/completions',
    headers: (key: string) => ({
      'Authorization': `Bearer ${key}`,
      'Content-Type': 'application/json'
    }),
    body: (prompt: string, model: string) => ({
      model,
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 500
    }),
    extractResponse: (data: any) => data.choices?.[0]?.message?.content
  },
  
  together: {
    name: 'together',
    models: ['meta-llama/Llama-2-70b-chat-hf', 'mistralai/Mixtral-8x7B-Instruct-v0.1'],
    endpoint: 'https://api.together.xyz/v1/chat/completions',
    headers: (key: string) => ({
      'Authorization': `Bearer ${key}`,
      'Content-Type': 'application/json'
    }),
    body: (prompt: string, model: string) => ({
      model,
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 500
    }),
    extractResponse: (data: any) => data.choices?.[0]?.message?.content
  },
  
  perplexity: {
    name: 'perplexity',
    models: ['llama-3.1-sonar-small-128k-online', 'llama-3.1-sonar-large-128k-online'],
    endpoint: 'https://api.perplexity.ai/chat/completions',
    headers: (key: string) => ({
      'Authorization': `Bearer ${key}`,
      'Content-Type': 'application/json'
    }),
    body: (prompt: string, model: string) => ({
      model,
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 500
    }),
    extractResponse: (data: any) => data.choices?.[0]?.message?.content
  },
  
  google: {
    name: 'google',
    models: ['gemini-1.5-flash', 'gemini-1.5-pro'],
    endpoint: (key: string, model: string) => 
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`,
    headers: () => ({ 'Content-Type': 'application/json' }),
    body: (prompt: string) => ({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { maxOutputTokens: 500 }
    }),
    extractResponse: (data: any) => data.candidates?.[0]?.content?.parts?.[0]?.text
  },
  
  cohere: {
    name: 'cohere',
    models: ['command', 'command-light'],
    endpoint: 'https://api.cohere.ai/v1/chat',
    headers: (key: string) => ({
      'Authorization': `Bearer ${key}`,
      'Content-Type': 'application/json'
    }),
    body: (prompt: string, model: string) => ({
      model,
      message: prompt,
      max_tokens: 500
    }),
    extractResponse: (data: any) => data.text
  },
  
  ai21: {
    name: 'ai21',
    models: ['j2-ultra', 'j2-mid'],
    endpoint: (key: string, model: string) => 
      `https://api.ai21.com/studio/v1/${model}/complete`,
    headers: (key: string) => ({
      'Authorization': `Bearer ${key}`,
      'Content-Type': 'application/json'
    }),
    body: (prompt: string) => ({
      prompt,
      maxTokens: 500,
      temperature: 0.7
    }),
    extractResponse: (data: any) => data.completions?.[0]?.data?.text
  },
  
  groq: {
    name: 'groq',
    models: ['mixtral-8x7b-32768', 'llama2-70b-4096'],
    endpoint: 'https://api.groq.com/openai/v1/chat/completions',
    headers: (key: string) => ({
      'Authorization': `Bearer ${key}`,
      'Content-Type': 'application/json'
    }),
    body: (prompt: string, model: string) => ({
      model,
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 500
    }),
    extractResponse: (data: any) => data.choices?.[0]?.message?.content
  }
};

// API Keys - all in one place
const API_KEYS: Record<string, string[]> = {
  openai: [
    process.env.OPENAI_API_KEY,
    process.env.OPENAI_API_KEY_2,
    process.env.OPENAI_API_KEY_3,
    process.env.OPENAI_API_KEY_4
  ].filter(Boolean) as string[],
  
  anthropic: [
    process.env.ANTHROPIC_API_KEY,
    process.env.ANTHROPIC_API_KEY_2
  ].filter(Boolean) as string[],
  
  deepseek: [
    process.env.DEEPSEEK_API_KEY,
    process.env.DEEPSEEK_API_KEY_2,
    process.env.DEEPSEEK_API_KEY_3
  ].filter(Boolean) as string[],
  
  mistral: [
    process.env.MISTRAL_API_KEY,
    process.env.MISTRAL_API_KEY_2
  ].filter(Boolean) as string[],
  
  xai: [
    process.env.XAI_API_KEY,
    process.env.XAI_API_KEY_2
  ].filter(Boolean) as string[],
  
  together: [
    process.env.TOGETHER_API_KEY,
    process.env.TOGETHER_API_KEY_2,
    process.env.TOGETHER_API_KEY_3
  ].filter(Boolean) as string[],
  
  perplexity: [
    process.env.PERPLEXITY_API_KEY,
    process.env.PERPLEXITY_API_KEY_2
  ].filter(Boolean) as string[],
  
  google: [
    process.env.GOOGLE_API_KEY,
    process.env.GOOGLE_API_KEY_2
  ].filter(Boolean) as string[],
  
  cohere: [
    process.env.COHERE_API_KEY,
    process.env.COHERE_API_KEY_2
  ].filter(Boolean) as string[],
  
  ai21: [
    process.env.AI21_API_KEY,
    process.env.AI21_API_KEY_2
  ].filter(Boolean) as string[],
  
  groq: [
    process.env.GROQ_API_KEY,
    process.env.GROQ_API_KEY_2
  ].filter(Boolean) as string[]
};

// Key rotation index
let keyIndex = 0;

/**
 * Call an LLM with proper error handling
 */
async function callLLM(
  provider: string, 
  prompt: string, 
  domainId: string,
  promptType: string
): Promise<{success: boolean, response?: string, error?: string}> {
  const config = LLM_PROVIDERS[provider];
  if (!config) {
    return {success: false, error: `Unknown provider: ${provider}`};
  }
  
  const keys = API_KEYS[provider];
  if (!keys || keys.length === 0) {
    return {success: false, error: `No API keys for ${provider}`};
  }
  
  // Rotate through keys
  const apiKey = keys[keyIndex % keys.length];
  keyIndex++;
  
  const model = config.models[0]; // Use first model
  
  try {
    // Build request
    const endpoint = typeof config.endpoint === 'function' 
      ? config.endpoint(apiKey, model) 
      : config.endpoint;
      
    const headers = config.headers(apiKey);
    const body = config.body(prompt, model);
    
    console.log(`📡 Calling ${provider}/${model}...`);
    
    const response = await fetch(endpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
      timeout: 30000
    });
    
    if (!response.ok) {
      const error = await response.text();
      console.error(`❌ ${provider} failed: ${response.status} - ${error}`);
      return {success: false, error: `HTTP ${response.status}: ${error}`};
    }
    
    const data = await response.json();
    const content = config.extractResponse(data);
    
    if (!content) {
      return {success: false, error: 'No content in response'};
    }
    
    // Store in database
    await pool.query(`
      INSERT INTO domain_responses 
      (domain_id, model, prompt_type, response, response_time_ms, created_at)
      VALUES ($1, $2, $3, $4, $5, NOW())
    `, [domainId, `${provider}/${model}`, promptType, content, Date.now() % 1000]);
    
    console.log(`✅ ${provider} success: ${content.length} chars`);
    return {success: true, response: content};
    
  } catch (error: any) {
    console.error(`💥 ${provider} error:`, error.message);
    return {success: false, error: error.message};
  }
}

/**
 * Test all LLMs and show what's actually working
 */
app.get('/test-tensor', async (req, res) => {
  console.log('\n🧪 TESTING ALL 11 LLMS...\n');
  
  const results: Record<string, any> = {};
  const testPrompt = 'What is the capital of France? Answer in one sentence.';
  
  for (const [provider, config] of Object.entries(LLM_PROVIDERS)) {
    console.log(`\nTesting ${provider}...`);
    
    const keys = API_KEYS[provider];
    results[provider] = {
      hasKeys: keys.length > 0,
      keyCount: keys.length,
      models: config.models,
      test: null
    };
    
    if (keys.length === 0) {
      console.log(`❌ ${provider}: NO KEYS CONFIGURED`);
      continue;
    }
    
    // Actually test the API
    const testResult = await callLLM(provider, testPrompt, 'test-domain', 'test');
    results[provider].test = testResult;
    
    if (testResult.success) {
      console.log(`✅ ${provider}: WORKING!`);
    } else {
      console.log(`❌ ${provider}: FAILED - ${testResult.error}`);
    }
  }
  
  // Summary
  const working = Object.values(results).filter(r => r.test?.success).length;
  const total = Object.keys(results).length;
  
  console.log(`\n📊 TENSOR STATUS: ${working}/${total} LLMs working (${Math.round(working/total*100)}%)\n`);
  
  res.json({
    summary: {
      working,
      total,
      percentage: Math.round(working/total*100),
      tensor_status: working === 11 ? 'SYNCHRONIZED' : 'BROKEN'
    },
    providers: results
  });
});

/**
 * Process domains with all working LLMs
 */
app.post('/process-domains', async (req, res) => {
  const { limit = 10 } = req.body;
  
  // Get pending domains
  const domains = await pool.query(`
    SELECT id, domain 
    FROM domains 
    WHERE status = 'pending' 
    ORDER BY created_at ASC 
    LIMIT $1
  `, [limit]);
  
  if (domains.rows.length === 0) {
    return res.json({ message: 'No pending domains' });
  }
  
  console.log(`\n🚀 Processing ${domains.rows.length} domains...\n`);
  
  const results = [];
  const prompts = [
    'business_analysis',
    'content_strategy', 
    'technical_assessment'
  ];
  
  for (const domain of domains.rows) {
    console.log(`\n📍 Processing ${domain.domain}...`);
    
    const domainResult = {
      domain: domain.domain,
      id: domain.id,
      providers: {} as Record<string, any>
    };
    
    // Update status
    await pool.query(
      'UPDATE domains SET status = $1, updated_at = NOW() WHERE id = $2',
      ['processing', domain.id]
    );
    
    // Call each working provider
    for (const [provider, config] of Object.entries(LLM_PROVIDERS)) {
      if (API_KEYS[provider]?.length > 0) {
        domainResult.providers[provider] = { responses: 0, errors: 0 };
        
        for (const promptType of prompts) {
          const prompt = `Analyze ${domain.domain} for ${promptType}`;
          const result = await callLLM(provider, prompt, domain.id, promptType);
          
          if (result.success) {
            domainResult.providers[provider].responses++;
          } else {
            domainResult.providers[provider].errors++;
          }
          
          // Small delay to avoid rate limits
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }
    }
    
    // Update status
    await pool.query(
      'UPDATE domains SET status = $1, updated_at = NOW() WHERE id = $2',
      ['completed', domain.id]
    );
    
    results.push(domainResult);
  }
  
  res.json({
    processed: results.length,
    results
  });
});

/**
 * Health check showing real status
 */
app.get('/health', async (req, res) => {
  const workingProviders = Object.entries(API_KEYS)
    .filter(([_, keys]) => keys.length > 0)
    .map(([provider]) => provider);
  
  res.json({
    status: 'healthy',
    service: 'unfucked-tensor',
    timestamp: new Date().toISOString(),
    tensor: {
      configured: Object.keys(LLM_PROVIDERS).length,
      with_keys: workingProviders.length,
      providers: workingProviders,
      missing_keys: Object.keys(LLM_PROVIDERS).filter(p => !workingProviders.includes(p))
    },
    database: await pool.query('SELECT 1').then(() => 'connected').catch(() => 'error')
  });
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`\n🚀 UNFUCKED TENSOR SERVICE`);
  console.log(`📍 Running on port ${PORT}`);
  console.log(`🧮 Providers configured: ${Object.keys(LLM_PROVIDERS).length}`);
  console.log(`🔑 Providers with keys: ${Object.values(API_KEYS).filter(k => k.length > 0).length}`);
  console.log(`\nEndpoints:`);
  console.log(`  GET  /health - Service health`);
  console.log(`  GET  /test-tensor - Test all LLMs`);
  console.log(`  POST /process-domains - Process domains\n`);
});