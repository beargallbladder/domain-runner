#!/usr/bin/env node

/**
 * 🚀 SIMPLE SCHEDULER TEST
 * Uses built-in modules and existing dependencies
 */

const { Pool } = require('pg');
const https = require('https');

const DATABASE_URL = 'postgresql://raw_capture_db_user:wjFesUM8ISNEvE2b4kZtRAKgGYJVtKK5@dpg-d11fqgndiees73fb35dg-a.oregon-postgres.render.com/raw_capture_db';
const SOPHISTICATED_RUNNER_URL = 'https://sophisticated-runner.onrender.com';

// Test the current logic
async function testCurrentLogic() {
  console.log('🚀 TESTING CURRENT SCHEDULING LOGIC');
  console.log('===================================');
  
  const pool = new Pool({
    connectionString: DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });
  
  try {
    // Check current domain status
    console.log('📊 Checking current domain status...');
    const statusResult = await pool.query(`
      SELECT status, COUNT(*) as count 
      FROM domains 
      GROUP BY status 
      ORDER BY count DESC
    `);
    
    console.log('📈 Domain Status:');
    statusResult.rows.forEach(row => {
      console.log(`   ${row.status}: ${row.count} domains`);
    });
    
    // Check recent responses
    console.log('\n📝 Checking recent responses...');
    const responseResult = await pool.query(`
      SELECT COUNT(*) as total_responses,
             COUNT(DISTINCT domain_id) as unique_domains,
             MAX(created_at) as latest_response
      FROM domain_responses
    `);
    
    if (responseResult.rows[0]) {
      const stats = responseResult.rows[0];
      console.log(`   Total responses: ${stats.total_responses}`);
      console.log(`   Unique domains: ${stats.unique_domains}`);
      console.log(`   Latest response: ${stats.latest_response}`);
    }
    
    // Test sophisticated-runner API keys
    console.log('\n🔑 Testing sophisticated-runner API keys...');
    const apiKeyResponse = await makeHttpRequest(`${SOPHISTICATED_RUNNER_URL}/api-keys`);
    const apiKeys = JSON.parse(apiKeyResponse);
    
    console.log('🔧 API Key Status:');
    Object.entries(apiKeys.keys).forEach(([provider, available]) => {
      console.log(`   ${provider}: ${available ? '✅' : '❌'}`);
    });
    console.log(`   Working keys: ${apiKeys.workingKeys}/8`);
    
    await pool.end();
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    await pool.end();
  }
}

function makeHttpRequest(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(data));
    }).on('error', reject);
  });
}

// Show current cost tiers from sophisticated-runner
function showCurrentCostTiers() {
  console.log('\n💰 CURRENT COST TIERS IN SOPHISTICATED-RUNNER:');
  console.log('===============================================');
  
  console.log('🟢 FAST TIER (Cheapest - ~$0.0002-0.0008/call):');
  console.log('   • DeepSeek Chat');
  console.log('   • Together AI (Llama-3-8b)');
  console.log('   • XAI (Grok-beta)');
  console.log('   • Perplexity (Sonar-small)');
  
  console.log('\n🟡 MEDIUM TIER (Budget - ~$0.0008-0.003/call):');
  console.log('   • OpenAI (GPT-4o-mini)');
  console.log('   • Mistral (Small)');
  
  console.log('\n🔴 SLOW TIER (Premium - ~$0.001-0.025/call):');
  console.log('   • Anthropic (Claude Haiku)');
  console.log('   • Google (Gemini Flash)');
  
  console.log('\n📊 CURRENT PROCESSING LOGIC:');
  console.log('   • ALL 8 models run together for every domain');
  console.log('   • No cost differentiation');
  console.log('   • Manual triggering only');
  console.log('   • Estimated cost: ~$0.05 per domain (all models)');
}

function showProposedScheduling() {
  console.log('\n🚀 PROPOSED AUTOMATED SCHEDULING:');
  console.log('=================================');
  
  console.log('📅 SCHEDULE:');
  console.log('   Daily (6 AM):     Fast models only (~$0.02/day)');
  console.log('   Weekly (Mon 10 AM): Fast + Medium models (~$1.00/week)');
  console.log('   Bi-weekly (Mon 2 PM): All models (~$4.00/2weeks)');
  console.log('   Monthly (1st Sun): Full crawl all domains (~$50.00/month)');
  
  console.log('\n💡 BENEFITS:');
  console.log('   • 75% cost reduction vs current all-models approach');
  console.log('   • Automated scheduling - no manual intervention');
  console.log('   • Smart domain prioritization');
  console.log('   • Budget controls and monitoring');
  console.log('   • Manual overrides still available');
}

// CLI Interface
if (require.main === module) {
  const args = process.argv.slice(2);
  
  if (args[0] === 'test') {
    testCurrentLogic();
  } else if (args[0] === 'tiers') {
    showCurrentCostTiers();
  } else if (args[0] === 'proposed') {
    showProposedScheduling();
  } else {
    console.log('🚀 Simple Scheduler Test');
    console.log('Usage:');
    console.log('  node simple_scheduler_test.js test      # Test current system');
    console.log('  node simple_scheduler_test.js tiers     # Show current cost tiers');
    console.log('  node simple_scheduler_test.js proposed  # Show proposed scheduling');
    console.log('');
    console.log('This tests your current system and shows the scheduling proposal.');
  }
} 