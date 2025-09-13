#!/usr/bin/env node

// COMPREHENSIVE LLM SUMMARY - Shows EXACTLY which LLMs work
const axios = require('axios');

async function getStatus() {
  console.log('\n🔬 COMPREHENSIVE LLM STATUS CHECK');
  console.log('=' .repeat(60));
  console.log('Checking all 13 LLM providers that have worked before...\n');
  
  // Wait for deployment
  console.log('⏳ Waiting for Render deployment to complete...');
  await new Promise(r => setTimeout(r, 90000)); // 90 seconds
  
  try {
    // Check LLM status
    console.log('\n📊 Checking LLM status endpoint...');
    const response = await axios.get('https://www.llmrank.io/api/llm-status', {
      headers: { 'x-api-key': 'internal-crawl-2025' },
      timeout: 120000
    });
    
    const data = response.data;
    
    console.log('\n✅ SUCCESS! Here are the results:\n');
    console.log('=' .repeat(60));
    console.log('📈 SUMMARY:');
    console.log(`  Total Providers Tested: ${data.summary.total_providers}`);
    console.log(`  ✅ Working: ${data.summary.working}`);
    console.log(`  ❌ Failed: ${data.summary.failed}`);
    console.log(`  🔑 Missing Keys: ${data.summary.missing_keys}`);
    console.log(`  Success Rate: ${data.summary.success_rate}`);
    
    if (data.working_providers.length > 0) {
      console.log('\n✅ WORKING LLMs (Ready to use!):');
      data.working_providers.forEach(p => {
        console.log(`  ✓ ${p.name} - Response time: ${p.response_time_ms}ms`);
      });
    }
    
    if (data.failed_providers.length > 0) {
      console.log('\n❌ FAILED LLMs (Need fixing):');
      data.failed_providers.forEach(p => {
        console.log(`  ✗ ${p.name}`);
        console.log(`    Error: ${p.error.substring(0, 60)}...`);
      });
    }
    
    if (data.missing_api_keys.length > 0) {
      console.log('\n🔑 MISSING API KEYS (Add these on Render):');
      data.missing_api_keys.forEach(name => {
        const envVar = name.split('/')[0].toUpperCase() + '_API_KEY';
        console.log(`  • ${name} - Needs: ${envVar}`);
      });
    }
    
    // Check crawl status too
    console.log('\n📊 CRAWL STATUS:');
    const crawlStatus = await axios.get('https://www.llmrank.io/api/crawl-status', {
      headers: { 'x-api-key': 'internal-crawl-2025' }
    });
    
    const cs = crawlStatus.data;
    console.log(`  Crawler Running: ${cs.is_running ? 'YES' : 'NO'}`);
    console.log(`  Pending Domains: ${cs.domain_stats.pending}`);
    console.log(`  Completed Domains: ${cs.domain_stats.completed}`);
    
    console.log('\n' + '=' .repeat(60));
    console.log('🎯 NEXT STEPS:');
    
    if (data.summary.working === 0) {
      console.log('1. Add API keys on Render for the providers listed above');
      console.log('2. Re-run this script to verify they work');
      console.log('3. Start the crawler with: node crawl-control.js start');
    } else if (!cs.is_running && cs.domain_stats.pending > 0) {
      console.log(`✅ ${data.summary.working} LLMs are working!`);
      console.log(`📦 ${cs.domain_stats.pending} domains are waiting to be processed`);
      console.log('\n🚀 Start the crawler now with:');
      console.log('   node crawl-control.js start');
    } else if (cs.is_running) {
      console.log(`✅ Crawler is running with ${data.summary.working} LLMs`);
      console.log('Check progress with: node crawl-control.js status');
    } else {
      console.log('✅ All systems operational!');
      console.log(`${data.summary.working} LLMs working, ${cs.domain_stats.completed} domains processed`);
    }
    
  } catch (error) {
    console.log('\n❌ ERROR:', error.response?.data || error.message);
    
    if (error.response?.data?.error?.includes('pool')) {
      console.log('\n⚠️  Database pool error detected. Deployment may still be in progress.');
      console.log('Wait 2 minutes and try again.');
    }
  }
  
  console.log('\n' + '=' .repeat(60));
  console.log('Report generated at:', new Date().toISOString());
}

getStatus();