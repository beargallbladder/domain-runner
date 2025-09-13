#!/usr/bin/env node

// TEST ALL API KEYS - Validate each provider with correct models and endpoints
const axios = require('axios');

const PROVIDERS = [
  {
    name: 'OpenAI',
    apiKey: process.env.OPENAI_API_KEY,
    test: async (apiKey) => {
      const response = await axios.post('https://api.openai.com/v1/chat/completions', {
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: 'Say "test ok" in 2 words' }],
        max_tokens: 10
      }, {
        headers: { 'Authorization': `Bearer ${apiKey}` }
      });
      return response.data.choices[0].message.content;
    }
  },
  
  {
    name: 'Anthropic',
    apiKey: process.env.ANTHROPIC_API_KEY,
    test: async (apiKey) => {
      const response = await axios.post('https://api.anthropic.com/v1/messages', {
        model: 'claude-3-haiku-20240307',
        messages: [{ role: 'user', content: 'Say "test ok" in 2 words' }],
        max_tokens: 10
      }, {
        headers: { 
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
          'content-type': 'application/json'
        }
      });
      return response.data.content[0].text;
    }
  },
  
  {
    name: 'DeepSeek',
    apiKey: process.env.DEEPSEEK_API_KEY,
    test: async (apiKey) => {
      const response = await axios.post('https://api.deepseek.com/v1/chat/completions', {
        model: 'deepseek-chat',
        messages: [{ role: 'user', content: 'Say "test ok" in 2 words' }],
        max_tokens: 10
      }, {
        headers: { 'Authorization': `Bearer ${apiKey}` }
      });
      return response.data.choices[0].message.content;
    }
  },
  
  {
    name: 'Mistral',
    apiKey: process.env.MISTRAL_API_KEY,
    test: async (apiKey) => {
      const response = await axios.post('https://api.mistral.ai/v1/chat/completions', {
        model: 'mistral-small-latest',
        messages: [{ role: 'user', content: 'Say "test ok" in 2 words' }],
        max_tokens: 10
      }, {
        headers: { 
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        }
      });
      return response.data.choices[0].message.content;
    }
  },
  
  {
    name: 'Cohere',
    apiKey: process.env.COHERE_API_KEY,
    test: async (apiKey) => {
      const response = await axios.post('https://api.cohere.ai/v1/chat', {
        model: 'command-r',
        message: 'Say "test ok" in 2 words',
        max_tokens: 10
      }, {
        headers: { 
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        }
      });
      return response.data.text;
    }
  },
  
  {
    name: 'Together',
    apiKey: process.env.TOGETHER_API_KEY,
    test: async (apiKey) => {
      const response = await axios.post('https://api.together.xyz/v1/chat/completions', {
        model: 'meta-llama/Llama-3-8b-chat-hf',
        messages: [{ role: 'user', content: 'Say "test ok" in 2 words' }],
        max_tokens: 10
      }, {
        headers: { 'Authorization': `Bearer ${apiKey}` }
      });
      return response.data.choices[0].message.content;
    }
  },
  
  {
    name: 'Groq',
    apiKey: process.env.GROQ_API_KEY,
    test: async (apiKey) => {
      // Note: Groq model names changed recently
      const models = [
        'llama-3.2-90b-text-preview',
        'llama3-groq-70b-8192-tool-use-preview',
        'mixtral-8x7b-32768',
        'llama3-8b-8192'
      ];
      
      for (const model of models) {
        try {
          const response = await axios.post('https://api.groq.com/openai/v1/chat/completions', {
            model: model,
            messages: [{ role: 'user', content: 'Say "test ok" in 2 words' }],
            max_tokens: 10
          }, {
            headers: { 'Authorization': `Bearer ${apiKey}` }
          });
          console.log(`   → Working model: ${model}`);
          return response.data.choices[0].message.content;
        } catch (e) {
          continue;
        }
      }
      throw new Error('No working Groq models found');
    }
  },
  
  {
    name: 'XAI (Grok)',
    apiKey: process.env.XAI_API_KEY,
    test: async (apiKey) => {
      // XAI uses OpenAI-compatible endpoint
      const response = await axios.post('https://api.x.ai/v1/chat/completions', {
        model: 'grok-beta',
        messages: [{ role: 'user', content: 'Say "test ok" in 2 words' }],
        max_tokens: 10
      }, {
        headers: { 'Authorization': `Bearer ${apiKey}` }
      });
      return response.data.choices[0].message.content;
    }
  },
  
  {
    name: 'Google (Gemini)',
    apiKey: process.env.GOOGLE_API_KEY,
    test: async (apiKey) => {
      // Google uses different endpoint structure
      const response = await axios.post(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
        {
          contents: [{
            parts: [{
              text: 'Say "test ok" in 2 words'
            }]
          }]
        }
      );
      return response.data.candidates[0].content.parts[0].text;
    }
  },
  
  {
    name: 'AI21',
    apiKey: process.env.AI21_API_KEY,
    test: async (apiKey) => {
      const response = await axios.post('https://api.ai21.com/studio/v1/j2-ultra/complete', {
        prompt: 'Say "test ok" in 2 words:',
        maxTokens: 10,
        temperature: 0.7
      }, {
        headers: { 
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        }
      });
      return response.data.completions[0].data.text;
    }
  },
  
  {
    name: 'OpenRouter',
    apiKey: process.env.OPENROUTER_API_KEY,
    test: async (apiKey) => {
      const response = await axios.post('https://openrouter.ai/api/v1/chat/completions', {
        model: 'meta-llama/llama-3.1-70b-instruct',
        messages: [{ role: 'user', content: 'Say "test ok" in 2 words' }]
      }, {
        headers: { 
          'Authorization': `Bearer ${apiKey}`,
          'HTTP-Referer': 'https://llmpagerank.com',
          'Content-Type': 'application/json'
        }
      });
      return response.data.choices[0].message.content;
    }
  },
  
  {
    name: 'Perplexity',
    apiKey: process.env.PERPLEXITY_API_KEY,
    test: async (apiKey) => {
      const models = [
        'llama-3.1-sonar-small-128k-online',
        'llama-3.1-sonar-large-128k-online',
        'llama-3.1-sonar-huge-128k-online'
      ];
      
      for (const model of models) {
        try {
          const response = await axios.post('https://api.perplexity.ai/chat/completions', {
            model: model,
            messages: [{ role: 'user', content: 'Say "test ok" in 2 words' }]
          }, {
            headers: { 
              'Authorization': `Bearer ${apiKey}`,
              'Content-Type': 'application/json'
            }
          });
          console.log(`   → Working model: ${model}`);
          return response.data.choices[0].message.content;
        } catch (e) {
          continue;
        }
      }
      throw new Error('No working Perplexity models found');
    }
  }
];

async function testAllProviders() {
  console.log('🧪 TESTING ALL API KEYS AND MODELS');
  console.log('=====================================\n');
  
  const results = {
    working: [],
    failed: []
  };
  
  for (const provider of PROVIDERS) {
    process.stdout.write(`Testing ${provider.name}... `);
    
    if (!provider.apiKey) {
      console.log('❌ No API key');
      results.failed.push({ name: provider.name, error: 'No API key' });
      continue;
    }
    
    try {
      const result = await provider.test(provider.apiKey);
      console.log(`✅ Working! Response: "${result}"`);
      results.working.push(provider.name);
    } catch (error) {
      const errorMsg = error.response?.data?.error?.message || 
                      error.response?.data?.message || 
                      error.response?.status || 
                      error.message;
      console.log(`❌ Failed: ${errorMsg}`);
      
      // Show detailed error for debugging
      if (error.response?.data) {
        console.log(`   Details: ${JSON.stringify(error.response.data).substring(0, 200)}`);
      }
      
      results.failed.push({ 
        name: provider.name, 
        error: errorMsg,
        status: error.response?.status
      });
    }
    
    // Small delay to avoid rate limits
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  console.log('\n=====================================');
  console.log('📊 SUMMARY');
  console.log('=====================================');
  console.log(`✅ Working: ${results.working.length} providers`);
  results.working.forEach(p => console.log(`   - ${p}`));
  
  console.log(`\n❌ Failed: ${results.failed.length} providers`);
  results.failed.forEach(p => console.log(`   - ${p.name}: ${p.error} ${p.status ? `(HTTP ${p.status})` : ''}`));
  
  console.log('\n💡 RECOMMENDATIONS:');
  results.failed.forEach(p => {
    if (p.status === 401) {
      console.log(`   ${p.name}: Check API key format and validity`);
    } else if (p.status === 400) {
      console.log(`   ${p.name}: Model name or request format may be incorrect`);
    } else if (p.status === 404) {
      console.log(`   ${p.name}: API endpoint URL may be wrong`);
    }
  });
}

testAllProviders().catch(console.error);