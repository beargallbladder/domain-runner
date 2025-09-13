const https = require('https');

async function triggerProcessing() {
  const postData = JSON.stringify({});
  
  const options = {
    hostname: 'sophisticated-runner.onrender.com',
    port: 443,
    path: '/process-pending-domains',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(postData)
    },
    timeout: 60000 // 60 second timeout
  };

  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const result = JSON.parse(data);
          resolve(result);
        } catch (e) {
          resolve({ processed: 0, raw: data });
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    req.on('timeout', () => {
      req.destroy();
      resolve({ processed: 'timeout', message: 'Request timed out but may be processing' });
    });

    req.write(postData);
    req.end();
  });
}

async function checkDomainStatus() {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'llm-pagerank-public-api.onrender.com',
      port: 443,
      path: '/health',
      method: 'GET',
      timeout: 10000
    };

    const req = https.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const result = JSON.parse(data);
          resolve(result.monitoring_stats);
        } catch (e) {
          resolve({ error: 'parse_error' });
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    req.end();
  });
}

async function runContinuousProcessing() {
  console.log('🚀 Starting continuous domain processing...');
  
  let cycle = 1;
  let totalProcessed = 0;
  
  while (true) {
    try {
      console.log(`\n--- CYCLE ${cycle} ---`);
      
      // Check current status
      const status = await checkDomainStatus();
      console.log(`📊 Domains monitored: ${status.domains_monitored || 'unknown'}`);
      console.log(`🔥 High risk domains: ${status.high_risk_domains || 'unknown'}`);
      console.log(`📅 Last update: ${status.last_update || 'unknown'}`);
      
      // Trigger processing
      console.log('🔄 Triggering processing batch...');
      const result = await triggerProcessing();
      
      if (result.processed && result.processed !== 'timeout') {
        totalProcessed += result.processed;
        console.log(`✅ Processed ${result.processed} domains this cycle`);
        console.log(`📈 Total processed: ${totalProcessed} domains`);
      } else {
        console.log(`⏳ ${result.message || 'Processing may be running in background'}`);
      }
      
      // Wait before next cycle
      console.log('⏰ Waiting 30 seconds before next cycle...');
      await new Promise(resolve => setTimeout(resolve, 30000));
      
      cycle++;
      
      // Stop after 20 cycles (10 minutes)
      if (cycle > 20) {
        console.log('🏁 Completed 20 processing cycles');
        break;
      }
      
    } catch (error) {
      console.error(`❌ Error in cycle ${cycle}:`, error.message);
      await new Promise(resolve => setTimeout(resolve, 10000)); // Wait 10s on error
    }
  }
  
  console.log(`\n🎉 Continuous processing completed!`);
  console.log(`📊 Total domains processed: ${totalProcessed}`);
}

// Start the continuous processing
runContinuousProcessing()
  .then(() => {
    console.log('✅ Processing session completed');
    process.exit(0);
  })
  .catch(error => {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  }); 