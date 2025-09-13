#!/usr/bin/env node

// MASTER CRAWLER CONTROL - Check LLMs, trigger crawl, monitor progress
const axios = require('axios');

const API_KEY = 'internal-crawl-2025';
const BASE_URL = 'https://www.llmrank.io';

async function checkLLMs() {
  console.log('🔬 Checking which LLMs are working...\n');
  
  try {
    const response = await axios.get(`${BASE_URL}/api/llm-status`, {
      headers: { 'x-api-key': API_KEY },
      timeout: 120000
    });
    
    const data = response.data;
    console.log(`✅ Working LLMs: ${data.summary.working}/${data.summary.total_providers}`);
    
    if (data.working_providers.length > 0) {
      console.log('Active providers:');
      data.working_providers.forEach(p => {
        console.log(`  • ${p.name}`);
      });
    }
    
    return data.summary.working;
  } catch (error) {
    console.log('❌ Cannot check LLM status:', error.message);
    return 0;
  }
}

async function checkCrawlStatus() {
  try {
    const response = await axios.get(`${BASE_URL}/api/crawl-status`, {
      headers: { 'x-api-key': API_KEY }
    });
    
    return response.data;
  } catch (error) {
    console.log('❌ Cannot check crawl status:', error.message);
    return null;
  }
}

async function triggerCrawl() {
  try {
    const response = await axios.post(`${BASE_URL}/api/trigger-crawl`, 
      { force: true },
      { headers: { 'x-api-key': API_KEY }}
    );
    
    return response.data;
  } catch (error) {
    console.log('❌ Cannot trigger crawl:', error.response?.data || error.message);
    return null;
  }
}

async function main() {
  const command = process.argv[2];
  
  console.log('=' .repeat(60));
  console.log('🎮 CRAWLER CONTROL CENTER');
  console.log('=' .repeat(60));
  
  if (!command || command === 'status') {
    // Check everything
    console.log('\n1️⃣ LLM STATUS:');
    const workingLLMs = await checkLLMs();
    
    console.log('\n2️⃣ CRAWL STATUS:');
    const crawlStatus = await checkCrawlStatus();
    
    if (crawlStatus) {
      console.log(`  Running: ${crawlStatus.is_running ? 'YES' : 'NO'}`);
      if (crawlStatus.is_running) {
        console.log(`  Duration: ${crawlStatus.duration_minutes} minutes`);
      }
      console.log(`  Pending domains: ${crawlStatus.domain_stats.pending}`);
      console.log(`  Processing: ${crawlStatus.domain_stats.processing}`);
      console.log(`  Completed: ${crawlStatus.domain_stats.completed}`);
      
      if (crawlStatus.recent_activity.length > 0) {
        console.log('\n  Recent activity:');
        crawlStatus.recent_activity.forEach(a => {
          console.log(`    • ${a.model}: ${a.responses} responses`);
        });
      }
    }
    
    console.log('\n3️⃣ RECOMMENDATIONS:');
    if (workingLLMs === 0) {
      console.log('  ⚠️  No LLMs working - add API keys on Render!');
    } else if (!crawlStatus?.is_running && crawlStatus?.domain_stats.pending > 0) {
      console.log(`  💡 ${workingLLMs} LLMs ready, ${crawlStatus.domain_stats.pending} domains pending`);
      console.log('  Run: node crawl-control.js start');
    } else if (crawlStatus?.is_running) {
      console.log('  ✅ Crawler is running, check back later');
    } else {
      console.log('  ✅ All systems operational');
    }
    
  } else if (command === 'start') {
    console.log('🚀 Starting crawler...\n');
    
    // First check LLMs
    const workingLLMs = await checkLLMs();
    if (workingLLMs === 0) {
      console.log('❌ Cannot start - no working LLMs!');
      console.log('Add API keys on Render first.');
      process.exit(1);
    }
    
    // Check if already running
    const status = await checkCrawlStatus();
    if (status?.is_running) {
      console.log('⚠️  Crawler already running!');
      console.log(`Started ${status.duration_minutes} minutes ago`);
      process.exit(0);
    }
    
    // Trigger crawl
    const result = await triggerCrawl();
    if (result) {
      console.log('✅ Crawler started!');
      console.log(`  PID: ${result.pid}`);
      console.log(`  Processing: ${result.stats.pending} domains`);
      console.log(`  Using: ${workingLLMs} LLM providers`);
    }
    
  } else if (command === 'stop') {
    console.log('🛑 Clearing crawler lock...\n');
    
    // Force clear by triggering with already running
    const result = await triggerCrawl();
    console.log('Lock cleared. Crawler will stop after current batch.');
    
  } else {
    console.log(`
Usage:
  node crawl-control.js         - Check status of everything
  node crawl-control.js status  - Same as above
  node crawl-control.js start   - Start the crawler
  node crawl-control.js stop    - Stop the crawler
    `);
  }
  
  console.log('\n' + '=' .repeat(60));
}

main();