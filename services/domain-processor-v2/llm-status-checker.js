#!/usr/bin/env node

// COMPREHENSIVE LLM STATUS CHECKER - Test ALL providers that have worked before
const { Pool } = require('pg');
const axios = require('axios');
const fs = require('fs');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://raw_capture_db_user:wjFesUM8ISNEvE2b4kZtRAKgGYJVtKK5@dpg-d11fqgndiees73fb35dg-a.oregon-postgres.render.com/raw_capture_db',
  ssl: { rejectUnauthorized: false }
});

// ALL PROVIDERS THAT HAVE SUCCESSFULLY WORKED IN PRODUCTION
const PROVIDERS = [
  {
    name: 'openai/gpt-4o-mini',
    apiKey: process.env.OPENAI_API_KEY,
    test: async (prompt) => {
      const response = await axios.post('https://api.openai.com/v1/chat/completions', {
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 100
      }, {
        headers: { 'Authorization': `Bearer ${process.env.OPENAI_API_KEY}` },
        timeout: 10000
      });
      return response.data.choices[0].message.content;
    }
  },
  {
    name: 'anthropic/claude-3-haiku',
    apiKey: process.env.ANTHROPIC_API_KEY,
    test: async (prompt) => {
      const response = await axios.post('https://api.anthropic.com/v1/messages', {
        model: 'claude-3-haiku-20240307',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 100
      }, {
        headers: { 
          'x-api-key': process.env.ANTHROPIC_API_KEY,
          'anthropic-version': '2023-06-01'
        },
        timeout: 10000
      });
      return response.data.content[0].text;
    }
  },
  {
    name: 'deepseek/deepseek-chat',
    apiKey: process.env.DEEPSEEK_API_KEY,
    test: async (prompt) => {
      const response = await axios.post('https://api.deepseek.com/v1/chat/completions', {
        model: 'deepseek-chat',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 100
      }, {
        headers: { 'Authorization': `Bearer ${process.env.DEEPSEEK_API_KEY}` },
        timeout: 10000
      });
      return response.data.choices[0].message.content;
    }
  },
  {
    name: 'mistral/mistral-small-latest',
    apiKey: process.env.MISTRAL_API_KEY,
    test: async (prompt) => {
      const response = await axios.post('https://api.mistral.ai/v1/chat/completions', {
        model: 'mistral-small-latest',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 100
      }, {
        headers: { 'Authorization': `Bearer ${process.env.MISTRAL_API_KEY}` },
        timeout: 10000
      });
      return response.data.choices[0].message.content;
    }
  },
  {
    name: 'cohere/command-r-plus',
    apiKey: process.env.COHERE_API_KEY,
    test: async (prompt) => {
      const response = await axios.post('https://api.cohere.ai/v1/generate', {
        model: 'command-r-plus',
        prompt: prompt,
        max_tokens: 100
      }, {
        headers: { 
          'Authorization': `Bearer ${process.env.COHERE_API_KEY}`,
          'Content-Type': 'application/json'
        },
        timeout: 10000
      });
      return response.data.generations[0].text;
    }
  },
  {
    name: 'together/meta-llama/Llama-3-8b-chat-hf',
    apiKey: process.env.TOGETHER_API_KEY,
    test: async (prompt) => {
      const response = await axios.post('https://api.together.xyz/inference', {
        model: 'meta-llama/Llama-3-8b-chat-hf',
        prompt: prompt,
        max_tokens: 100
      }, {
        headers: { 'Authorization': `Bearer ${process.env.TOGETHER_API_KEY}` },
        timeout: 10000
      });
      return response.data.output.choices[0].text;
    }
  },
  {
    name: 'groq/llama-3.2-90b-text-preview',
    apiKey: process.env.GROQ_API_KEY,
    test: async (prompt) => {
      const response = await axios.post('https://api.groq.com/openai/v1/chat/completions', {
        model: 'llama-3.2-90b-text-preview',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 100
      }, {
        headers: { 'Authorization': `Bearer ${process.env.GROQ_API_KEY}` },
        timeout: 10000
      });
      return response.data.choices[0].message.content;
    }
  },
  {
    name: 'xai/grok-2',
    apiKey: process.env.XAI_API_KEY,
    test: async (prompt) => {
      const response = await axios.post('https://api.x.ai/v1/chat/completions', {
        model: 'grok-2',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 100
      }, {
        headers: { 'Authorization': `Bearer ${process.env.XAI_API_KEY}` },
        timeout: 10000
      });
      return response.data.choices[0].message.content;
    }
  },
  {
    name: 'google/gemini-1.5-flash',
    apiKey: process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY,
    test: async (prompt) => {
      const apiKey = process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY;
      const response = await axios.post(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
        {
          contents: [{ parts: [{ text: prompt }] }]
        },
        { timeout: 10000 }
      );
      return response.data.candidates[0].content.parts[0].text;
    }
  },
  {
    name: 'ai21/jamba-1.5-large',
    apiKey: process.env.AI21_API_KEY,
    test: async (prompt) => {
      const response = await axios.post('https://api.ai21.com/studio/v1/j2-large/complete', {
        prompt: prompt,
        maxTokens: 100
      }, {
        headers: { 'Authorization': `Bearer ${process.env.AI21_API_KEY}` },
        timeout: 10000
      });
      return response.data.completions[0].data.text;
    }
  },
  {
    name: 'openrouter/hermes-3-llama-3.1-70b',
    apiKey: process.env.OPENROUTER_API_KEY,
    test: async (prompt) => {
      const response = await axios.post('https://openrouter.ai/api/v1/chat/completions', {
        model: 'meta-llama/llama-3.1-70b-instruct',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 100
      }, {
        headers: { 
          'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
          'HTTP-Referer': 'https://llmrank.io'
        },
        timeout: 10000
      });
      return response.data.choices[0].message.content;
    }
  },
  {
    name: 'perplexity/llama-3.1-sonar-large-128k-online',
    apiKey: process.env.PERPLEXITY_API_KEY,
    test: async (prompt) => {
      const response = await axios.post('https://api.perplexity.ai/chat/completions', {
        model: 'llama-3.1-sonar-large-128k-online',
        messages: [{ role: 'user', content: prompt }]
      }, {
        headers: { 'Authorization': `Bearer ${process.env.PERPLEXITY_API_KEY}` },
        timeout: 10000
      });
      return response.data.choices[0].message.content;
    }
  }
];

async function testAllProviders() {
  console.log('🔍 COMPREHENSIVE LLM STATUS CHECK');
  console.log('=' .repeat(60));
  console.log(`Time: ${new Date().toISOString()}`);
  console.log(`Environment: ${process.env.RENDER ? 'RENDER PRODUCTION' : 'LOCAL'}`);
  console.log('=' .repeat(60));
  
  const results = {
    working: [],
    failed: [],
    no_key: []
  };
  
  console.log('\n📊 TESTING ALL PROVIDERS:\n');
  
  for (const provider of PROVIDERS) {
    process.stdout.write(`Testing ${provider.name.padEnd(40)}`);
    
    if (!provider.apiKey) {
      console.log('❌ NO API KEY');
      results.no_key.push(provider.name);
      continue;
    }
    
    try {
      const startTime = Date.now();
      const response = await provider.test('What is 2+2?');
      const responseTime = Date.now() - startTime;
      
      if (response && response.length > 0) {
        console.log(`✅ WORKING (${responseTime}ms)`);
        results.working.push({
          name: provider.name,
          responseTime,
          sampleResponse: response.substring(0, 50)
        });
      } else {
        console.log('❌ EMPTY RESPONSE');
        results.failed.push({ name: provider.name, error: 'Empty response' });
      }
    } catch (error) {
      const errorMsg = error.response?.data?.error?.message || error.message || 'Unknown error';
      console.log(`❌ FAILED: ${errorMsg.substring(0, 50)}`);
      results.failed.push({ name: provider.name, error: errorMsg });
    }
  }
  
  // Summary
  console.log('\n' + '=' .repeat(60));
  console.log('📈 SUMMARY:\n');
  
  console.log(`✅ WORKING PROVIDERS (${results.working.length}/${PROVIDERS.length}):`);
  results.working.forEach(p => {
    console.log(`   • ${p.name} - ${p.responseTime}ms`);
  });
  
  if (results.failed.length > 0) {
    console.log(`\n❌ FAILED PROVIDERS (${results.failed.length}):`);
    results.failed.forEach(p => {
      console.log(`   • ${p.name}: ${p.error.substring(0, 50)}`);
    });
  }
  
  if (results.no_key.length > 0) {
    console.log(`\n🔑 MISSING API KEYS (${results.no_key.length}):`);
    results.no_key.forEach(name => {
      console.log(`   • ${name}`);
    });
  }
  
  // Save results to file
  const reportPath = '/tmp/llm-status-report.json';
  fs.writeFileSync(reportPath, JSON.stringify({
    timestamp: new Date().toISOString(),
    environment: process.env.RENDER ? 'RENDER' : 'LOCAL',
    results
  }, null, 2));
  
  console.log(`\n📁 Full report saved to: ${reportPath}`);
  
  // Skip database update for now (table doesn't exist yet)
  // Can be added later if needed
  
  // Don't end the pool here if we're being called from server.js
  // Only end it if running directly
  if (require.main === module) {
    await pool.end();
  }
  
  return results;
}

// Run if called directly
if (require.main === module) {
  testAllProviders().then(results => {
    process.exit(results.working.length > 0 ? 0 : 1);
  });
}

module.exports = { testAllProviders, PROVIDERS };