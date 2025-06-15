const dotenv = require('dotenv');
dotenv.config();

console.log('🔍 CHECKING API KEY AVAILABILITY');
console.log('===============================');

const keys = {
    'OPENAI_API_KEY': process.env.OPENAI_API_KEY,
    'OPENAI_API_KEY2': process.env.OPENAI_API_KEY2,
    'ANTHROPIC_API_KEY': process.env.ANTHROPIC_API_KEY,
    'ATHROPTIC_API_KEY2': process.env.ATHROPTIC_API_KEY2,
    'TOGETHER_API_KEY': process.env.TOGETHER_API_KEY,
    'TOGETHER_API_KEY2': process.env.TOGETHER_API_KEY2,
    'DEEPSEEK_API_KEY': process.env.DEEPSEEK_API_KEY,
    'GOOGLE_API_KEY': process.env.GOOGLE_API_KEY,
    'GOOGLE_API_KEY2': process.env.GOOGLE_API_KEY2,
    'GOOGLE_API_KEY3': process.env.GOOGLE_API_KEY3,
    'MISTRAL_API_KEY': process.env.MISTRAL_API_KEY,
    'XAI_API_KEY': process.env.XAI_API_KEY,
    'XAI_API_KEY2': process.env.XAI_API_KEY2
};

let foundKeys = 0;
let totalKeys = 0;

for (const [keyName, keyValue] of Object.entries(keys)) {
    totalKeys++;
    const status = keyValue ? '✅ AVAILABLE' : '❌ MISSING';
    const preview = keyValue ? `${keyValue.substring(0, 8)}...` : 'undefined';
    console.log(`${keyName}: ${status} (${preview})`);
    if (keyValue) foundKeys++;
}

console.log('\n📊 SUMMARY:');
console.log(`✅ Available Keys: ${foundKeys}/${totalKeys}`);
console.log(`❌ Missing Keys: ${totalKeys - foundKeys}/${totalKeys}`);

if (foundKeys === 0) {
    console.log('\n🚨 CRITICAL: NO API KEYS FOUND!');
    console.log('Please add API keys to your .env file:');
    console.log('OPENAI_API_KEY=sk-...');
    console.log('ANTHROPIC_API_KEY=sk-ant-...');
    console.log('DEEPSEEK_API_KEY=sk-...');
    console.log('etc.');
} else if (foundKeys < 3) {
    console.log('\n⚠️  WARNING: Very few API keys available');
    console.log('Consider adding more keys for better redundancy');
} else {
    console.log('\n🎉 GOOD: Multiple API keys available for redundancy!');
}

// Test the fleet configuration
const { getFleetStatus } = require('./production_with_ultimate_fleet');
console.log('\n🚀 FLEET STATUS:');
const fleetStatus = getFleetStatus();
for (const [provider, status] of Object.entries(fleetStatus)) {
    const operationalStatus = status.operational ? '✅ OPERATIONAL' : '❌ NO KEYS';
    console.log(`${provider.toUpperCase()}: ${operationalStatus} (${status.keys_available} keys)`);
} 