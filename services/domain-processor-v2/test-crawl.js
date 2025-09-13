#!/usr/bin/env node

// TEST CRAWL - Verify API keys on Render
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://raw_capture_db_user:wjFesUM8ISNEvE2b4kZtRAKgGYJVtKK5@dpg-d11fqgndiees73fb35dg-a.oregon-postgres.render.com/raw_capture_db',
  ssl: { rejectUnauthorized: false }
});

console.log('🔑 TESTING API KEYS ON RENDER');
console.log('=====================================');

const apiKeys = {
  OPENAI_API_KEY: process.env.OPENAI_API_KEY,
  ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY,
  DEEPSEEK_API_KEY: process.env.DEEPSEEK_API_KEY,
  MISTRAL_API_KEY: process.env.MISTRAL_API_KEY,
  COHERE_API_KEY: process.env.COHERE_API_KEY,
  TOGETHER_API_KEY: process.env.TOGETHER_API_KEY,
  GROQ_API_KEY: process.env.GROQ_API_KEY,
  XAI_API_KEY: process.env.XAI_API_KEY,
  GOOGLE_API_KEY: process.env.GOOGLE_API_KEY,
  GEMINI_API_KEY: process.env.GEMINI_API_KEY,
  AI21_API_KEY: process.env.AI21_API_KEY,
  OPENROUTER_API_KEY: process.env.OPENROUTER_API_KEY,
  PERPLEXITY_API_KEY: process.env.PERPLEXITY_API_KEY,
  YOU_API_KEY: process.env.YOU_API_KEY
};

console.log('\n📊 API Keys Found:');
Object.entries(apiKeys).forEach(([key, value]) => {
  if (value) {
    console.log(`✅ ${key}: ${value.substring(0, 10)}...`);
  } else {
    console.log(`❌ ${key}: NOT FOUND`);
  }
});

// Test one API call with OpenAI
if (apiKeys.OPENAI_API_KEY) {
  console.log('\n🧪 Testing OpenAI API...');
  const axios = require('axios');
  
  axios.post('https://api.openai.com/v1/chat/completions', {
    model: 'gpt-3.5-turbo',
    messages: [{ role: 'user', content: 'Say hello' }],
    max_tokens: 10
  }, {
    headers: { 'Authorization': `Bearer ${apiKeys.OPENAI_API_KEY}` }
  })
  .then(response => {
    console.log('✅ OpenAI API WORKS!');
    console.log('Response:', response.data.choices[0].message.content);
    
    // Store test result
    return pool.query(`
      INSERT INTO domain_responses (domain_id, model, response, sentiment_score, created_at)
      VALUES ('0002c7dd-eb97-402e-a0c0-cdfe55fbe64d', 'test-crawl', $1, 50, NOW())
    `, [JSON.stringify(response.data)]);
  })
  .then(() => {
    console.log('✅ Database write successful!');
    process.exit(0);
  })
  .catch(error => {
    console.error('❌ OpenAI API Error:', error.response?.data || error.message);
    process.exit(1);
  });
} else {
  console.log('\n❌ No OpenAI API key found!');
  console.log('Environment:', process.env.NODE_ENV || 'not set');
  console.log('Render:', process.env.RENDER || 'not on Render');
  process.exit(1);
}