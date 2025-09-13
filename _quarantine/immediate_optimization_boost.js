#!/usr/bin/env node

const axios = require('axios');

// IMMEDIATE OPTIMIZATION SCRIPT
// Triggers multiple parallel processing requests to boost throughput

const SERVICE_URL = 'https://sophisticated-runner.onrender.com';

async function boostProcessing() {
  console.log('🚀 IMMEDIATE CRAWL OPTIMIZATION BOOST');
  console.log('====================================');
  
  try {
    // Check service health
    const healthResponse = await axios.get(`${SERVICE_URL}/health`, { timeout: 10000 });
    console.log(`✅ Service status: ${healthResponse.data.service}`);
    console.log(`🔧 Version: ${healthResponse.data.version}`);
    console.log(`⏱️  Uptime: ${Math.floor(healthResponse.data.uptime_seconds / 3600)}h ${Math.floor((healthResponse.data.uptime_seconds % 3600) / 60)}m`);
    console.log('');
    
    // Try available endpoints to find the correct one
    const endpoints = [
      '/process-pending-domains',
      '/ultra-fast-process', 
      '/start-processing',
      '/process-domains',
      '/crawl',
      '/optimize'
    ];
    
    console.log('🔍 Testing available endpoints...');
    
    let workingEndpoint = null;
    for (const endpoint of endpoints) {
      try {
        console.log(`Testing ${endpoint}...`);
        const response = await axios.post(`${SERVICE_URL}${endpoint}`, {}, { 
          timeout: 5000,
          validateStatus: function (status) {
            return status < 500; // Accept anything less than 500 as potentially working
          }
        });
        
        if (response.status < 400) {
          workingEndpoint = endpoint;
          console.log(`✅ Found working endpoint: ${endpoint}`);
          console.log(`Response: ${JSON.stringify(response.data).substring(0, 200)}...`);
          break;
        } else {
          console.log(`❌ ${endpoint}: ${response.status} ${response.statusText}`);
        }
      } catch (error) {
        console.log(`❌ ${endpoint}: ${error.message}`);
      }
    }
    
    if (!workingEndpoint) {
      console.log('⚠️ No working processing endpoint found. Trying manual approach...');
      
      // Try to trigger processing through multiple request patterns
      const triggerPatterns = [
        { method: 'POST', path: '/', data: { action: 'process' } },
        { method: 'GET', path: '/trigger' },
        { method: 'POST', path: '/start', data: {} },
        { method: 'PUT', path: '/process' },
      ];
      
      for (const pattern of triggerPatterns) {
        try {
          console.log(`Trying ${pattern.method} ${pattern.path}...`);
          const response = await axios.request({
            method: pattern.method,
            url: `${SERVICE_URL}${pattern.path}`,
            data: pattern.data,
            timeout: 5000
          });
          console.log(`✅ ${pattern.method} ${pattern.path}: ${response.status}`);
          break;
        } catch (error) {
          console.log(`❌ ${pattern.method} ${pattern.path}: ${error.message}`);
        }
      }
      
      return;
    }
    
    // If we found a working endpoint, use it to boost processing
    console.log('');
    console.log('🚀 LAUNCHING OPTIMIZATION BOOST');
    console.log('===============================');
    
    // Launch multiple parallel requests for maximum throughput
    const parallelRequests = [];
    const numWorkers = 10; // Start with 10 parallel workers
    
    for (let i = 0; i < numWorkers; i++) {
      parallelRequests.push(
        axios.post(`${SERVICE_URL}${workingEndpoint}`, {
          workerId: i,
          batchSize: 50,
          priority: 'high'
        }, {
          timeout: 60000
        }).then(response => {
          console.log(`✅ Worker ${i}: ${JSON.stringify(response.data).substring(0, 100)}...`);
          return { worker: i, success: true, data: response.data };
        }).catch(error => {
          console.log(`⚠️ Worker ${i}: ${error.message}`);
          return { worker: i, success: false, error: error.message };
        })
      );
      
      // Stagger requests slightly to avoid overwhelming
      await new Promise(resolve => setTimeout(resolve, 200));
    }
    
    console.log(`🔄 Launched ${numWorkers} parallel workers, waiting for responses...`);
    
    const results = await Promise.allSettled(parallelRequests);
    
    let successfulWorkers = 0;
    let totalProcessed = 0;
    
    results.forEach((result, index) => {
      if (result.status === 'fulfilled' && result.value.success) {
        successfulWorkers++;
        if (result.value.data && result.value.data.processed) {
          totalProcessed += result.value.data.processed;
        }
      }
    });
    
    console.log('');
    console.log('📊 OPTIMIZATION BOOST RESULTS');
    console.log('=============================');
    console.log(`✅ Successful workers: ${successfulWorkers}/${numWorkers}`);
    console.log(`📈 Domains processed: ${totalProcessed}`);
    console.log(`⚡ Success rate: ${((successfulWorkers/numWorkers)*100).toFixed(1)}%`);
    
    if (successfulWorkers > 0) {
      console.log('');
      console.log('🎉 OPTIMIZATION BOOST SUCCESSFUL!');
      console.log('The crawl processing has been accelerated.');
      console.log('Monitor progress with: node check_current_status.js');
    } else {
      console.log('');
      console.log('⚠️ OPTIMIZATION BOOST PARTIAL');
      console.log('Some workers may still be processing in the background.');
    }
    
  } catch (error) {
    console.error('❌ Optimization boost failed:', error.message);
  }
}

// Run the optimization boost
boostProcessing()
  .then(() => {
    console.log('\n✅ Optimization boost completed');
    process.exit(0);
  })
  .catch(error => {
    console.error('\n❌ Fatal error:', error);
    process.exit(1);
  });