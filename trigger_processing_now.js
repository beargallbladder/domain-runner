const https = require('https');

async function triggerProcessing() {
  console.log('🚀 Triggering domain processing immediately...');
  
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
    timeout: 30000
  };

  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        console.log(`Status: ${res.statusCode}`);
        console.log('Response:', data);
        resolve(data);
      });
    });

    req.on('error', (error) => {
      console.error('Error:', error);
      reject(error);
    });

    req.on('timeout', () => {
      console.log('Request timed out, but processing may have started...');
      req.destroy();
      resolve('timeout');
    });

    req.write(postData);
    req.end();
  });
}

// Run it
triggerProcessing()
  .then(result => {
    console.log('✅ Processing triggered successfully');
    process.exit(0);
  })
  .catch(error => {
    console.error('❌ Failed to trigger processing:', error);
    process.exit(1);
  }); 