const fetch = require('node-fetch');

async function integrationTest() {
    console.log('🔧 Integration Test - API Endpoints');
    console.log('==================================\n');
    
    const baseUrl = 'http://localhost:3000';
    
    try {
        // Test health endpoint
        console.log('Testing /health endpoint...');
        const healthResponse = await fetch(`${baseUrl}/health`);
        const healthData = await healthResponse.json();
        console.log(`✅ Health: ${healthData.status} (${healthData.providers.healthy}/${healthData.providers.total} providers)`);
        
        // Test providers endpoint
        console.log('Testing /providers endpoint...');
        const providersResponse = await fetch(`${baseUrl}/providers`);
        const providersData = await providersResponse.json();
        console.log(`✅ Providers: ${providersData.healthyProviders}/${providersData.totalProviders} healthy`);
        
        // Test process-domain endpoint
        console.log('Testing /process-domain endpoint...');
        const processResponse = await fetch(`${baseUrl}/process-domain`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ domain: 'test.com', prompt: 'Integration test' })
        });
        const processData = await processResponse.json();
        console.log(`✅ Process Domain: ${processData.tensorSync.successfulResponses}/11 successful`);
        
        console.log('\n🎉 All integration tests passed!');
        
    } catch (error) {
        console.error('❌ Integration test failed:', error.message);
        process.exit(1);
    }
}

// Only run if server is running
setTimeout(integrationTest, 1000);
