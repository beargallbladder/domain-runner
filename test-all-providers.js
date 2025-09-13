const { TensorSynchronizer } = require('./src/tensor-core/TensorSynchronizer');

async function testAllProviders() {
    console.log('🧪 Testing All 11 LLM Providers');
    console.log('==============================\n');
    
    const tensorSync = new TensorSynchronizer();
    
    // Wait for initialization
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const stats = tensorSync.getProviderStats();
    
    console.log(`📊 Provider Status Summary:`);
    console.log(`  Total Providers: ${stats.totalProviders}`);
    console.log(`  Healthy Providers: ${stats.healthyProviders}`);
    console.log(`  Failed Providers: ${stats.totalProviders - stats.healthyProviders}`);
    console.log('');
    
    stats.providers.forEach(provider => {
        const status = provider.status === 'healthy' ? '✅' : '❌';
        console.log(`${status} ${provider.name}: ${provider.status} (${provider.successRate} success rate)`);
    });
    
    console.log('\n🎯 Testing with sample domain...');
    
    try {
        const responses = await tensorSync.processWithTensorSync('example.com', 'Test prompt');
        const successful = responses.filter(r => r.success).length;
        
        console.log(`\n📈 Test Results:`);
        console.log(`  Successful responses: ${successful}/11`);
        console.log(`  Success rate: ${(successful/11*100).toFixed(1)}%`);
        
        if (successful >= 8) {
            console.log('🎉 TENSOR SYSTEM OPERATIONAL!');
            process.exit(0);
        } else {
            console.log('⚠️  Tensor system needs attention');
            process.exit(1);
        }
    } catch (error) {
        console.error('❌ Test failed:', error.message);
        process.exit(1);
    }
}

testAllProviders();
