#!/usr/bin/env node

// Simple startup script for Render Background Worker
console.log('🚀 Starting Domain Crawler Background Worker');
console.log('Time:', new Date().toISOString());
console.log('Environment:', process.env.NODE_ENV || 'development');

// Check for API keys
const apiKeys = {
  OPENAI: !!process.env.OPENAI_API_KEY,
  ANTHROPIC: !!process.env.ANTHROPIC_API_KEY,
  DEEPSEEK: !!process.env.DEEPSEEK_API_KEY,
  MISTRAL: !!process.env.MISTRAL_API_KEY,
  COHERE: !!process.env.COHERE_API_KEY,
  TOGETHER: !!process.env.TOGETHER_API_KEY,
  GROQ: !!process.env.GROQ_API_KEY,
  XAI: !!process.env.XAI_API_KEY,
  GOOGLE: !!process.env.GOOGLE_API_KEY,
  AI21: !!process.env.AI21_API_KEY,
  OPENROUTER: !!process.env.OPENROUTER_API_KEY,
  PERPLEXITY: !!process.env.PERPLEXITY_API_KEY
};

console.log('\n📊 API Keys Status:');
Object.entries(apiKeys).forEach(([key, present]) => {
  console.log(`  ${present ? '✅' : '❌'} ${key}`);
});

// Start the actual crawler
console.log('\n🔄 Starting crawler-working.js...\n');
require('./crawler-working.js');