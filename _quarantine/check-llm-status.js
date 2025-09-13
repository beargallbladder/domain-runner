#!/usr/bin/env node

// Check which LLMs are working via API
const axios = require('axios');

async function checkLLMStatus() {
  console.log('🔬 Checking LLM Status...\n');
  
  try {
    const response = await axios.get('https://www.llmrank.io/api/llm-status', {
      headers: { 'x-api-key': 'internal-crawl-2025' },
      timeout: 120000 // 2 minutes for all tests
    });
    
    const data = response.data;
    
    console.log('=' .repeat(60));
    console.log('📊 LLM STATUS REPORT');
    console.log('=' .repeat(60));
    console.log(`Timestamp: ${data.timestamp}`);
    console.log(`Environment: ${data.environment}`);
    console.log('\n📈 SUMMARY:');
    console.log(`  Total Providers: ${data.summary.total_providers}`);
    console.log(`  ✅ Working: ${data.summary.working}`);
    console.log(`  ❌ Failed: ${data.summary.failed}`);
    console.log(`  🔑 Missing Keys: ${data.summary.missing_keys}`);
    console.log(`  Success Rate: ${data.summary.success_rate}`);
    
    if (data.working_providers.length > 0) {
      console.log('\n✅ WORKING PROVIDERS:');
      data.working_providers.forEach(p => {
        console.log(`  • ${p.name} (${p.response_time_ms}ms)`);
      });
    }
    
    if (data.failed_providers.length > 0) {
      console.log('\n❌ FAILED PROVIDERS:');
      data.failed_providers.forEach(p => {
        console.log(`  • ${p.name}: ${p.error.substring(0, 50)}...`);
      });
    }
    
    if (data.missing_api_keys.length > 0) {
      console.log('\n🔑 MISSING API KEYS:');
      data.missing_api_keys.forEach(name => {
        console.log(`  • ${name}`);
      });
    }
    
    console.log('\n' + '=' .repeat(60));
    
    if (data.summary.working === 0) {
      console.log('⚠️  WARNING: NO LLMS ARE WORKING!');
      console.log('Check API keys on Render environment variables.');
    } else {
      console.log(`✅ ${data.summary.working} LLMs are operational and ready to use!`);
    }
    
  } catch (error) {
    if (error.code === 'ECONNREFUSED') {
      console.log('❌ Cannot connect to API. Deployment may still be in progress.');
      console.log('Wait 2-3 minutes and try again.');
    } else if (error.response?.status === 404) {
      console.log('❌ LLM status endpoint not found. Deployment may be pending.');
    } else {
      console.log('❌ Error:', error.response?.data || error.message);
    }
  }
}

checkLLMStatus();