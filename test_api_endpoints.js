const https = require('https');
const http = require('http');

// Configuration
const endpoints = {
  // Public API endpoints at llmrank.io
  publicApi: {
    baseUrl: 'https://llmrank.io',
    endpoints: [
      { method: 'GET', path: '/', description: 'API status' },
      { method: 'GET', path: '/health', description: 'Health check' },
      { method: 'GET', path: '/api/domains', description: 'List domains' },
      { method: 'GET', path: '/api/domains/google.com/public', description: 'Domain intelligence' },
      { method: 'GET', path: '/api/rankings', description: 'Domain rankings' },
      { method: 'GET', path: '/api/categories', description: 'Domain categories' },
      { method: 'GET', path: '/api/shadows', description: 'Domains with low memory' },
      { method: 'GET', path: '/api/stats', description: 'Platform statistics' },
      { method: 'GET', path: '/api/fire-alarm-dashboard', description: 'Risk monitoring dashboard' },
      { method: 'GET', path: '/api/volatility/rankings', description: 'Volatility rankings' },
      { method: 'GET', path: '/api/tensors/google.com', description: 'Tensor data', requiresAuth: true },
      { method: 'GET', path: '/api/drift/google.com', description: 'Drift analysis', requiresAuth: true },
      { method: 'GET', path: '/api/consensus/google.com', description: 'Model consensus', requiresAuth: true },
      { method: 'GET', path: '/api/usage', description: 'API usage stats', requiresAuth: true }
    ]
  },
  
  // Sophisticated Runner endpoints
  sophisticatedRunner: {
    baseUrl: 'https://sophisticated-runner.onrender.com',
    endpoints: [
      { method: 'GET', path: '/health', description: 'Health check with metrics' },
      { method: 'GET', path: '/api-keys', description: 'API key status', requiresAuth: true },
      { method: 'POST', path: '/process-pending-domains', description: 'Process pending domains', requiresAuth: true },
      { method: 'GET', path: '/volatility/scores', description: 'Volatility scores' },
      { method: 'GET', path: '/volatility/tiered-rankings', description: 'Tiered volatility rankings' },
      { method: 'GET', path: '/volatility/category-analysis', description: 'Category volatility analysis' },
      { method: 'GET', path: '/memory-oracle/status', description: 'Memory Oracle status' },
      { method: 'GET', path: '/swarm/status', description: 'Swarm status' },
      { method: 'GET', path: '/swarm/metrics', description: 'Swarm metrics' }
    ]
  },
  
  // Monitoring Dashboard endpoints
  monitoringDashboard: {
    baseUrl: 'https://monitoring-dashboard.onrender.com',
    endpoints: [
      { method: 'GET', path: '/', description: 'Service info' },
      { method: 'GET', path: '/health', description: 'Health check' },
      { method: 'GET', path: '/dashboard', description: 'Full dashboard data' },
      { method: 'GET', path: '/dashboard/summary', description: 'Dashboard summary' },
      { method: 'GET', path: '/dashboard/services', description: 'Service status' },
      { method: 'GET', path: '/dashboard/processing', description: 'Processing metrics' },
      { method: 'GET', path: '/metrics', description: 'Service metrics' },
      { method: 'GET', path: '/metrics/prometheus', description: 'Prometheus metrics' },
      { method: 'GET', path: '/alerts', description: 'Alerts overview' },
      { method: 'GET', path: '/alerts/active', description: 'Active alerts' },
      { method: 'GET', path: '/alerts/history', description: 'Alert history' }
    ]
  },
  
  // Memory Oracle endpoints
  memoryOracle: {
    baseUrl: 'https://memory-oracle.onrender.com',
    endpoints: [
      { method: 'GET', path: '/health', description: 'Health check' },
      { method: 'POST', path: '/tensors/compute', description: 'Compute all tensors', requiresAuth: true },
      { method: 'POST', path: '/tensors/query', description: 'Query tensors', requiresAuth: true },
      { method: 'GET', path: '/tensors/memory/google.com', description: 'Memory tensor for domain' },
      { method: 'GET', path: '/tensors/memory/top/10', description: 'Top memories' },
      { method: 'GET', path: '/tensors/sentiment/google.com', description: 'Sentiment tensor' },
      { method: 'GET', path: '/tensors/sentiment/google.com/trends/30', description: 'Sentiment trends' },
      { method: 'GET', path: '/tensors/sentiment/market/distribution', description: 'Market sentiment' },
      { method: 'GET', path: '/tensors/grounding/google.com', description: 'Grounding tensor' },
      { method: 'GET', path: '/drift/detect', description: 'Drift detection' },
      { method: 'GET', path: '/consensus/compute', description: 'Consensus computation' }
    ]
  },
  
  // Other services
  otherServices: {
    endpoints: [
      { service: 'SEO Metrics', baseUrl: 'https://seo-metrics-runner.onrender.com', path: '/health' },
      { service: 'Domain Processor V2', baseUrl: 'https://domain-processor-v2.onrender.com', path: '/api/v2/health' },
      { service: 'Cohort Intelligence', baseUrl: 'https://cohort-intelligence.onrender.com', path: '/health' },
      { service: 'Industry Intelligence', baseUrl: 'https://industry-intelligence.onrender.com', path: '/health' },
      { service: 'News Correlation', baseUrl: 'https://news-correlation-service.onrender.com', path: '/health' },
      { service: 'Swarm Intelligence', baseUrl: 'https://swarm-intelligence.onrender.com', path: '/health' },
      { service: 'Weekly Scheduler', baseUrl: 'https://weekly-scheduler.onrender.com', path: '/health' },
      { service: 'Visceral Intelligence', baseUrl: 'https://visceral-intelligence.onrender.com', path: '/health' },
      { service: 'Reality Validator', baseUrl: 'https://reality-validator.onrender.com', path: '/health' },
      { service: 'Predictive Analytics', baseUrl: 'https://predictive-analytics.onrender.com', path: '/health' },
      { service: 'Embedding Engine', baseUrl: 'https://embedding-engine.onrender.com', path: '/health' },
      { service: 'Database Manager', baseUrl: 'https://database-manager.onrender.com', path: '/health' }
    ]
  }
};

// Test results storage
const testResults = {
  publicApi: [],
  sophisticatedRunner: [],
  monitoringDashboard: [],
  memoryOracle: [],
  otherServices: [],
  summary: {
    totalTests: 0,
    passed: 0,
    failed: 0,
    warnings: 0
  }
};

// Helper function to make HTTP/HTTPS requests
function makeRequest(url, method = 'GET', headers = {}) {
  return new Promise((resolve, reject) => {
    const startTime = Date.now();
    const urlObj = new URL(url);
    const protocol = urlObj.protocol === 'https:' ? https : http;
    
    const options = {
      hostname: urlObj.hostname,
      port: urlObj.port,
      path: urlObj.pathname + urlObj.search,
      method: method,
      headers: {
        'User-Agent': 'API-Endpoint-Tester/1.0',
        ...headers
      },
      timeout: 30000
    };
    
    const req = protocol.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        const responseTime = Date.now() - startTime;
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body: data,
          responseTime: responseTime
        });
      });
    });
    
    req.on('error', (error) => {
      reject(error);
    });
    
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });
    
    req.end();
  });
}

// Test individual endpoint
async function testEndpoint(baseUrl, endpoint) {
  const url = baseUrl + endpoint.path;
  const result = {
    url: url,
    method: endpoint.method,
    description: endpoint.description,
    status: 'FAIL',
    statusCode: null,
    responseTime: null,
    error: null,
    responseFormat: null,
    requiresAuth: endpoint.requiresAuth || false,
    authTestResult: null
  };
  
  try {
    console.log(`Testing: ${endpoint.method} ${url}`);
    
    // Test without auth first
    const response = await makeRequest(url, endpoint.method);
    result.statusCode = response.statusCode;
    result.responseTime = response.responseTime;
    
    // Check if response is valid
    if (response.statusCode >= 200 && response.statusCode < 300) {
      result.status = 'PASS';
      
      // Try to parse JSON
      try {
        const jsonData = JSON.parse(response.body);
        result.responseFormat = 'JSON';
      } catch (e) {
        result.responseFormat = 'HTML/Text';
      }
    } else if (response.statusCode === 401 && endpoint.requiresAuth) {
      result.status = 'EXPECTED_AUTH';
      result.authTestResult = 'Correctly requires authentication';
    } else if (response.statusCode === 429) {
      result.status = 'RATE_LIMITED';
      result.error = 'Rate limit exceeded';
    } else {
      result.status = 'FAIL';
      result.error = `HTTP ${response.statusCode}`;
    }
    
    // If endpoint requires auth and we got 401, test with demo key
    if (endpoint.requiresAuth && response.statusCode === 401) {
      const authResponse = await makeRequest(url, endpoint.method, {
        'Authorization': 'Bearer demo-key-1'
      });
      
      if (authResponse.statusCode >= 200 && authResponse.statusCode < 300) {
        result.authTestResult = 'Works with demo key';
      } else {
        result.authTestResult = 'Demo key rejected';
      }
    }
    
  } catch (error) {
    result.status = 'FAIL';
    result.error = error.message;
  }
  
  return result;
}

// Test all endpoints for a service
async function testService(serviceName, config) {
  console.log(`\n=== Testing ${serviceName} ===`);
  const results = [];
  
  for (const endpoint of config.endpoints) {
    const result = await testEndpoint(config.baseUrl, endpoint);
    results.push(result);
    
    // Update summary
    testResults.summary.totalTests++;
    if (result.status === 'PASS' || result.status === 'EXPECTED_AUTH') {
      testResults.summary.passed++;
    } else if (result.status === 'RATE_LIMITED') {
      testResults.summary.warnings++;
    } else {
      testResults.summary.failed++;
    }
    
    // Add small delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  return results;
}

// Test other services health endpoints
async function testOtherServices() {
  console.log('\n=== Testing Other Services Health Endpoints ===');
  const results = [];
  
  for (const service of endpoints.otherServices.endpoints) {
    const result = await testEndpoint(service.baseUrl, { 
      method: 'GET', 
      path: service.path, 
      description: `${service.service} health check` 
    });
    result.service = service.service;
    results.push(result);
    
    testResults.summary.totalTests++;
    if (result.status === 'PASS') {
      testResults.summary.passed++;
    } else {
      testResults.summary.failed++;
    }
    
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  return results;
}

// Generate markdown report
function generateReport() {
  const timestamp = new Date().toISOString();
  let report = `# API Endpoint Test Report

Generated: ${timestamp}

## Summary

- **Total Tests**: ${testResults.summary.totalTests}
- **Passed**: ${testResults.summary.passed}
- **Failed**: ${testResults.summary.failed}
- **Warnings**: ${testResults.summary.warnings}
- **Success Rate**: ${((testResults.summary.passed / testResults.summary.totalTests) * 100).toFixed(1)}%

## Public API (llmrank.io)

| Endpoint | Method | Status | Response Time | Auth | Notes |
|----------|--------|--------|---------------|------|-------|
`;

  testResults.publicApi.forEach(r => {
    const status = r.status === 'PASS' ? '✅ PASS' : r.status === 'EXPECTED_AUTH' ? '🔐 AUTH' : '❌ FAIL';
    report += `| ${r.path || r.url} | ${r.method} | ${status} | ${r.responseTime || 'N/A'}ms | ${r.requiresAuth ? 'Yes' : 'No'} | ${r.error || r.authTestResult || ''} |\n`;
  });

  report += `\n## Sophisticated Runner Service

| Endpoint | Method | Status | Response Time | Auth | Notes |
|----------|--------|--------|---------------|------|-------|
`;

  testResults.sophisticatedRunner.forEach(r => {
    const status = r.status === 'PASS' ? '✅ PASS' : r.status === 'EXPECTED_AUTH' ? '🔐 AUTH' : '❌ FAIL';
    report += `| ${r.path || r.url} | ${r.method} | ${status} | ${r.responseTime || 'N/A'}ms | ${r.requiresAuth ? 'Yes' : 'No'} | ${r.error || r.authTestResult || ''} |\n`;
  });

  report += `\n## Monitoring Dashboard

| Endpoint | Method | Status | Response Time | Notes |
|----------|--------|--------|---------------|-------|
`;

  testResults.monitoringDashboard.forEach(r => {
    const status = r.status === 'PASS' ? '✅ PASS' : '❌ FAIL';
    report += `| ${r.path || r.url} | ${r.method} | ${status} | ${r.responseTime || 'N/A'}ms | ${r.error || ''} |\n`;
  });

  report += `\n## Memory Oracle Service

| Endpoint | Method | Status | Response Time | Auth | Notes |
|----------|--------|--------|---------------|------|-------|
`;

  testResults.memoryOracle.forEach(r => {
    const status = r.status === 'PASS' ? '✅ PASS' : r.status === 'EXPECTED_AUTH' ? '🔐 AUTH' : '❌ FAIL';
    report += `| ${r.path || r.url} | ${r.method} | ${status} | ${r.responseTime || 'N/A'}ms | ${r.requiresAuth ? 'Yes' : 'No'} | ${r.error || r.authTestResult || ''} |\n`;
  });

  report += `\n## Other Services Health Status

| Service | Status | Response Time | Notes |
|---------|--------|---------------|-------|
`;

  testResults.otherServices.forEach(r => {
    const status = r.status === 'PASS' ? '✅ PASS' : '❌ FAIL';
    report += `| ${r.service} | ${status} | ${r.responseTime || 'N/A'}ms | ${r.error || ''} |\n`;
  });

  report += `\n## Critical Findings

`;

  // Analyze critical issues
  const criticalIssues = [];
  
  if (testResults.publicApi.filter(r => r.status === 'FAIL').length > 0) {
    criticalIssues.push('- ⚠️ Public API has failing endpoints');
  }
  
  if (testResults.summary.failed > testResults.summary.totalTests * 0.2) {
    criticalIssues.push('- ⚠️ More than 20% of endpoints are failing');
  }
  
  const authEndpoints = [...testResults.publicApi, ...testResults.sophisticatedRunner, ...testResults.memoryOracle]
    .filter(r => r.requiresAuth);
  const authWorking = authEndpoints.filter(r => r.status === 'EXPECTED_AUTH' || r.authTestResult === 'Works with demo key');
  
  if (authWorking.length < authEndpoints.length) {
    criticalIssues.push('- ⚠️ Some authenticated endpoints are not properly secured');
  }
  
  if (criticalIssues.length > 0) {
    report += criticalIssues.join('\n');
  } else {
    report += '✅ All critical endpoints are functional';
  }
  
  report += `\n\n## Recommendations

1. **Response Times**: Average response time is ${calculateAverageResponseTime()}ms
2. **Authentication**: ${authWorking.length}/${authEndpoints.length} authenticated endpoints working correctly
3. **Service Health**: ${testResults.otherServices.filter(r => r.status === 'PASS').length}/${testResults.otherServices.length} services are healthy
`;

  return report;
}

function calculateAverageResponseTime() {
  const allResults = [
    ...testResults.publicApi,
    ...testResults.sophisticatedRunner,
    ...testResults.monitoringDashboard,
    ...testResults.memoryOracle,
    ...testResults.otherServices
  ];
  
  const validTimes = allResults
    .filter(r => r.responseTime)
    .map(r => r.responseTime);
  
  if (validTimes.length === 0) return 'N/A';
  
  const avg = validTimes.reduce((a, b) => a + b, 0) / validTimes.length;
  return Math.round(avg);
}

// Main test runner
async function runTests() {
  console.log('Starting API Endpoint Tests...\n');
  
  try {
    // Test each service
    testResults.publicApi = await testService('Public API', endpoints.publicApi);
    testResults.sophisticatedRunner = await testService('Sophisticated Runner', endpoints.sophisticatedRunner);
    testResults.monitoringDashboard = await testService('Monitoring Dashboard', endpoints.monitoringDashboard);
    testResults.memoryOracle = await testService('Memory Oracle', endpoints.memoryOracle);
    testResults.otherServices = await testOtherServices();
    
    // Generate and save report
    const report = generateReport();
    
    // Save to file
    const fs = require('fs');
    fs.writeFileSync('API_ENDPOINT_TEST_REPORT.md', report);
    
    console.log('\n=== Test Summary ===');
    console.log(`Total Tests: ${testResults.summary.totalTests}`);
    console.log(`Passed: ${testResults.summary.passed}`);
    console.log(`Failed: ${testResults.summary.failed}`);
    console.log(`Warnings: ${testResults.summary.warnings}`);
    console.log(`\nReport saved to API_ENDPOINT_TEST_REPORT.md`);
    
  } catch (error) {
    console.error('Test runner error:', error);
  }
}

// Run the tests
runTests();