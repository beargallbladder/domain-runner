#!/usr/bin/env node

/**
 * 🧪 DEPLOYMENT VERIFICATION SCRIPT
 * Tests all endpoints and verifies the service is working correctly
 */

const axios = require('axios');

const SERVICE_URL = process.argv[2] || 'http://localhost:10000';

async function testEndpoint(name, url, method = 'GET', data = null) {
  try {
    console.log(`🧪 Testing ${name}...`);
    
    const config = {
      method,
      url: `${SERVICE_URL}${url}`,
      timeout: 10000
    };
    
    if (data) {
      config.data = data;
      config.headers = { 'Content-Type': 'application/json' };
    }
    
    const response = await axios(config);
    console.log(`✅ ${name}: OK`);
    console.log(`   Status: ${response.status}`);
    
    if (response.data) {
      if (typeof response.data === 'object') {
        console.log(`   Data: ${JSON.stringify(response.data, null, 2).substring(0, 200)}...`);
      } else {
        console.log(`   Data: ${response.data.substring(0, 100)}...`);
      }
    }
    
    return { success: true, data: response.data };
    
  } catch (error) {
    console.log(`❌ ${name}: FAILED`);
    console.log(`   Error: ${error.message}`);
    if (error.response) {
      console.log(`   Status: ${error.response.status}`);
      console.log(`   Response: ${JSON.stringify(error.response.data)}`);
    }
    return { success: false, error: error.message };
  }
}

async function runTests() {
  console.log('🚀 DEPLOYMENT VERIFICATION STARTING');
  console.log(`🔗 Service URL: ${SERVICE_URL}`);
  console.log('='.repeat(50));
  
  const results = [];
  
  // Test 1: Health Check
  const health = await testEndpoint('Health Check', '/health');
  results.push({ name: 'Health Check', ...health });
  
  if (health.success) {
    const healthData = health.data;
    console.log(`📊 Database Connected: ${healthData.database_connected}`);
    console.log(`📊 Providers Configured: ${healthData.providers_configured}`);
    console.log(`📊 Providers: ${healthData.providers?.join(', ') || 'None'}`);
  }
  
  // Test 2: Stats
  const stats = await testEndpoint('Stats', '/stats');
  results.push({ name: 'Stats', ...stats });
  
  if (stats.success) {
    const statsData = stats.data;
    console.log(`📊 Total Requests: ${statsData.total_requests}`);
    console.log(`📊 Providers: ${Object.keys(statsData.responses_by_provider || {}).length}`);
  }
  
  // Test 3: Test Domain (only if health check passed)
  if (health.success && health.data.providers_configured > 0) {
    console.log('🧪 Testing single domain processing...');
    const testDomain = await testEndpoint(
      'Test Domain', 
      '/test-domain', 
      'POST', 
      { domain: 'example.com' }
    );
    results.push({ name: 'Test Domain', ...testDomain });
  } else {
    console.log('⏭️ Skipping domain test (no providers configured)');
  }
  
  // Summary
  console.log('\n' + '='.repeat(50));
  console.log('📋 TEST SUMMARY');
  console.log('='.repeat(50));
  
  const passed = results.filter(r => r.success).length;
  const total = results.length;
  
  results.forEach(result => {
    const status = result.success ? '✅' : '❌';
    console.log(`${status} ${result.name}`);
  });
  
  console.log(`\n📊 Results: ${passed}/${total} tests passed`);
  
  if (passed === total) {
    console.log('🎉 ALL TESTS PASSED! Deployment is successful.');
    process.exit(0);
  } else {
    console.log('💥 SOME TESTS FAILED! Check the issues above.');
    process.exit(1);
  }
}

// Handle errors
process.on('unhandledRejection', (error) => {
  console.error('💥 Unhandled error:', error);
  process.exit(1);
});

// Run the tests
runTests(); 