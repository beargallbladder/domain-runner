#!/usr/bin/env node

// COMPREHENSIVE API KEY DEBUGGING SCRIPT
// This script will verify API keys are accessible and working on Render

const axios = require('axios');

console.log('🔑 COMPREHENSIVE API KEY DEBUGGING');
console.log('=====================================');
console.log('Verifying all API keys are accessible and working...\n');

// All API keys the crawler needs
const API_KEYS = {
  // Base LLM providers
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
  
  // Search-enhanced providers
  PERPLEXITY_API_KEY: process.env.PERPLEXITY_API_KEY,
  YOU_API_KEY: process.env.YOU_API_KEY
};

console.log('1️⃣ ENVIRONMENT CHECK');
console.log('-------------------');
console.log(`Node.js version: ${process.version}`);
console.log(`Platform: ${process.platform}`);
console.log(`Environment: ${process.env.NODE_ENV || 'not set'}`);
console.log(`Running on Render: ${process.env.RENDER ? 'YES' : 'NO'}`);
console.log(`Render service: ${process.env.RENDER_SERVICE_NAME || 'not set'}`);
console.log('');

console.log('2️⃣ API KEY AVAILABILITY CHECK');
console.log('-----------------------------');
let foundKeys = 0;
let missingKeys = [];

Object.entries(API_KEYS).forEach(([keyName, keyValue]) => {
  if (keyValue && keyValue.length > 0) {
    console.log(`✅ ${keyName}: Found (${keyValue.substring(0, 8)}...)`);
    foundKeys++;
  } else {
    console.log(`❌ ${keyName}: NOT FOUND`);
    missingKeys.push(keyName);
  }
});

console.log(`\nSummary: ${foundKeys}/${Object.keys(API_KEYS).length} API keys found`);
if (missingKeys.length > 0) {
  console.log(`Missing keys: ${missingKeys.join(', ')}`);
}
console.log('');

// Test actual API calls
console.log('3️⃣ API FUNCTIONALITY TESTS');
console.log('---------------------------');

async function testOpenAI() {
  if (!API_KEYS.OPENAI_API_KEY) {
    console.log('❌ OpenAI: No API key');
    return false;
  }
  
  try {
    const response = await axios.post('https://api.openai.com/v1/chat/completions', {
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: 'Say "API test successful"' }],
      max_tokens: 10
    }, {
      headers: { 'Authorization': `Bearer ${API_KEYS.OPENAI_API_KEY}` },
      timeout: 10000
    });
    
    console.log('✅ OpenAI: API call successful');
    console.log(`   Response: "${response.data.choices[0].message.content}"`);
    return true;
  } catch (error) {
    console.log(`❌ OpenAI: ${error.response?.data?.error?.message || error.message}`);
    return false;
  }
}

async function testAnthropic() {
  if (!API_KEYS.ANTHROPIC_API_KEY) {
    console.log('❌ Anthropic: No API key');
    return false;
  }
  
  try {
    const response = await axios.post('https://api.anthropic.com/v1/messages', {
      model: 'claude-3-haiku-20240307',
      messages: [{ role: 'user', content: 'Say "API test successful"' }],
      max_tokens: 10
    }, {
      headers: { 
        'x-api-key': API_KEYS.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      timeout: 10000
    });
    
    console.log('✅ Anthropic: API call successful');
    console.log(`   Response: "${response.data.content[0].text}"`);
    return true;
  } catch (error) {
    console.log(`❌ Anthropic: ${error.response?.data?.error?.message || error.message}`);
    return false;
  }
}

async function testPerplexity() {
  if (!API_KEYS.PERPLEXITY_API_KEY) {
    console.log('❌ Perplexity: No API key');
    return false;
  }
  
  try {
    const response = await axios.post('https://api.perplexity.ai/chat/completions', {
      model: 'llama-3.1-sonar-small-128k-online',
      messages: [{ role: 'user', content: 'What is 2+2?' }]
    }, {
      headers: { 'Authorization': `Bearer ${API_KEYS.PERPLEXITY_API_KEY}` },
      timeout: 15000
    });
    
    console.log('✅ Perplexity: API call successful');
    console.log(`   Response: "${response.data.choices[0].message.content.substring(0, 50)}..."`);
    return true;
  } catch (error) {
    console.log(`❌ Perplexity: ${error.response?.data?.error?.message || error.message}`);
    return false;
  }
}

async function testOpenRouter() {
  if (!API_KEYS.OPENROUTER_API_KEY) {
    console.log('❌ OpenRouter: No API key');
    return false;
  }
  
  try {
    const response = await axios.post('https://openrouter.ai/api/v1/chat/completions', {
      model: 'meta-llama/llama-3.1-70b-instruct',
      messages: [{ role: 'user', content: 'Say "API test successful"' }]
    }, {
      headers: { 
        'Authorization': `Bearer ${API_KEYS.OPENROUTER_API_KEY}`,
        'HTTP-Referer': 'https://llmpagerank.com'
      },
      timeout: 15000
    });
    
    console.log('✅ OpenRouter: API call successful');
    console.log(`   Response: "${response.data.choices[0].message.content}"`);
    return true;
  } catch (error) {
    console.log(`❌ OpenRouter: ${error.response?.data?.error?.message || error.message}`);
    return false;
  }
}

async function runAPITests() {
  const tests = [
    testOpenAI,
    testAnthropic,
    testPerplexity,
    testOpenRouter
  ];
  
  let successful = 0;
  for (const test of tests) {
    const result = await test();
    if (result) successful++;
    // Wait between tests to avoid rate limits
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  console.log(`\n📊 API Test Results: ${successful}/${tests.length} providers working`);
  
  if (successful === 0) {
    console.log('🚨 CRITICAL: No API providers are working!');
    console.log('   This explains why the crawler produces no data.');
  } else if (successful < tests.length / 2) {
    console.log('⚠️  WARNING: Most API providers are failing');
    console.log('   The crawler may have very limited data collection.');
  } else {
    console.log('✅ Most API providers are working');
    console.log('   API connectivity is not the primary issue.');
  }
}

console.log('4️⃣ ENVIRONMENT VARIABLE DEBUGGING');
console.log('----------------------------------');

// Check if environment variables are being loaded correctly
console.log('Environment variable sources:');
console.log(`- process.env length: ${Object.keys(process.env).length}`);
console.log(`- PATH exists: ${!!process.env.PATH}`);
console.log(`- HOME exists: ${!!process.env.HOME}`);
console.log(`- NODE_ENV: ${process.env.NODE_ENV || 'undefined'}`);

// Check for common environment issues
if (process.env.NODE_ENV === 'production' && foundKeys < 5) {
  console.log('⚠️  WARNING: Production environment but few API keys found');
  console.log('   API keys might be set on wrong service or environment');
}

console.log('');

async function main() {
  await runAPITests();
  
  console.log('\n🔍 TROUBLESHOOTING GUIDE');
  console.log('========================');
  
  if (foundKeys === 0) {
    console.log('🚨 NO API KEYS FOUND:');
    console.log('1. Check if you\'re looking at the right Render service');
    console.log('2. Verify API keys are set in Render dashboard');
    console.log('3. Check if keys are set as environment variables (not secrets)');
    console.log('4. Restart the Render service after adding keys');
  } else if (foundKeys < Object.keys(API_KEYS).length / 2) {
    console.log('⚠️  PARTIAL API KEY SETUP:');
    console.log('1. Some API keys are missing from Render environment');
    console.log('2. Check Render dashboard for all required keys');
    console.log('3. Verify key names match exactly (case sensitive)');
  } else {
    console.log('✅ API KEYS LOOK GOOD:');
    console.log('1. Most API keys are present and working');
    console.log('2. The issue is likely database-related (missing tables)');
    console.log('3. Check database schema and connectivity');
  }
  
  console.log('\n🎯 NEXT STEPS:');
  console.log('1. Run debug-database.js to check database issues');
  console.log('2. If database is missing tables, create them');
  console.log('3. Re-run crawler with improved logging');
  console.log('4. Monitor logs for specific error messages');
}

main().catch(console.error);