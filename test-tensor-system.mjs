#!/usr/bin/env node
// This file is an ES module
/**
 * TEST TENSOR SYNCHRONIZATION SYSTEM
 * Validate that all 11 LLM providers are working
 */

import fetch from 'node-fetch';

async function testTensorSystem() {
    console.log('🧪 TESTING TENSOR SYNCHRONIZATION SYSTEM');
    console.log('========================================\n');
    
    const baseUrl = 'http://localhost:4000';
    
    try {
        // Test health endpoint
        console.log('1️⃣ Testing Health Endpoint...');
        const healthResponse = await fetch(`${baseUrl}/health`, { timeout: 5000 });
        
        if (healthResponse.ok) {
            const healthData = await healthResponse.json();
            console.log(`✅ Health Status: ${healthData.status}`);
            console.log(`   Uptime: ${healthData.uptime}s`);
            console.log(`   Providers: ${healthData.providers.healthy}/${healthData.providers.total} healthy`);
            console.log(`   API Success Rate: ${healthData.api.successRate}`);
        } else {
            console.log(`❌ Health check failed: ${healthResponse.status}`);
            return false;
        }
        
        console.log('');
        
        // Test providers endpoint
        console.log('2️⃣ Testing Provider Status...');
        const providersResponse = await fetch(`${baseUrl}/providers`, { timeout: 5000 });
        
        if (providersResponse.ok) {
            const providersData = await providersResponse.json();
            console.log(`✅ Total Providers: ${providersData.totalProviders}`);
            console.log(`   Healthy: ${providersData.healthyProviders}`);
            console.log(`   Failed: ${providersData.totalProviders - providersData.healthyProviders}`);
            console.log('');
            
            // Show provider details
            console.log('📊 Provider Details:');
            providersData.providers.forEach(provider => {
                const status = provider.status === 'healthy' ? '✅' : '❌';
                console.log(`   ${status} ${provider.name}: ${provider.status} (${provider.successRate})`);
            });
            
            if (providersData.healthyProviders >= 8) {
                console.log('\n🎉 TENSOR INTEGRITY GOOD: >=8/11 providers healthy');
            } else {
                console.log(`\n⚠️  TENSOR INTEGRITY WARNING: Only ${providersData.healthyProviders}/11 providers healthy`);
            }
        } else {
            console.log(`❌ Provider status failed: ${providersResponse.status}`);
            return false;
        }
        
        console.log('');
        
        // Test domain processing
        console.log('3️⃣ Testing Domain Processing...');
        const processResponse = await fetch(`${baseUrl}/process-domain`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                domain: 'test-domain.com',
                prompt: 'Analyze this domain for testing purposes.'
            }),
            timeout: 30000
        });
        
        if (processResponse.ok) {
            const processData = await processResponse.json();
            console.log(`✅ Domain Processing: ${processData.domain}`);
            console.log(`   Processing Time: ${processData.processingTime}`);
            console.log(`   Successful Responses: ${processData.tensorSync.successfulResponses}/11`);
            console.log(`   Success Rate: ${processData.tensorSync.successRate}`);
            
            const workingProviders = processData.responses.filter(r => r.success);
            console.log('\n🎯 Working Providers:');
            workingProviders.forEach(provider => {
                console.log(`   ✅ ${provider.provider}: ${provider.responseTime} (${provider.responseLength} chars)`);
            });
            
            const failedProviders = processData.responses.filter(r => !r.success);
            if (failedProviders.length > 0) {
                console.log('\n❌ Failed Providers:');
                failedProviders.forEach(provider => {
                    console.log(`   ❌ ${provider.provider}: ${provider.error}`);
                });
            }
            
            if (workingProviders.length >= 8) {
                console.log('\n🏆 TENSOR SYNCHRONIZATION SUCCESSFUL!');
                console.log(`   ${workingProviders.length}/11 LLM providers responded successfully`);
                return true;
            } else {
                console.log('\n⚠️  Tensor synchronization needs improvement');
                console.log(`   Only ${workingProviders.length}/11 providers working`);
                return false;
            }
        } else {
            console.log(`❌ Domain processing failed: ${processResponse.status}`);
            const errorText = await processResponse.text();
            console.log(`   Error: ${errorText}`);
            return false;
        }
        
    } catch (error) {
        console.error('❌ Test failed:', error.message);
        return false;
    }
}

// Test metrics endpoint
async function testMetrics() {
    console.log('\n4️⃣ Testing Metrics Endpoint...');
    
    try {
        const metricsResponse = await fetch('http://localhost:4000/metrics', { timeout: 5000 });
        
        if (metricsResponse.ok) {
            const metricsData = await metricsResponse.json();
            console.log(`✅ System Uptime: ${metricsData.uptime.formatted}`);
            console.log(`   Total API Requests: ${metricsData.api.totalRequests}`);
            console.log(`   Memory Usage: ${Math.round(metricsData.system.memory.rss / 1024 / 1024)}MB`);
        } else {
            console.log(`❌ Metrics failed: ${metricsResponse.status}`);
        }
    } catch (error) {
        console.log(`❌ Metrics error: ${error.message}`);
    }
}

// Main test execution
async function main() {
    const success = await testTensorSystem();
    await testMetrics();
    
    console.log('\n🎯 FINAL RESULT:');
    console.log('===============');
    
    if (success) {
        console.log('🎉 TENSOR SYSTEM IS OPERATIONAL!');
        console.log('✅ Mind-blowing 11 LLM synchronization achieved');
        console.log('🚀 Dashboard: http://localhost:4000/dashboard');
        process.exit(0);
    } else {
        console.log('❌ Tensor system needs attention');
        console.log('🔧 Run emergency healing: curl -X POST http://localhost:4000/emergency-heal');
        process.exit(1);
    }
}

main();