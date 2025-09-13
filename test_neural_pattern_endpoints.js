#!/usr/bin/env node

/**
 * Test Neural Pattern Detection Endpoints
 * Tests the new pattern detection system on sophisticated-runner service
 */

const https = require('https');
const http = require('http');

const BASE_URL = 'https://sophisticated-runner.onrender.com';
const API_KEY = process.env.INTERNAL_API_KEY || 'test-key'; // Use your actual API key

console.log('🧠 Testing Neural Pattern Detection Endpoints');
console.log('=' * 60);

async function makeRequest(endpoint, method = 'GET', data = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(endpoint, BASE_URL);
    const options = {
      hostname: url.hostname,
      port: url.port || (url.protocol === 'https:' ? 443 : 80),
      path: url.pathname + url.search,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': API_KEY,
        'User-Agent': 'Neural-Pattern-Test/1.0'
      }
    };

    if (data) {
      const jsonData = JSON.stringify(data);
      options.headers['Content-Length'] = Buffer.byteLength(jsonData);
    }

    const client = url.protocol === 'https:' ? https : http;
    const req = client.request(options, (res) => {
      let responseData = '';
      
      res.on('data', (chunk) => {
        responseData += chunk;
      });
      
      res.on('end', () => {
        try {
          const response = {
            status: res.statusCode,
            headers: res.headers,
            data: responseData ? JSON.parse(responseData) : null
          };
          resolve(response);
        } catch (e) {
          resolve({
            status: res.statusCode,
            headers: res.headers,
            data: responseData,
            error: 'Failed to parse JSON'
          });
        }
      });
    });

    req.on('error', (err) => {
      reject(err);
    });

    if (data) {
      req.write(JSON.stringify(data));
    }

    req.end();
  });
}

async function testHealthEndpoint() {
  console.log('\n📊 Testing Health Endpoint...');
  try {
    const response = await makeRequest('/health');
    console.log(`Status: ${response.status}`);
    
    if (response.data) {
      console.log(`Service: ${response.data.service}`);
      console.log(`Database: ${response.data.database}`);
      console.log(`API Keys Configured: ${response.data.apiKeys?.configured || 0}`);
      console.log(`Overall Status: ${response.data.status}`);
    }
    
    return response.status === 200;
  } catch (error) {
    console.error(`❌ Health check failed: ${error.message}`);
    return false;
  }
}

async function testPatternMonitor() {
  console.log('\n🔍 Testing Pattern Monitor Endpoint...');
  try {
    const response = await makeRequest('/pattern-monitor');
    console.log(`Status: ${response.status}`);
    
    if (response.data) {
      console.log(`Recent Patterns: ${response.data.recent_patterns?.length || 0}`);
      console.log(`Recent Alerts: ${response.data.recent_alerts?.length || 0}`);
      console.log(`Pattern Statistics: ${response.data.pattern_statistics?.length || 0}`);
      
      if (response.data.pattern_statistics?.length > 0) {
        console.log('Top Pattern Types:');
        response.data.pattern_statistics.slice(0, 3).forEach(stat => {
          console.log(`  - ${stat.pattern_type}: ${stat.count} patterns (avg confidence: ${(stat.avg_confidence * 100).toFixed(1)}%)`);
        });
      }
    }
    
    return response.status === 200;
  } catch (error) {
    console.error(`❌ Pattern monitor failed: ${error.message}`);
    return false;
  }
}

async function testDetectPatterns() {
  console.log('\n🧠 Testing Pattern Detection Endpoint...');
  try {
    const response = await makeRequest('/detect-patterns', 'POST', {});
    console.log(`Status: ${response.status}`);
    
    if (response.data) {
      console.log(`Patterns Detected: ${response.data.patterns_detected || 0}`);
      console.log(`Alerts Generated: ${response.data.alerts_generated || 0}`);
      console.log(`Domains Analyzed: ${response.data.domains_analyzed || 0}`);
      
      if (response.data.patterns?.length > 0) {
        console.log('Sample Patterns:');
        response.data.patterns.slice(0, 3).forEach(pattern => {
          console.log(`  - ${pattern.domain}: ${pattern.pattern_type} (${(pattern.confidence * 100).toFixed(1)}% confidence)`);
        });
      }
      
      if (response.data.alerts?.length > 0) {
        console.log('Generated Alerts:');
        response.data.alerts.forEach(alert => {
          console.log(`  - ${alert.priority}: ${alert.message}`);
        });
      }
    }
    
    return response.status === 200 || response.status === 202;
  } catch (error) {
    console.error(`❌ Pattern detection failed: ${error.message}`);
    return false;
  }
}

async function testNeuralLearning() {
  console.log('\n🧠 Testing Neural Learning Endpoint...');
  try {
    const response = await makeRequest('/neural-learning', 'POST', {});
    console.log(`Status: ${response.status}`);
    
    if (response.data) {
      console.log(`Learning Completed: ${response.data.learning_completed}`);
      console.log(`Historical Patterns Analyzed: ${response.data.historical_patterns_analyzed || 0}`);
      
      if (response.data.insights) {
        console.log('Learning Insights:');
        if (response.data.insights.most_frequent_patterns?.length > 0) {
          console.log('  Most Frequent Patterns:');
          response.data.insights.most_frequent_patterns.forEach(([type, count]) => {
            console.log(`    - ${type}: ${count} occurrences`);
          });
        }
        
        if (response.data.insights.multi_pattern_domains?.length > 0) {
          console.log('  Multi-Pattern Domains:');
          response.data.insights.multi_pattern_domains.slice(0, 3).forEach(([domain, patterns]) => {
            console.log(`    - ${domain}: ${patterns.join(', ')}`);
          });
        }
      }
    }
    
    return response.status === 200;
  } catch (error) {
    console.error(`❌ Neural learning failed: ${error.message}`);
    return false;
  }
}

async function testCompetitiveDashboard() {
  console.log('\n📊 Testing Competitive Intelligence Dashboard...');
  try {
    const response = await makeRequest('/competitive-dashboard');
    console.log(`Status: ${response.status}`);
    
    if (response.data) {
      console.log(`Competitive Threats: ${response.data.competitive_threats?.length || 0}`);
      console.log(`Market Leaders: ${response.data.market_leaders?.length || 0}`);
      console.log(`Emerging Players: ${response.data.emerging_players?.length || 0}`);
      console.log(`Market Declines: ${response.data.market_declines?.length || 0}`);
      
      if (response.data.metrics) {
        console.log('Competitive Metrics:');
        console.log(`  - Threat Level: ${(response.data.metrics.threat_level * 100).toFixed(1)}%`);
        console.log(`  - Market Stability: ${(response.data.metrics.market_stability * 100).toFixed(1)}%`);
        console.log(`  - Innovation Index: ${(response.data.metrics.innovation_index * 100).toFixed(1)}%`);
        console.log(`  - Competitive Intensity: ${(response.data.metrics.competitive_intensity * 100).toFixed(1)}%`);
      }
    }
    
    return response.status === 200;
  } catch (error) {
    console.error(`❌ Competitive dashboard failed: ${error.message}`);
    return false;
  }
}

async function testCrossCategoryAnalysis() {
  console.log('\n🔄 Testing Cross-Category Analysis...');
  try {
    const response = await makeRequest('/cross-category-analysis', 'POST', {
      threshold: 0.7
    });
    console.log(`Status: ${response.status}`);
    
    if (response.data) {
      console.log(`Total Categories: ${response.data.total_categories || 0}`);
      console.log(`Analysis Threshold: ${response.data.analysis_threshold}`);
      
      if (response.data.cross_category_analysis?.length > 0) {
        console.log('Category Intelligence:');
        response.data.cross_category_analysis.slice(0, 3).forEach(category => {
          console.log(`  - ${category.category}: ${category.domain_count} domains, ${category.pattern_diversity} pattern types`);
          console.log(`    Competitive Intensity: ${(category.competitive_intensity * 100).toFixed(1)}%`);
          console.log(`    Avg Confidence: ${(category.avg_confidence * 100).toFixed(1)}%`);
        });
      }
    }
    
    return response.status === 200;
  } catch (error) {
    console.error(`❌ Cross-category analysis failed: ${error.message}`);
    return false;
  }
}

async function runAllTests() {
  console.log('🚀 Starting Neural Pattern Detection System Tests');
  
  const tests = [
    { name: 'Health Check', fn: testHealthEndpoint },
    { name: 'Pattern Monitor', fn: testPatternMonitor },
    { name: 'Pattern Detection', fn: testDetectPatterns },
    { name: 'Neural Learning', fn: testNeuralLearning },
    { name: 'Competitive Dashboard', fn: testCompetitiveDashboard },
    { name: 'Cross-Category Analysis', fn: testCrossCategoryAnalysis }
  ];
  
  const results = [];
  
  for (const test of tests) {
    try {
      const success = await test.fn();
      results.push({ name: test.name, success });
      console.log(`${success ? '✅' : '❌'} ${test.name}: ${success ? 'PASSED' : 'FAILED'}`);
    } catch (error) {
      results.push({ name: test.name, success: false, error: error.message });
      console.log(`❌ ${test.name}: FAILED (${error.message})`);
    }
    
    // Add delay between tests
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  console.log('\n📊 TEST SUMMARY');
  console.log('=' * 40);
  
  const passed = results.filter(r => r.success).length;
  const total = results.length;
  
  console.log(`Tests Passed: ${passed}/${total} (${((passed/total) * 100).toFixed(1)}%)`);
  
  if (passed === total) {
    console.log('🎉 All neural pattern detection endpoints are working!');
    console.log('\n🔗 Available Endpoints:');
    console.log('  - GET /health - System health check');
    console.log('  - GET /pattern-monitor - Real-time pattern monitoring');
    console.log('  - POST /detect-patterns - Run pattern detection');
    console.log('  - POST /neural-learning - Neural pattern learning');
    console.log('  - GET /competitive-dashboard - Intelligence dashboard');
    console.log('  - POST /cross-category-analysis - Cross-category analysis');
  } else {
    console.log('⚠️  Some tests failed. Check the logs above for details.');
  }
  
  return passed === total;
}

// Run tests
runAllTests()
  .then(success => {
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('❌ Test execution failed:', error);
    process.exit(1);
  });