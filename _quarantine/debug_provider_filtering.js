// Debug script to understand provider filtering
// This mimics the code from sophisticated-runner

function getApiKeys(providerName) {
  const upperName = providerName.toUpperCase();
  const keys = [];
  
  // Simulate environment variables
  const testEnv = {
    'XAI_API_KEY': 'test-xai-1',
    'XAI_API_KEY_2': 'test-xai-2',
    'PERPLEXITY_API_KEY_1': 'test-perp-1',
    'PERPLEXITY_API_KEY2': 'test-perp-2',
    'GOOGLE_API_KEY': 'test-google-1',
    'GOOGLE_API_KEY_2': 'test-google-2',
    'AI21_API_KEY_1': 'test-ai21-1',
    'AI21_API_KEY_2': 'test-ai21-2'
  };
  
  // Try base key
  if (testEnv[`${upperName}_API_KEY`]) {
    keys.push(testEnv[`${upperName}_API_KEY`]);
  }
  
  // Try numbered keys with both formats
  for (let i = 1; i <= 5; i++) {
    // Try with underscore: KEY_1, KEY_2, etc
    if (testEnv[`${upperName}_API_KEY_${i}`]) {
      keys.push(testEnv[`${upperName}_API_KEY_${i}`]);
    }
    // Try without underscore: KEY1, KEY2, etc
    if (testEnv[`${upperName}_API_KEY${i}`]) {
      keys.push(testEnv[`${upperName}_API_KEY${i}`]);
    }
  }
  
  return keys.filter(Boolean);
}

// Test all providers
const providers = ['xai', 'perplexity', 'google', 'ai21'];

console.log('Testing getApiKeys function:');
console.log('=' .repeat(50));

providers.forEach(provider => {
  const keys = getApiKeys(provider);
  console.log(`${provider}: ${keys.length} keys found`);
  if (keys.length === 0) {
    console.log(`  ❌ Would be filtered out!`);
  } else {
    console.log(`  ✅ Keys: ${keys.join(', ')}`);
  }
});

// Now check the actual filtering
console.log('\n' + '='.repeat(50));
console.log('Testing provider filtering:');

const allProviders = [
  { name: 'xai', model: 'grok-2', keys: getApiKeys('xai') },
  { name: 'perplexity', model: 'sonar', keys: getApiKeys('perplexity') },
  { name: 'google', model: 'gemini-1.5-flash', keys: getApiKeys('google') },
  { name: 'ai21', model: 'jamba-mini', keys: getApiKeys('ai21') }
];

console.log('\nBefore filtering:');
allProviders.forEach(p => {
  console.log(`  ${p.name}: ${p.keys.length} keys`);
});

const workingProviders = allProviders.filter(p => p.keys[0]);

console.log('\nAfter filtering (p.keys[0]):');
console.log(`  ${workingProviders.length}/${allProviders.length} providers pass filter`);
workingProviders.forEach(p => {
  console.log(`  ✅ ${p.name}`);
});

const filtered = allProviders.filter(p => !p.keys[0]);
filtered.forEach(p => {
  console.log(`  ❌ ${p.name} - filtered out`);
});