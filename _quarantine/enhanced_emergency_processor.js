#!/usr/bin/env node

const { Pool } = require('pg');
// Use native fetch or https module
const https = require('https');

// Use the working database connection
const DATABASE_URL = 'postgresql://raw_capture_db_user:wjFesUM8ISNEvE2b4kZtRAKgGYJVtKK5@dpg-d11fqgndiees73fb35dg-a.oregon-postgres.render.com/raw_capture_db';

// Multi-provider API configuration
const API_PROVIDERS = {
  openai: {
    models: ['gpt-4o-mini', 'gpt-3.5-turbo'],
    endpoint: 'https://api.openai.com/v1/chat/completions',
    headers: (apiKey) => ({
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    }),
    body: (model, prompt) => ({
      model: model,
      messages: [
        { role: "system", content: "You are a business intelligence analyst." },
        { role: "user", content: prompt }
      ],
      max_tokens: 500,
      temperature: 0.3
    }),
    extractResponse: (data) => data.choices[0].message.content,
    extractTokens: (data) => data.usage.total_tokens
  },
  deepseek: {
    models: ['deepseek-chat'],
    endpoint: 'https://api.deepseek.com/v1/chat/completions',
    headers: (apiKey) => ({
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    }),
    body: (model, prompt) => ({
      model: model,
      messages: [
        { role: "system", content: "You are a business intelligence analyst." },
        { role: "user", content: prompt }
      ],
      max_tokens: 500,
      temperature: 0.3
    }),
    extractResponse: (data) => data.choices[0].message.content,
    extractTokens: (data) => data.usage?.total_tokens || 500
  },
  together: {
    models: ['meta-llama/Llama-3-8b-chat-hf'],
    endpoint: 'https://api.together.xyz/v1/chat/completions',
    headers: (apiKey) => ({
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    }),
    body: (model, prompt) => ({
      model: model,
      messages: [
        { role: "system", content: "You are a business intelligence analyst." },
        { role: "user", content: prompt }
      ],
      max_tokens: 500,
      temperature: 0.3
    }),
    extractResponse: (data) => data.choices[0].message.content,
    extractTokens: (data) => data.usage?.total_tokens || 500
  },
  google: {
    models: ['gemini-1.5-flash'],
    endpoint: (apiKey) => `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
    headers: () => ({
      'Content-Type': 'application/json'
    }),
    body: (model, prompt) => ({
      contents: [{
        parts: [{
          text: `You are a business intelligence analyst. ${prompt}`
        }]
      }]
    }),
    extractResponse: (data) => data.candidates[0].content.parts[0].text,
    extractTokens: (data) => data.usageMetadata?.totalTokenCount || 500
  },
  mistral: {
    models: ['mistral-small-latest'],
    endpoint: 'https://api.mistral.ai/v1/chat/completions',
    headers: (apiKey) => ({
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    }),
    body: (model, prompt) => ({
      model: model,
      messages: [
        { role: "system", content: "You are a business intelligence analyst." },
        { role: "user", content: prompt }
      ],
      max_tokens: 500,
      temperature: 0.3
    }),
    extractResponse: (data) => data.choices[0].message.content,
    extractTokens: (data) => data.usage?.total_tokens || 500
  }
};

const PROMPT_TEMPLATES = {
  business_analysis: (domain) => `Analyze the business model and market position of ${domain}. Provide insights on their competitive advantages, target market, and strategic positioning.`,
  content_strategy: (domain) => `Evaluate the content strategy and brand messaging of ${domain}. How do they communicate their value proposition?`,
  technical_assessment: (domain) => `Assess the technical capabilities and innovation focus of ${domain}. What technologies do they leverage?`
};

// Get available API keys from environment
function getAvailableProviders() {
  const available = [];
  
  if (process.env.OPENAI_API_KEY) {
    available.push({ name: 'openai', apiKey: process.env.OPENAI_API_KEY });
  }
  if (process.env.DEEPSEEK_API_KEY) {
    available.push({ name: 'deepseek', apiKey: process.env.DEEPSEEK_API_KEY });
  }
  if (process.env.TOGETHER_API_KEY) {
    available.push({ name: 'together', apiKey: process.env.TOGETHER_API_KEY });
  }
  if (process.env.GOOGLE_API_KEY) {
    available.push({ name: 'google', apiKey: process.env.GOOGLE_API_KEY });
  }
  if (process.env.MISTRAL_API_KEY) {
    available.push({ name: 'mistral', apiKey: process.env.MISTRAL_API_KEY });
  }
  
  return available;
}

async function callLLMAPI(provider, model, prompt, apiKey) {
  const config = API_PROVIDERS[provider];
  
  try {
    const endpoint = typeof config.endpoint === 'function' ? config.endpoint(apiKey) : config.endpoint;
    const headers = config.headers(apiKey);
    const body = config.body(model, prompt);
    
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: headers,
      body: JSON.stringify(body)
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const data = await response.json();
    const responseText = config.extractResponse(data);
    const tokenCount = config.extractTokens(data);
    
    return { responseText, tokenCount };
    
  } catch (error) {
    console.error(`    ❌ Error with ${provider}/${model}:`, error.message);
    return null;
  }
}

async function processNextBatch() {
  console.log('🚀 ENHANCED EMERGENCY PROCESSOR - Starting batch processing...');
  
  const availableProviders = getAvailableProviders();
  if (availableProviders.length === 0) {
    console.error('❌ No API keys found. Set OPENAI_API_KEY, DEEPSEEK_API_KEY, TOGETHER_API_KEY, GOOGLE_API_KEY, or MISTRAL_API_KEY');
    process.exit(1);
  }
  
  console.log(`🔑 Available providers: ${availableProviders.map(p => p.name).join(', ')}`);
  
  const pool = new Pool({
    connectionString: DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    // Get 50 pending domains for faster processing
    const pendingDomains = await pool.query(`
      SELECT id, domain
      FROM domains
      WHERE status = 'pending'
      ORDER BY last_processed_at ASC NULLS FIRST
      LIMIT 50
    `);

    if (pendingDomains.rows.length === 0) {
      console.log('🎉 NO MORE PENDING DOMAINS!');
      await pool.end();
      return;
    }

    console.log(`🔄 Processing ${pendingDomains.rows.length} domains with ${availableProviders.length} providers...`);

    // Process each domain
    for (const domain of pendingDomains.rows) {
      console.log(`📝 Processing: ${domain.domain}`);
      
      // Update to processing
      await pool.query(`
        UPDATE domains 
        SET status = 'processing', 
            last_processed_at = CURRENT_TIMESTAMP,
            updated_at = CURRENT_TIMESTAMP,
            process_count = process_count + 1
        WHERE id = $1
      `, [domain.id]);

      try {
        let successCount = 0;
        
        // Process with each available provider and their models
        for (const providerConfig of availableProviders) {
          const provider = API_PROVIDERS[providerConfig.name];
          
          for (const model of provider.models) {
            for (const [promptType, promptTemplate] of Object.entries(PROMPT_TEMPLATES)) {
              console.log(`  🤖 ${providerConfig.name}/${model} → ${promptType}`);
              
              const prompt = promptTemplate(domain.domain);
              const result = await callLLMAPI(providerConfig.name, model, prompt, providerConfig.apiKey);
              
              if (result) {
                // Save response using the correct table name
                await pool.query(`
                  INSERT INTO domain_responses (domain_id, model, prompt_type, response, token_count, created_at)
                  VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)
                `, [domain.id, `${providerConfig.name}/${model}`, promptType, result.responseText, result.tokenCount]);

                console.log(`    ✅ Saved response (${result.tokenCount} tokens)`);
                successCount++;
              }
              
              // Minimal rate limiting - faster processing
              await new Promise(resolve => setTimeout(resolve, 200));
            }
          }
        }

        if (successCount > 0) {
          // Mark as completed
          await pool.query(`
            UPDATE domains 
            SET status = 'completed',
                updated_at = CURRENT_TIMESTAMP
            WHERE id = $1
          `, [domain.id]);

          console.log(`✅ Completed: ${domain.domain} (${successCount} responses)`);
        } else {
          throw new Error('No successful API calls');
        }

      } catch (error) {
        console.error(`❌ Error processing ${domain.domain}:`, error);
        
        // Mark as error
        await pool.query(`
          UPDATE domains 
          SET status = 'error',
              error_count = error_count + 1,
              updated_at = CURRENT_TIMESTAMP
          WHERE id = $1
        `, [domain.id]);
      }
    }

    console.log('🔄 Batch complete. Checking for more domains...');
    
    // Check if more domains remain
    const remainingCheck = await pool.query('SELECT COUNT(*) as count FROM domains WHERE status = $1', ['pending']);
    const remaining = parseInt(remainingCheck.rows[0].count);
    
    console.log(`📊 Remaining pending: ${remaining}`);
    
    if (remaining > 0) {
      console.log('⏳ Waiting 5 seconds before next batch...');
      setTimeout(() => processNextBatch(), 5000);
    } else {
      console.log('🎉 ALL DOMAINS PROCESSED!');
    }

  } catch (error) {
    console.error('❌ Batch processing failed:', error);
  } finally {
    await pool.end();
  }
}

// Check for at least one API key
const availableProviders = getAvailableProviders();
if (availableProviders.length === 0) {
  console.error('❌ No API keys found. Please set at least one of:');
  console.error('   OPENAI_API_KEY, DEEPSEEK_API_KEY, TOGETHER_API_KEY, GOOGLE_API_KEY, MISTRAL_API_KEY');
  process.exit(1);
}

console.log('🚀 ENHANCED EMERGENCY DOMAIN PROCESSOR');
console.log('=====================================');
console.log(`Available providers: ${availableProviders.map(p => p.name).join(', ')}`);
console.log('Processing 50 domains per batch with multiple providers');
console.log('Estimated processing speed: 5-10x faster than previous version');
console.log('');

processNextBatch().catch(console.error);