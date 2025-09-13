#!/usr/bin/env node

// PRODUCTION CRAWLER RUNNER - Executes on Render with all API keys
const { exec } = require('child_process');
const fs = require('fs');

console.log(`
🚀 STARTING TENSOR CRAWL ON RENDER
====================================
Time: ${new Date().toISOString()}
Environment: ${process.env.RENDER ? 'RENDER PRODUCTION' : 'LOCAL'}
====================================
`);

// Check which API keys are available
const apiKeys = {
  OPENAI: !!process.env.OPENAI_API_KEY,
  ANTHROPIC: !!process.env.ANTHROPIC_API_KEY,
  DEEPSEEK: !!process.env.DEEPSEEK_API_KEY,
  MISTRAL: !!process.env.MISTRAL_API_KEY,
  COHERE: !!process.env.COHERE_API_KEY,
  TOGETHER: !!process.env.TOGETHER_API_KEY,
  GROQ: !!process.env.GROQ_API_KEY,
  XAI: !!process.env.XAI_API_KEY,
  GOOGLE: !!process.env.GOOGLE_API_KEY || !!process.env.GEMINI_API_KEY,
  AI21: !!process.env.AI21_API_KEY,
  OPENROUTER: !!process.env.OPENROUTER_API_KEY,
  PERPLEXITY: !!process.env.PERPLEXITY_API_KEY,
  YOU: !!process.env.YOU_API_KEY
};

console.log('🔑 API Keys Available:');
Object.entries(apiKeys).forEach(([key, available]) => {
  console.log(`  ${available ? '✅' : '❌'} ${key}`);
});

const availableCount = Object.values(apiKeys).filter(v => v).length;
console.log(`\n📊 Total: ${availableCount}/13 providers available`);

if (availableCount < 10) {
  console.log('\n⚠️  WARNING: Less than 10 providers available!');
  console.log('Tensor analysis may be incomplete.\n');
}

// Start the crawler
console.log('\n🔄 Launching crawler process...\n');
const crawler = exec('node crawler-tensor.js', {
  cwd: __dirname,
  env: process.env
});

crawler.stdout.on('data', (data) => {
  process.stdout.write(data);
});

crawler.stderr.on('data', (data) => {
  process.stderr.write(data);
});

crawler.on('close', (code) => {
  console.log(`\n✅ Crawler process exited with code ${code}`);
  
  // Log completion
  const completionTime = new Date().toISOString();
  const logMessage = `Crawl completed at ${completionTime} with exit code ${code}\n`;
  
  fs.appendFileSync('/tmp/crawl.log', logMessage);
  console.log('\n📝 Logged to /tmp/crawl.log');
  
  process.exit(code);
});