#!/usr/bin/env node

/**
 * QUICK SERVICE VALIDATION TEST
 * Tests what services are actually running and responding
 */

const https = require('https');

function makeRequest(url) {
  return new Promise((resolve, reject) => {
    https.get(url, {timeout: 10000}, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const jsonData = data ? JSON.parse(data) : {};
          resolve({status: res.statusCode, data: jsonData, raw: data});
        } catch (e) {
          resolve({status: res.statusCode, data: null, raw: data});
        }
      });
    }).on('error', reject).on('timeout', () => reject(new Error('Timeout')));
  });
}

async function testServices() {
  console.log('🔍 QUICK SERVICE VALIDATION');
  console.log('='.repeat(50));
  
  const tests = [
    {name: 'Sophisticated Runner Health', url: 'https://sophisticated-runner.onrender.com/health'},
    {name: 'Sophisticated Runner Root', url: 'https://sophisticated-runner.onrender.com/'},
    {name: 'Sophisticated Runner Pending', url: 'https://sophisticated-runner.onrender.com/api/pending-count'},
    {name: 'Public API Health', url: 'https://llmrank.io/health'},
    {name: 'Public API Root', url: 'https://llmrank.io/'},
    {name: 'Public API Stats', url: 'https://llmrank.io/api/stats'},
    {name: 'Embedding Engine Health', url: 'https://embedding-engine.onrender.com/health'},
    {name: 'Memory Oracle Health (Expected 404)', url: 'https://memory-oracle.onrender.com/health'}
  ];
  
  for (const test of tests) {
    try {
      console.log(`\nTesting: ${test.name}`);
      const result = await makeRequest(test.url);
      console.log(`  Status: ${result.status}`);
      
      if (result.data && typeof result.data === 'object') {
        console.log(`  Response: ${JSON.stringify(result.data).substring(0, 200)}...`);
      } else if (result.raw) {
        console.log(`  Raw: ${result.raw.substring(0, 100)}...`);
      }
      
    } catch (error) {
      console.log(`  ERROR: ${error.message}`);
    }
  }
  
  console.log('\n🎯 DIAGNOSIS:');
  console.log('1. Check if services are actually deploying the correct code');
  console.log('2. Verify environment variables are set in Render dashboard');
  console.log('3. Check service logs in Render for startup errors');
  console.log('4. Confirm buildCommand and startCommand in render.yaml');
}

testServices().catch(console.error);