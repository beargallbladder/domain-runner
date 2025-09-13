#!/usr/bin/env node
/**
 * Test if the missing providers have API keys configured
 */

// Mock the getApiKeys function from sophisticated-runner
function getApiKeys(providerName) {
    const upperName = providerName.toUpperCase();
    const keys = [];
    
    // Try base key
    if (process.env[`${upperName}_API_KEY`]) {
        keys.push(process.env[`${upperName}_API_KEY`]);
    }
    
    // Try numbered keys with both formats
    for (let i = 1; i <= 5; i++) {
        // Try with underscore: KEY_1, KEY_2, etc
        if (process.env[`${upperName}_API_KEY_${i}`]) {
            keys.push(process.env[`${upperName}_API_KEY_${i}`]);
        }
        // Try without underscore: KEY1, KEY2, etc
        if (process.env[`${upperName}_API_KEY${i}`]) {
            keys.push(process.env[`${upperName}_API_KEY${i}`]);
        }
    }
    
    return keys.filter(Boolean);
}

// Test the missing providers
const missingProviders = [
    { name: 'xai', model: 'grok-2' },
    { name: 'perplexity', model: 'sonar' },
    { name: 'google', model: 'gemini-1.5-flash' },
    { name: 'ai21', model: 'jamba-mini' }
];

console.log('🔍 Testing Missing Providers');
console.log('=' + '='.repeat(60));

// First, show all API_KEY environment variables
console.log('\n📋 All API_KEY Environment Variables:');
const apiKeys = Object.keys(process.env).filter(k => k.includes('API_KEY'));
apiKeys.forEach(key => {
    const value = process.env[key];
    console.log(`  ${key}: ${value ? `✅ SET (${value.substring(0, 8)}...)` : '❌ NOT SET'}`);
});

console.log('\n\n🔍 Testing Missing Providers:');
missingProviders.forEach(provider => {
    const keys = getApiKeys(provider.name);
    const hasKeys = keys.length > 0;
    
    console.log(`\n${provider.name}:`);
    console.log(`  Model: ${provider.model}`);
    console.log(`  Keys found: ${keys.length}`);
    
    if (hasKeys) {
        console.log(`  ✅ Has API keys: ${keys.map(k => k.substring(0, 8) + '...').join(', ')}`);
        console.log(`  ✅ Would pass p.keys[0] filter`);
    } else {
        console.log(`  ❌ NO API KEYS FOUND`);
        console.log(`  ❌ Would be filtered out by p.keys[0]`);
    }
});

// Simulate the filter logic
console.log('\n\n🔍 Simulating Provider Filter:');
const FAST_PROVIDERS = [
    { name: 'xai', model: 'grok-2', keys: getApiKeys('xai') },
    { name: 'perplexity', model: 'sonar', keys: getApiKeys('perplexity') }
];

const MEDIUM_PROVIDERS = [
    { name: 'ai21', model: 'jamba-mini', keys: getApiKeys('ai21') }
];

const SLOW_PROVIDERS = [
    { name: 'google', model: 'gemini-1.5-flash', keys: getApiKeys('google') }
];

console.log('\nFAST_PROVIDERS after filter:');
FAST_PROVIDERS.filter(p => p.keys[0]).forEach(p => {
    console.log(`  ✅ ${p.name} (${p.keys.length} keys)`);
});
FAST_PROVIDERS.filter(p => !p.keys[0]).forEach(p => {
    console.log(`  ❌ ${p.name} FILTERED OUT (no keys)`);
});

console.log('\nMEDIUM_PROVIDERS after filter:');
MEDIUM_PROVIDERS.filter(p => p.keys[0]).forEach(p => {
    console.log(`  ✅ ${p.name} (${p.keys.length} keys)`);
});
MEDIUM_PROVIDERS.filter(p => !p.keys[0]).forEach(p => {
    console.log(`  ❌ ${p.name} FILTERED OUT (no keys)`);
});

console.log('\nSLOW_PROVIDERS after filter:');
SLOW_PROVIDERS.filter(p => p.keys[0]).forEach(p => {
    console.log(`  ✅ ${p.name} (${p.keys.length} keys)`);
});
SLOW_PROVIDERS.filter(p => !p.keys[0]).forEach(p => {
    console.log(`  ❌ ${p.name} FILTERED OUT (no keys)`);
});

console.log('\n\n💡 CONCLUSION:');
console.log('The providers are being filtered out because their API keys are not set');
console.log('in the environment. They need to be added to Render\'s environment variables.');