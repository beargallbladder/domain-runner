#!/usr/bin/env node

/**
 * COMPREHENSIVE END-TO-END INTEGRATION TESTER
 * Tests all services working together as a complete system
 */

const https = require('https');
const http = require('http');

// Service endpoints
const SERVICES = {
  'sophisticated-runner': 'https://sophisticated-runner.onrender.com',
  'public-api': 'https://llmrank.io',
  'memory-oracle': 'https://memory-oracle.onrender.com',
  'monitoring-dashboard': 'https://monitoring-dashboard.onrender.com',
  'weekly-scheduler': 'https://weekly-scheduler.onrender.com',
  'embedding-engine': 'https://embedding-engine.onrender.com',
  'domain-processor-v2': 'https://domain-processor-v2.onrender.com',
  'cohort-intelligence': 'https://cohort-intelligence.onrender.com',
  'industry-intelligence': 'https://industry-intelligence.onrender.com',
  'news-correlation': 'https://news-correlation-service.onrender.com',
  'swarm-intelligence': 'https://swarm-intelligence.onrender.com',
  'visceral-intelligence': 'https://visceral-intelligence.onrender.com',
  'reality-validator': 'https://reality-validator.onrender.com',
  'predictive-analytics': 'https://predictive-analytics.onrender.com',
  'database-manager': 'https://database-manager.onrender.com',
  'seo-metrics-runner': 'https://seo-metrics-runner.onrender.com'
};

// Utility function to make HTTP requests
function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const requestModule = url.startsWith('https:') ? https : http;
    
    const req = requestModule.request(url, {
      timeout: 15000,
      ...options
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const jsonData = data ? JSON.parse(data) : {};
          resolve({
            status: res.statusCode,
            headers: res.headers,
            data: jsonData,
            rawData: data
          });
        } catch (e) {
          resolve({
            status: res.statusCode,
            headers: res.headers,
            data: null,
            rawData: data
          });
        }
      });
    });
    
    req.on('error', reject);
    req.on('timeout', () => reject(new Error('Request timeout')));
    req.end();
  });
}

// Test results storage
const testResults = {
  services: {},
  integration: {},
  workflow: {},
  timestamp: new Date().toISOString()
};

// 1. Test Service Health and Connectivity
async function testServiceHealth() {
  console.log('\n🔍 PHASE 1: Testing Service Health and Connectivity');
  console.log('='.repeat(60));
  
  const healthChecks = [
    { service: 'sophisticated-runner', endpoint: '/health' },
    { service: 'public-api', endpoint: '/health' },
    { service: 'memory-oracle', endpoint: '/health' },
    { service: 'embedding-engine', endpoint: '/health' },
    { service: 'monitoring-dashboard', endpoint: '/health' },
    { service: 'weekly-scheduler', endpoint: '/health' },
    { service: 'domain-processor-v2', endpoint: '/api/v2/health' },
    { service: 'cohort-intelligence', endpoint: '/health' },
    { service: 'industry-intelligence', endpoint: '/health' },
    { service: 'news-correlation', endpoint: '/health' },
    { service: 'swarm-intelligence', endpoint: '/health' },
    { service: 'visceral-intelligence', endpoint: '/health' },
    { service: 'reality-validator', endpoint: '/health' },
    { service: 'predictive-analytics', endpoint: '/health' },
    { service: 'database-manager', endpoint: '/health' },
    { service: 'seo-metrics-runner', endpoint: '/health' }
  ];
  
  for (const check of healthChecks) {
    try {
      console.log(`Testing ${check.service}...`);
      const response = await makeRequest(`${SERVICES[check.service]}${check.endpoint}`);
      
      testResults.services[check.service] = {
        status: response.status,
        healthy: response.status === 200 && (
          !response.data || 
          response.data.status === 'healthy' || 
          response.data.status === 'operational'
        ),
        data: response.data,
        endpoint: check.endpoint,
        url: `${SERVICES[check.service]}${check.endpoint}`
      };
      
      const status = testResults.services[check.service].healthy ? '✅' : '❌';
      console.log(`  ${status} ${check.service}: ${response.status} - ${response.data?.status || 'unknown'}`);
      
    } catch (error) {
      testResults.services[check.service] = {
        status: 'error',
        healthy: false,
        error: error.message,
        endpoint: check.endpoint,
        url: `${SERVICES[check.service]}${check.endpoint}`
      };
      console.log(`  ❌ ${check.service}: ERROR - ${error.message}`);
    }
  }
}

// 2. Test Inter-Service Communication and API Endpoints
async function testInterServiceCommunication() {
  console.log('\n🔗 PHASE 2: Testing Inter-Service Communication');
  console.log('='.repeat(60));
  
  const apiTests = [
    {
      name: 'Public API Root',
      service: 'public-api',
      endpoint: '/',
      expectedStatus: 200
    },
    {
      name: 'Public API Domains List',
      service: 'public-api',
      endpoint: '/api/domains',
      expectedStatus: 200
    },
    {
      name: 'Public API Stats',
      service: 'public-api',
      endpoint: '/api/stats',
      expectedStatus: 200
    },
    {
      name: 'Sophisticated Runner Pending Count',
      service: 'sophisticated-runner',
      endpoint: '/api/pending-count',
      expectedStatus: 200
    },
    {
      name: 'Sophisticated Runner Processing Stats',
      service: 'sophisticated-runner',
      endpoint: '/api/processing-stats',
      expectedStatus: 200
    },
    {
      name: 'Sophisticated Runner Provider Usage',
      service: 'sophisticated-runner',
      endpoint: '/provider-usage',
      expectedStatus: 200
    },
    {
      name: 'Swarm Metrics',
      service: 'sophisticated-runner',
      endpoint: '/swarm/metrics',
      expectedStatus: 200
    },
    {
      name: 'Embedding Engine Random Domains',
      service: 'embedding-engine',
      endpoint: '/api/cache/random?limit=3',
      expectedStatus: 200
    }
  ];
  
  for (const test of apiTests) {
    try {
      console.log(`Testing ${test.name}...`);
      const response = await makeRequest(`${SERVICES[test.service]}${test.endpoint}`);
      
      const success = response.status === test.expectedStatus;
      testResults.integration[test.name] = {
        success,
        status: response.status,
        expectedStatus: test.expectedStatus,
        data: response.data,
        service: test.service,
        endpoint: test.endpoint
      };
      
      const status = success ? '✅' : '❌';
      console.log(`  ${status} ${test.name}: ${response.status} (expected ${test.expectedStatus})`);
      
      if (response.data && typeof response.data === 'object') {
        console.log(`    Data keys: ${Object.keys(response.data).join(', ')}`);
      }
      
    } catch (error) {
      testResults.integration[test.name] = {
        success: false,
        error: error.message,
        service: test.service,
        endpoint: test.endpoint
      };
      console.log(`  ❌ ${test.name}: ERROR - ${error.message}`);
    }
  }
}

// 3. Test Domain Processing Workflow
async function testDomainProcessingWorkflow() {
  console.log('\n⚙️  PHASE 3: Testing Domain Processing Workflow');
  console.log('='.repeat(60));
  
  try {
    // Check pending domains
    console.log('Checking pending domains...');
    const pendingResponse = await makeRequest(`${SERVICES['sophisticated-runner']}/api/pending-count`);
    
    if (pendingResponse.status === 200 && pendingResponse.data) {
      console.log(`  ✅ Found ${pendingResponse.data.pending || 0} pending domains`);
      testResults.workflow.pendingCheck = {
        success: true,
        pendingCount: pendingResponse.data.pending || 0
      };
    } else {
      throw new Error('Failed to get pending count');
    }
    
    // Test small batch processing (if there are pending domains)
    if (pendingResponse.data.pending > 0) {
      console.log('Testing small batch processing...');
      const processResponse = await makeRequest(`${SERVICES['sophisticated-runner']}/api/process-domains`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Worker-Index': 'integration-test'
        }
      });
      
      if (processResponse.status === 200) {
        console.log(`  ✅ Batch processing initiated: ${JSON.stringify(processResponse.data)}`);
        testResults.workflow.batchProcessing = {
          success: true,
          response: processResponse.data
        };
      } else {
        throw new Error(`Batch processing failed: ${processResponse.status}`);
      }
    } else {
      console.log('  ⚠️  No pending domains to process');
      testResults.workflow.batchProcessing = {
        success: true,
        message: 'No pending domains'
      };
    }
    
  } catch (error) {
    console.log(`  ❌ Domain Processing Workflow: ${error.message}`);
    testResults.workflow.error = error.message;
  }
}

// 4. Test Volatility Scoring System
async function testVolatilityScoring() {
  console.log('\n📊 PHASE 4: Testing Volatility Scoring System');
  console.log('='.repeat(60));
  
  try {
    // Test swarm metrics
    console.log('Testing swarm volatility metrics...');
    const metricsResponse = await makeRequest(`${SERVICES['sophisticated-runner']}/swarm/metrics`);
    
    if (metricsResponse.status === 200) {
      console.log(`  ✅ Swarm metrics available: ${JSON.stringify(metricsResponse.data)}`);
      testResults.workflow.volatilityMetrics = {
        success: true,
        data: metricsResponse.data
      };
    } else {
      throw new Error(`Swarm metrics failed: ${metricsResponse.status}`);
    }
    
    // Test opportunities endpoint
    console.log('Testing high opportunity domains...');
    const opportunitiesResponse = await makeRequest(`${SERVICES['sophisticated-runner']}/swarm/opportunities?limit=5`);
    
    if (opportunitiesResponse.status === 200) {
      console.log(`  ✅ Opportunities endpoint working: ${JSON.stringify(opportunitiesResponse.data)}`);
      testResults.workflow.opportunities = {
        success: true,
        data: opportunitiesResponse.data
      };
    } else {
      throw new Error(`Opportunities failed: ${opportunitiesResponse.status}`);
    }
    
  } catch (error) {
    console.log(`  ❌ Volatility Scoring: ${error.message}`);
    testResults.workflow.volatilityError = error.message;
  }
}

// 5. Test Public API Data Serving
async function testPublicAPIServing() {
  console.log('\n🌐 PHASE 5: Testing Public API Data Serving');
  console.log('='.repeat(60));
  
  const endpoints = [
    { name: 'Root Info', path: '/' },
    { name: 'API Stats', path: '/api/stats' },
    { name: 'Domain Rankings', path: '/api/rankings' },
    { name: 'Categories', path: '/api/categories' },
    { name: 'Usage Info', path: '/api/usage' }
  ];
  
  for (const endpoint of endpoints) {
    try {
      console.log(`Testing ${endpoint.name}...`);
      const response = await makeRequest(`${SERVICES['public-api']}${endpoint.path}`);
      
      const success = response.status === 200;
      testResults.workflow[`publicAPI_${endpoint.name.replace(/\s+/g, '')}`] = {
        success,
        status: response.status,
        hasData: !!response.data,
        dataKeys: response.data ? Object.keys(response.data) : []
      };
      
      const status = success ? '✅' : '❌';
      console.log(`  ${status} ${endpoint.name}: ${response.status}`);
      
      if (response.data && typeof response.data === 'object') {
        console.log(`    Available data: ${Object.keys(response.data).slice(0, 5).join(', ')}`);
      }
      
    } catch (error) {
      testResults.workflow[`publicAPI_${endpoint.name.replace(/\s+/g, '')}`] = {
        success: false,
        error: error.message
      };
      console.log(`  ❌ ${endpoint.name}: ERROR - ${error.message}`);
    }
  }
}

// 6. Generate Comprehensive Report
async function generateReport() {
  console.log('\n📋 INTEGRATION TEST RESULTS SUMMARY');
  console.log('='.repeat(60));
  
  // Service Health Summary
  const healthyServices = Object.values(testResults.services).filter(s => s.healthy).length;
  const totalServices = Object.keys(testResults.services).length;
  console.log(`\n🏥 SERVICE HEALTH: ${healthyServices}/${totalServices} services healthy`);
  
  Object.entries(testResults.services).forEach(([name, result]) => {
    const status = result.healthy ? '✅' : '❌';
    console.log(`  ${status} ${name}: ${result.status} - ${result.data?.status || result.error || 'unknown'}`);
  });
  
  // Integration Tests Summary
  const successfulIntegration = Object.values(testResults.integration).filter(t => t.success).length;
  const totalIntegration = Object.keys(testResults.integration).length;
  console.log(`\n🔗 INTEGRATION TESTS: ${successfulIntegration}/${totalIntegration} tests passed`);
  
  Object.entries(testResults.integration).forEach(([name, result]) => {
    const status = result.success ? '✅' : '❌';
    console.log(`  ${status} ${name}: ${result.status || 'ERROR'}`);
  });
  
  // Workflow Tests Summary
  console.log(`\n⚙️  WORKFLOW TESTS:`);
  Object.entries(testResults.workflow).forEach(([name, result]) => {
    if (typeof result === 'object' && result.success !== undefined) {
      const status = result.success ? '✅' : '❌';
      console.log(`  ${status} ${name}: ${result.message || 'OK'}`);
    }
  });
  
  // Overall System Status
  const overallHealth = (healthyServices / totalServices) * 100;
  const overallIntegration = (successfulIntegration / totalIntegration) * 100;
  
  console.log(`\n🎯 OVERALL SYSTEM STATUS:`);
  console.log(`  Service Health: ${overallHealth.toFixed(1)}%`);
  console.log(`  Integration Success: ${overallIntegration.toFixed(1)}%`);
  
  if (overallHealth >= 80 && overallIntegration >= 70) {
    console.log(`  🎉 SYSTEM STATUS: OPERATIONAL - Ready for production workloads`);  
  } else if (overallHealth >= 60 && overallIntegration >= 50) {
    console.log(`  ⚠️  SYSTEM STATUS: DEGRADED - Some components need attention`);
  } else {
    console.log(`  🚨 SYSTEM STATUS: CRITICAL - Major integration issues detected`);
  }
  
  // Critical Issues
  console.log(`\n🚨 CRITICAL ISSUES TO ADDRESS:`);
  const criticalIssues = [];
  
  // Check for core service failures
  const coreServices = ['sophisticated-runner', 'public-api', 'embedding-engine'];
  coreServices.forEach(service => {
    if (!testResults.services[service]?.healthy) {
      criticalIssues.push(`❌ ${service} is not healthy - core functionality impacted`);
    }
  });
  
  // Check for workflow failures
  if (testResults.workflow.error) {
    criticalIssues.push(`❌ Domain processing workflow failed: ${testResults.workflow.error}`);
  }
  
  if (criticalIssues.length === 0) {
    console.log(`  ✅ No critical issues detected`);
  } else {
    criticalIssues.forEach(issue => console.log(`  ${issue}`));
  }
  
  // Recommendations
  console.log(`\n💡 RECOMMENDATIONS:`);
  console.log(`  1. Focus on fixing critical service health issues first`);
  console.log(`  2. Verify database connections and API keys are properly configured`);
  console.log(`  3. Check service logs for specific error details`);
  console.log(`  4. Run individual service tests to isolate problems`);
  console.log(`  5. Monitor service startup times and resource usage`);
  
  return testResults;
}

// Main test runner
async function runIntegrationTests() {
  console.log('🚀 STARTING COMPREHENSIVE END-TO-END INTEGRATION TESTS');
  console.log('Testing all services working together as a complete system');
  console.log('='.repeat(80));
  
  try {
    await testServiceHealth();
    await testInterServiceCommunication();
    await testDomainProcessingWorkflow();
    await testVolatilityScoring();
    await testPublicAPIServing();
    
    const results = await generateReport();
    
    // Save results to file
    const fs = require('fs');
    const reportPath = `/tmp/integration-test-results-${Date.now()}.json`;
    fs.writeFileSync(reportPath, JSON.stringify(results, null, 2));
    console.log(`\n📁 Full test results saved to: ${reportPath}`);
    
    return results;
    
  } catch (error) {
    console.error('❌ Integration test suite failed:', error);
    process.exit(1);
  }
}

// Run the tests
if (require.main === module) {
  runIntegrationTests()
    .then(results => {
      console.log('\n✅ Integration test suite completed');
      process.exit(0);
    })
    .catch(error => {
      console.error('❌ Integration test suite failed:', error);
      process.exit(1);
    });
}

module.exports = { runIntegrationTests, testResults };