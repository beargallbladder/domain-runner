const fetch = require('node-fetch');

async function checkDeploymentStatus() {
    console.log('📊 DEPLOYMENT STATUS CHECK');
    console.log('=========================\n');
    
    const endpoints = [
        'http://localhost:3000/health',
        'http://localhost:3000/providers',
        'http://localhost:3000/metrics'
    ];
    
    for (const endpoint of endpoints) {
        try {
            console.log(`Checking ${endpoint}...`);
            const response = await fetch(endpoint, { timeout: 5000 });
            
            if (response.ok) {
                console.log(`✅ ${endpoint} - OK (${response.status})`);
            } else {
                console.log(`❌ ${endpoint} - ERROR (${response.status})`);
            }
        } catch (error) {
            console.log(`❌ ${endpoint} - UNREACHABLE (${error.message})`);
        }
    }
    
    console.log('\n🎯 Dashboard URL: http://localhost:3000/dashboard');
}

checkDeploymentStatus();
