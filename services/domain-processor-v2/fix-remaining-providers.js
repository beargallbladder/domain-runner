#!/usr/bin/env node

// FIX REMAINING PROVIDERS - XAI, AI21, and Perplexity
const axios = require('axios');

const FIXES = {
  // XAI - Error showed: "The model grok-beta does not exist"
  // Need to find the correct model name
  'XAI': {
    apiKey: process.env.XAI_API_KEY,
    tests: [
      { model: 'grok-1', endpoint: 'https://api.x.ai/v1/chat/completions' },
      { model: 'grok-2', endpoint: 'https://api.x.ai/v1/chat/completions' },
      { model: 'grok', endpoint: 'https://api.x.ai/v1/chat/completions' },
      { model: 'grok-beta', endpoint: 'https://api.x.ai/v1/completions' },
    ],
    test: async (apiKey, config) => {
      const response = await axios.post(config.endpoint, {
        model: config.model,
        messages: [{ role: 'user', content: 'Say test' }],
        max_tokens: 10
      }, {
        headers: { 'Authorization': `Bearer ${apiKey}` }
      });
      return { model: config.model, response: response.data };
    }
  },
  
  // AI21 - 404 error on /studio/v1/j2-ultra/complete
  // Try different endpoints and models
  'AI21': {
    apiKey: process.env.AI21_API_KEY,
    tests: [
      { model: 'jamba-1.5-large', endpoint: 'https://api.ai21.com/studio/v1/chat/completions' },
      { model: 'jamba-1.5-mini', endpoint: 'https://api.ai21.com/studio/v1/chat/completions' },
      { model: 'j2-ultra', endpoint: 'https://api.ai21.com/studio/v1/j2-ultra/chat' },
      { model: 'j2-mid', endpoint: 'https://api.ai21.com/studio/v1/j2-mid/complete' },
      { model: 'jamba-instruct', endpoint: 'https://api.ai21.com/studio/v1/chat/completions' },
    ],
    test: async (apiKey, config) => {
      // Try chat completion format first
      if (config.endpoint.includes('chat')) {
        const response = await axios.post(config.endpoint, {
          model: config.model,
          messages: [{ role: 'user', content: 'Say test' }],
          max_tokens: 10
        }, {
          headers: { 
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json'
          }
        });
        return { model: config.model, response: response.data };
      } else {
        // Try completion format
        const response = await axios.post(config.endpoint, {
          prompt: 'Say test:',
          maxTokens: 10
        }, {
          headers: { 
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json'
          }
        });
        return { model: config.model, response: response.data };
      }
    }
  },
  
  // Perplexity - All models returning errors
  // The models might have changed names
  'Perplexity': {
    apiKey: process.env.PERPLEXITY_API_KEY,
    tests: [
      // Current models as of 2024
      { model: 'llama-3.1-sonar-small-128k-online' },
      { model: 'llama-3.1-sonar-large-128k-online' },
      { model: 'llama-3.1-sonar-huge-128k-online' },
      { model: 'sonar-small-128k-online' },
      { model: 'sonar-medium-128k-online' },
      { model: 'sonar-large-128k-online' },
      { model: 'pplx-7b-online' },
      { model: 'pplx-70b-online' },
      { model: 'mixtral-8x7b-instruct' },
    ],
    test: async (apiKey, config) => {
      const response = await axios.post('https://api.perplexity.ai/chat/completions', {
        model: config.model,
        messages: [{ 
          role: 'user', 
          content: 'Say test' 
        }],
        max_tokens: 10
      }, {
        headers: { 
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        }
      });
      return { model: config.model, response: response.data };
    }
  }
};

async function debugProviders() {
  console.log('🔧 DEBUGGING FAILING PROVIDERS\n');
  console.log('================================\n');
  
  for (const [name, config] of Object.entries(FIXES)) {
    console.log(`Testing ${name}...`);
    
    if (!config.apiKey) {
      console.log(`  ❌ No API key for ${name}\n`);
      continue;
    }
    
    let foundWorking = false;
    
    for (const test of config.tests) {
      try {
        console.log(`  Trying ${test.model || test.endpoint}...`);
        const result = await config.test(config.apiKey, test);
        console.log(`  ✅ SUCCESS! Model: ${test.model}`);
        console.log(`     Response:`, JSON.stringify(result.response).substring(0, 200));
        foundWorking = true;
        break;
      } catch (error) {
        const errorMsg = error.response?.data?.error?.message || 
                        error.response?.data?.message || 
                        error.response?.data?.detail ||
                        error.message;
        console.log(`  ❌ Failed: ${errorMsg}`);
        
        // If we get a specific error about the model, log it
        if (error.response?.data) {
          const data = JSON.stringify(error.response.data);
          if (data.includes('model') || data.includes('endpoint')) {
            console.log(`     Details: ${data.substring(0, 200)}`);
          }
        }
      }
      
      // Small delay
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    if (!foundWorking) {
      console.log(`  ⚠️  No working configuration found for ${name}`);
      
      // Try to get model list if possible
      if (name === 'Perplexity') {
        console.log('\n  Attempting to list available models...');
        try {
          const response = await axios.get('https://api.perplexity.ai/models', {
            headers: { 'Authorization': `Bearer ${config.apiKey}` }
          });
          console.log('  Available models:', response.data);
        } catch (e) {
          console.log('  Could not list models');
        }
      }
    }
    
    console.log('');
  }
  
  console.log('\n🔍 INVESTIGATION COMPLETE\n');
  console.log('Next steps:');
  console.log('1. For XAI: Check their documentation for correct model names');
  console.log('2. For AI21: The API structure has changed, need new endpoint format');
  console.log('3. For Perplexity: The models may require specific account tiers\n');
}

debugProviders().catch(console.error);