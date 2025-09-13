#!/usr/bin/env node
/**
 * Check if API keys for missing providers are actually configured
 */

const providers = ['xai', 'perplexity', 'google', 'ai21'];

console.log('🔍 Checking Environment Variables for Missing Providers');
console.log('=' + '='.repeat(60));

providers.forEach(provider => {
    const upperName = provider.toUpperCase();
    const keys = [];
    
    // Check base key
    if (process.env[`${upperName}_API_KEY`]) {
        keys.push(`${upperName}_API_KEY`);
    }
    
    // Check numbered keys
    for (let i = 1; i <= 5; i++) {
        if (process.env[`${upperName}_API_KEY_${i}`]) {
            keys.push(`${upperName}_API_KEY_${i}`);
        }
        if (process.env[`${upperName}_API_KEY${i}`]) {
            keys.push(`${upperName}_API_KEY${i}`);
        }
    }
    
    if (keys.length > 0) {
        console.log(`✅ ${provider}: ${keys.length} keys found (${keys.join(', ')})`);
    } else {
        console.log(`❌ ${provider}: NO KEYS FOUND`);
    }
});

console.log('\n📋 All Environment Variables with API_KEY:');
Object.keys(process.env).filter(k => k.includes('API_KEY')).forEach(key => {
    console.log(`  ${key}: ${process.env[key] ? '✅ SET' : '❌ NOT SET'}`);
});