#!/usr/bin/env node

// Test swarm configuration locally
const { SWARM_PROVIDERS } = require('./services/sophisticated-runner/dist/volatility-swarm');

console.log('🐝 SWARM CONFIGURATION TEST');
console.log('==========================\n');

const keyMap = {
  'openai': 'OPENAI_API_KEY',
  'anthropic': 'ANTHROPIC_API_KEY',
  'together': 'TOGETHER_API_KEY',
  'cohere': 'COHERE_API_KEY',
  'mistral': 'MISTRAL_API_KEY',
  'google': 'GOOGLE_API_KEY',
  'groq': 'GROQ_API_KEY',
  'deepseek': 'DEEPSEEK_API_KEY',
  'perplexity': 'PERPLEXITY_API_KEY',
  'xai': 'XAI_API_KEY'
};

let totalModels = 0;
let activeModels = 0;

Object.entries(SWARM_PROVIDERS).forEach(([provider, config]) => {
  const hasKey = !!process.env[keyMap[provider]];
  const status = hasKey ? '✅' : '❌';
  
  console.log(`${status} ${provider.toUpperCase()} (${config.tier})`);
  console.log(`   Models: ${config.models.length}`);
  config.models.forEach(model => {
    console.log(`   - ${model}`);
  });
  console.log('');
  
  totalModels += config.models.length;
  if (hasKey) activeModels += config.models.length;
});

console.log('SUMMARY:');
console.log(`Total possible models: ${totalModels}`);
console.log(`Currently active: ${activeModels}`);
console.log(`Missing: ${totalModels - activeModels}`);

// Calculate tier coverage
const tiers = {
  MAXIMUM_COVERAGE: totalModels,
  HIGH_QUALITY_COVERAGE: Math.floor(totalModels * 0.6),
  BALANCED_COVERAGE: Math.floor(totalModels * 0.3),
  EFFICIENT_COVERAGE: Math.floor(totalModels * 0.15)
};

console.log('\nPROCESSING TIERS:');
Object.entries(tiers).forEach(([tier, count]) => {
  console.log(`${tier}: ~${count} models`);
});