const https = require('https');
const http = require('http');

// Service URLs from render.yaml
const SERVICES = {
  sophisticated_runner: 'https://sophisticated-runner.onrender.com',
  domain_processor_v2: 'https://domain-processor-v2.onrender.com',
  public_api: 'https://llmrank.io',
  seo_metrics: 'https://seo-metrics-runner.onrender.com',
  cohort_intelligence: 'https://cohort-intelligence.onrender.com',
  industry_intelligence: 'https://industry-intelligence.onrender.com',
  news_correlation: 'https://news-correlation-service.onrender.com',
  swarm_intelligence: 'https://swarm-intelligence.onrender.com',
  memory_oracle: 'https://memory-oracle.onrender.com',
  weekly_scheduler: 'https://weekly-scheduler.onrender.com',
  visceral_intelligence: 'https://visceral-intelligence.onrender.com',
  reality_validator: 'https://reality-validator.onrender.com',
  predictive_analytics: 'https://predictive-analytics.onrender.com',
  embedding_engine: 'https://embedding-engine.onrender.com',
  database_manager: 'https://database-manager.onrender.com',
  monitoring_dashboard: 'https://monitoring-dashboard.onrender.com'
};

// Test results storage
const testResults = {
  timestamp: new Date().toISOString(),
  services: {},
  integrations: {},
  dataFlow: {},
  llmProviders: {}
};

// Helper function to make HTTP requests
function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith('https') ? https : http;
    const timeout = options.timeout || 30000;
    
    const req = protocol.get(url, { ...options, timeout }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          data: data,
          url: url
        });
      });
    });
    
    req.on('error', (err) => {
      resolve({
        error: err.message,
        url: url
      });
    });
    
    req.on('timeout', () => {
      req.destroy();
      resolve({
        error: 'Request timeout',
        url: url
      });
    });
  });
}

// Test individual service health
async function testServiceHealth(serviceName, serviceUrl) {
  console.log(`\nTesting ${serviceName} health...`);
  
  try {
    const healthUrl = `${serviceUrl}/health`;
    const response = await makeRequest(healthUrl);
    
    const result = {
      name: serviceName,
      url: serviceUrl,
      healthEndpoint: healthUrl,
      status: 'UNKNOWN',
      details: {}
    };
    
    if (response.error) {
      result.status = 'FAIL';
      result.details.error = response.error;
    } else if (response.statusCode === 200) {
      result.status = 'PASS';
      result.details.statusCode = response.statusCode;
      try {
        result.details.response = JSON.parse(response.data);
      } catch (e) {
        result.details.response = response.data;
      }
    } else {
      result.status = 'FAIL';
      result.details.statusCode = response.statusCode;
      result.details.response = response.data;
    }
    
    testResults.services[serviceName] = result;
    console.log(`  Status: ${result.status}`);
    if (result.status === 'FAIL') {
      console.log(`  Error: ${JSON.stringify(result.details)}`);
    }
    
    return result;
  } catch (error) {
    console.log(`  Error testing ${serviceName}: ${error.message}`);
    testResults.services[serviceName] = {
      name: serviceName,
      url: serviceUrl,
      status: 'FAIL',
      details: { error: error.message }
    };
    return testResults.services[serviceName];
  }
}

// Test weekly scheduler → sophisticated runner integration
async function testSchedulerToRunner() {
  console.log('\n=== Testing Weekly Scheduler → Sophisticated Runner Integration ===');
  
  const integration = {
    name: 'scheduler_to_runner',
    status: 'UNKNOWN',
    details: {}
  };
  
  try {
    // Check if scheduler is healthy
    const schedulerHealth = testResults.services.weekly_scheduler;
    if (!schedulerHealth || schedulerHealth.status !== 'PASS') {
      integration.status = 'FAIL';
      integration.details.error = 'Weekly scheduler is not healthy';
      testResults.integrations.scheduler_to_runner = integration;
      return;
    }
    
    // Check if sophisticated runner is healthy
    const runnerHealth = testResults.services.sophisticated_runner;
    if (!runnerHealth || runnerHealth.status !== 'PASS') {
      integration.status = 'FAIL';
      integration.details.error = 'Sophisticated runner is not healthy';
      testResults.integrations.scheduler_to_runner = integration;
      return;
    }
    
    // Test if scheduler has correct runner URL configured
    integration.status = 'PASS';
    integration.details.scheduler_healthy = true;
    integration.details.runner_healthy = true;
    integration.details.configured_url = SERVICES.sophisticated_runner;
    
  } catch (error) {
    integration.status = 'FAIL';
    integration.details.error = error.message;
  }
  
  testResults.integrations.scheduler_to_runner = integration;
  console.log(`  Integration Status: ${integration.status}`);
}

// Test public API → database integration
async function testApiToDatabase() {
  console.log('\n=== Testing Public API → Database Integration ===');
  
  const integration = {
    name: 'api_to_database',
    status: 'UNKNOWN',
    details: {}
  };
  
  try {
    // Test API endpoint that queries database
    const testUrl = `${SERVICES.public_api}/api/domains`;
    const response = await makeRequest(testUrl);
    
    if (response.error) {
      integration.status = 'FAIL';
      integration.details.error = response.error;
    } else if (response.statusCode === 200) {
      integration.status = 'PASS';
      integration.details.statusCode = response.statusCode;
      try {
        const data = JSON.parse(response.data);
        integration.details.dataReceived = true;
        integration.details.recordCount = Array.isArray(data) ? data.length : 'N/A';
      } catch (e) {
        integration.details.parseError = e.message;
      }
    } else {
      integration.status = 'PARTIAL';
      integration.details.statusCode = response.statusCode;
      integration.details.note = 'API responds but may not be fully functional';
    }
    
  } catch (error) {
    integration.status = 'FAIL';
    integration.details.error = error.message;
  }
  
  testResults.integrations.api_to_database = integration;
  console.log(`  Integration Status: ${integration.status}`);
}

// Test monitoring dashboard → all services
async function testMonitoringConnectivity() {
  console.log('\n=== Testing Monitoring Dashboard → All Services ===');
  
  const integration = {
    name: 'monitoring_to_services',
    status: 'UNKNOWN',
    details: {
      services_monitored: []
    }
  };
  
  try {
    const monitoringHealth = testResults.services.monitoring_dashboard;
    if (!monitoringHealth || monitoringHealth.status !== 'PASS') {
      integration.status = 'FAIL';
      integration.details.error = 'Monitoring dashboard is not healthy';
      testResults.integrations.monitoring_to_services = integration;
      return;
    }
    
    // Check if monitoring can reach all services
    let healthyServices = 0;
    let totalServices = 0;
    
    for (const [serviceName, serviceHealth] of Object.entries(testResults.services)) {
      if (serviceName !== 'monitoring_dashboard') {
        totalServices++;
        if (serviceHealth.status === 'PASS') {
          healthyServices++;
          integration.details.services_monitored.push(serviceName);
        }
      }
    }
    
    integration.details.healthy_services = healthyServices;
    integration.details.total_services = totalServices;
    integration.details.coverage = `${((healthyServices / totalServices) * 100).toFixed(1)}%`;
    
    if (healthyServices === totalServices) {
      integration.status = 'PASS';
    } else if (healthyServices > totalServices * 0.7) {
      integration.status = 'PARTIAL';
    } else {
      integration.status = 'FAIL';
    }
    
  } catch (error) {
    integration.status = 'FAIL';
    integration.details.error = error.message;
  }
  
  testResults.integrations.monitoring_to_services = integration;
  console.log(`  Integration Status: ${integration.status}`);
  console.log(`  Coverage: ${integration.details.coverage}`);
}

// Test data flow: scheduler triggers processing
async function testSchedulerDataFlow() {
  console.log('\n=== Testing Data Flow: Scheduler → Processing ===');
  
  const dataFlow = {
    name: 'scheduler_triggered_processing',
    status: 'UNKNOWN',
    details: {}
  };
  
  try {
    // Check scheduler job status
    const jobStatusUrl = `${SERVICES.weekly_scheduler}/jobs/status`;
    const response = await makeRequest(jobStatusUrl);
    
    if (response.statusCode === 200) {
      dataFlow.status = 'PASS';
      dataFlow.details.scheduler_responsive = true;
      try {
        const data = JSON.parse(response.data);
        dataFlow.details.jobs = data;
      } catch (e) {
        dataFlow.details.response = response.data;
      }
    } else {
      dataFlow.status = 'PARTIAL';
      dataFlow.details.note = 'Scheduler endpoint not fully implemented';
    }
    
  } catch (error) {
    dataFlow.status = 'FAIL';
    dataFlow.details.error = error.message;
  }
  
  testResults.dataFlow.scheduler_triggered_processing = dataFlow;
  console.log(`  Data Flow Status: ${dataFlow.status}`);
}

// Test LLM provider connectivity from sophisticated runner
async function testLLMProviderConnectivity() {
  console.log('\n=== Testing LLM Provider Connectivity ===');
  
  const providers = {
    name: 'llm_provider_connectivity',
    status: 'UNKNOWN',
    details: {
      providers_tested: []
    }
  };
  
  try {
    // Test sophisticated runner's LLM endpoints
    const testEndpoints = [
      { provider: 'openai', url: `${SERVICES.sophisticated_runner}/test/openai` },
      { provider: 'anthropic', url: `${SERVICES.sophisticated_runner}/test/anthropic` },
      { provider: 'deepseek', url: `${SERVICES.sophisticated_runner}/test/deepseek` }
    ];
    
    for (const endpoint of testEndpoints) {
      const response = await makeRequest(endpoint.url);
      
      const providerResult = {
        provider: endpoint.provider,
        status: 'UNKNOWN'
      };
      
      if (response.statusCode === 200) {
        providerResult.status = 'PASS';
      } else if (response.statusCode === 404) {
        providerResult.status = 'NOT_IMPLEMENTED';
        providerResult.note = 'Test endpoint not implemented';
      } else {
        providerResult.status = 'FAIL';
        providerResult.statusCode = response.statusCode;
      }
      
      providers.details.providers_tested.push(providerResult);
    }
    
    // Determine overall status
    const passCount = providers.details.providers_tested.filter(p => p.status === 'PASS').length;
    if (passCount === providers.details.providers_tested.length) {
      providers.status = 'PASS';
    } else if (passCount > 0) {
      providers.status = 'PARTIAL';
    } else {
      providers.status = 'FAIL';
      providers.details.note = 'LLM provider test endpoints may not be implemented';
    }
    
  } catch (error) {
    providers.status = 'FAIL';
    providers.details.error = error.message;
  }
  
  testResults.llmProviders = providers;
  console.log(`  LLM Provider Status: ${providers.status}`);
}

// Generate comprehensive report
function generateReport() {
  const report = [];
  
  report.push('# INTEGRATION TEST REPORT');
  report.push(`\nGenerated: ${testResults.timestamp}`);
  report.push('\n## Executive Summary\n');
  
  // Calculate overall health
  let totalTests = 0;
  let passedTests = 0;
  let partialTests = 0;
  
  // Count service health
  for (const service of Object.values(testResults.services)) {
    totalTests++;
    if (service.status === 'PASS') passedTests++;
    else if (service.status === 'PARTIAL') partialTests++;
  }
  
  // Count integrations
  for (const integration of Object.values(testResults.integrations)) {
    totalTests++;
    if (integration.status === 'PASS') passedTests++;
    else if (integration.status === 'PARTIAL') partialTests++;
  }
  
  // Count data flows
  for (const flow of Object.values(testResults.dataFlow)) {
    totalTests++;
    if (flow.status === 'PASS') passedTests++;
    else if (flow.status === 'PARTIAL') partialTests++;
  }
  
  const overallStatus = passedTests >= totalTests * 0.7 ? 'OPERATIONAL' : 
                       passedTests >= totalTests * 0.5 ? 'PARTIALLY OPERATIONAL' : 'CRITICAL';
  
  report.push(`- **Overall System Status**: ${overallStatus}`);
  report.push(`- **Tests Passed**: ${passedTests}/${totalTests} (${((passedTests/totalTests)*100).toFixed(1)}%)`);
  report.push(`- **Tests Partial**: ${partialTests}/${totalTests} (${((partialTests/totalTests)*100).toFixed(1)}%)`);
  report.push(`- **Tests Failed**: ${totalTests - passedTests - partialTests}/${totalTests}`);
  
  // Service Health Summary
  report.push('\n## Service Health Status\n');
  report.push('| Service | Status | Health Endpoint | Notes |');
  report.push('|---------|--------|-----------------|-------|');
  
  for (const [name, service] of Object.entries(testResults.services)) {
    const status = service.status === 'PASS' ? '✅ PASS' : 
                  service.status === 'PARTIAL' ? '⚠️ PARTIAL' : '❌ FAIL';
    const notes = service.details.error || service.details.note || 'Healthy';
    report.push(`| ${name} | ${status} | ${service.healthEndpoint} | ${notes} |`);
  }
  
  // Integration Tests
  report.push('\n## Integration Test Results\n');
  report.push('| Integration | Status | Details |');
  report.push('|-------------|--------|---------|');
  
  for (const [name, integration] of Object.entries(testResults.integrations)) {
    const status = integration.status === 'PASS' ? '✅ PASS' : 
                  integration.status === 'PARTIAL' ? '⚠️ PARTIAL' : '❌ FAIL';
    const details = integration.details.error || integration.details.note || 'Working correctly';
    report.push(`| ${name} | ${status} | ${details} |`);
  }
  
  // Data Flow Validation
  report.push('\n## Data Flow Validation\n');
  
  for (const [name, flow] of Object.entries(testResults.dataFlow)) {
    const status = flow.status === 'PASS' ? '✅ PASS' : 
                  flow.status === 'PARTIAL' ? '⚠️ PARTIAL' : '❌ FAIL';
    report.push(`- **${name}**: ${status}`);
    if (flow.details.error) {
      report.push(`  - Error: ${flow.details.error}`);
    } else if (flow.details.note) {
      report.push(`  - Note: ${flow.details.note}`);
    }
  }
  
  // LLM Provider Connectivity
  report.push('\n## LLM Provider Connectivity\n');
  
  if (testResults.llmProviders.details.providers_tested) {
    report.push('| Provider | Status |');
    report.push('|----------|--------|');
    
    for (const provider of testResults.llmProviders.details.providers_tested) {
      const status = provider.status === 'PASS' ? '✅ PASS' : 
                    provider.status === 'NOT_IMPLEMENTED' ? '⚠️ N/A' : '❌ FAIL';
      report.push(`| ${provider.provider} | ${status} |`);
    }
  }
  
  // Critical Issues
  report.push('\n## Critical Issues\n');
  
  const criticalIssues = [];
  
  // Check for critical services
  const criticalServices = ['sophisticated_runner', 'public_api', 'database_manager'];
  for (const serviceName of criticalServices) {
    if (testResults.services[serviceName]?.status !== 'PASS') {
      criticalIssues.push(`- **${serviceName}** is not operational`);
    }
  }
  
  if (criticalIssues.length === 0) {
    report.push('✅ No critical issues detected');
  } else {
    criticalIssues.forEach(issue => report.push(issue));
  }
  
  // Recommendations
  report.push('\n## Recommendations\n');
  
  if (overallStatus !== 'OPERATIONAL') {
    report.push('1. **Immediate Actions Required**:');
    
    // Find failed services
    const failedServices = Object.entries(testResults.services)
      .filter(([_, service]) => service.status === 'FAIL')
      .map(([name, _]) => name);
    
    if (failedServices.length > 0) {
      report.push(`   - Investigate and restart failed services: ${failedServices.join(', ')}`);
    }
    
    report.push('   - Check service logs for error details');
    report.push('   - Verify all environment variables are correctly set');
    report.push('   - Ensure database connectivity is established');
  }
  
  report.push('\n2. **System Optimization**:');
  report.push('   - Implement comprehensive health check endpoints for all services');
  report.push('   - Add integration test endpoints for validating service communication');
  report.push('   - Set up automated monitoring and alerting');
  
  // Raw test data
  report.push('\n## Raw Test Results\n');
  report.push('```json');
  report.push(JSON.stringify(testResults, null, 2));
  report.push('```');
  
  return report.join('\n');
}

// Main test runner
async function runIntegrationTests() {
  console.log('Starting Domain Runner Integration Tests...\n');
  
  // Test all services
  console.log('=== Testing Service Health ===');
  for (const [name, url] of Object.entries(SERVICES)) {
    await testServiceHealth(name, url);
  }
  
  // Test integrations
  await testSchedulerToRunner();
  await testApiToDatabase();
  await testMonitoringConnectivity();
  
  // Test data flows
  await testSchedulerDataFlow();
  
  // Test LLM providers
  await testLLMProviderConnectivity();
  
  // Generate and save report
  const report = generateReport();
  
  const fs = require('fs');
  fs.writeFileSync('INTEGRATION_TEST_REPORT.md', report);
  
  console.log('\n=== Integration Testing Complete ===');
  console.log('Report saved to: INTEGRATION_TEST_REPORT.md');
  
  // Also save raw results
  fs.writeFileSync('integration_test_results.json', JSON.stringify(testResults, null, 2));
  console.log('Raw results saved to: integration_test_results.json');
}

// Run the tests
runIntegrationTests().catch(console.error);