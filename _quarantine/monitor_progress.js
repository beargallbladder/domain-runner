const https = require('https');

async function checkStatus() {
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
          resolve(result);
        } catch (e) {
          resolve({ error: 'parse_error', raw: data });
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    req.end();
  });
}

async function monitorProgress() {
  console.log('🔍 DOMAIN PROCESSING MONITOR');
  console.log('============================');
  
  try {
    const status = await checkStatus();
    
    if (status.monitoring_stats) {
      const stats = status.monitoring_stats;
      console.log(`📊 Total domains monitored: ${stats.domains_monitored}`);
      console.log(`🔥 High risk domains: ${stats.high_risk_domains}`);
      console.log(`🚨 Active alerts: ${stats.active_alerts}`);
      console.log(`📅 Last update: ${stats.last_update}`);
      console.log(`✅ Data freshness: ${stats.data_freshness}`);
      
      if (status.total_users) {
        console.log(`👥 Total users: ${status.total_users}`);
      }
    }
    
    if (status.status === 'healthy') {
      console.log('\n🟢 System Status: HEALTHY');
      console.log('🚀 Continuous processing is running');
      console.log('⚡ Multi-provider API system active');
      console.log('🎯 All domains set to pending for processing');
    } else {
      console.log('\n🔴 System Status: ISSUES DETECTED');
    }
    
  } catch (error) {
    console.error('❌ Error checking status:', error.message);
  }
}

monitorProgress(); 