// Test that all 11 LLMs are configured
const fs = require('fs');
const path = require('path');

// Read the index.ts file
const indexPath = path.join(__dirname, 'services/sophisticated-runner/src/index.ts');
const indexContent = fs.readFileSync(indexPath, 'utf8');

// Check for all 11 providers
const providers = [
  'openai', 'anthropic', 'deepseek', 'mistral', 'xai',
  'together', 'perplexity', 'google', 'cohere', 'ai21', 'groq'
];

console.log('🧪 CHECKING 11 LLM CONFIGURATION');
console.log('=' + '='.repeat(50));

let found = 0;
providers.forEach(provider => {
  const regex = new RegExp(`${provider}.*model:.*'([^']+)'`, 'i');
  const match = indexContent.match(regex);
  
  if (match) {
    console.log(`✅ ${provider.padEnd(12)}: ${match[1]}`);
    found++;
  } else {
    console.log(`❌ ${provider.padEnd(12)}: NOT FOUND`);
  }
});

console.log('\n' + '='.repeat(50));
console.log(`📊 RESULT: ${found}/11 providers configured`);

if (found === 11) {
  console.log('✅ All 11 LLMs are configured in the code!');
} else {
  console.log('❌ Some LLMs are missing from configuration');
}