#!/usr/bin/env node
/**
 * TEST RENDER DEPLOYMENT - Check ACTUAL LLM API keys
 * This tests the REAL deployment on Render, not local bullshit
 */

const fetch = require('node-fetch');

async function testRenderLLMs() {
    console.log('🎯 TESTING ACTUAL RENDER DEPLOYMENT');
    console.log('===================================\n');
    
    // The REAL deployment URL
    const RENDER_URL = 'https://domain-runner.onrender.com';
    
    console.log(`Testing: ${RENDER_URL}\n`);
    
    try {
        // First check if service is healthy
        console.log('1️⃣ Checking service health...');
        const healthResponse = await fetch(`${RENDER_URL}/health`, { 
            timeout: 10000,
            headers: { 'User-Agent': 'LLM-Tester/1.0' }
        });
        
        if (healthResponse.ok) {
            const health = await healthResponse.json();
            console.log(`✅ Service Status: ${health.status || 'OK'}`);
            console.log(`   Timestamp: ${health.timestamp || new Date().toISOString()}`);
        } else {
            console.log(`❌ Health check failed: ${healthResponse.status}`);
        }
        
        // Test the /test-all-keys endpoint I added
        console.log('\n2️⃣ Testing all LLM API keys on Render...');
        const testKeysResponse = await fetch(`${RENDER_URL}/test-all-keys`, {
            timeout: 60000, // 60 second timeout for all tests
            headers: { 'User-Agent': 'LLM-Tester/1.0' }
        });
        
        if (testKeysResponse.ok) {
            const results = await testKeysResponse.json();
            
            console.log('\n📊 LLM API KEY TEST RESULTS:');
            console.log('============================\n');
            
            let workingCount = 0;
            let failedCount = 0;
            
            // Sort providers by status for cleaner output
            const sortedResults = Object.entries(results).sort((a, b) => {
                if (a[1].success && !b[1].success) return -1;
                if (!a[1].success && b[1].success) return 1;
                return 0;
            });
            
            sortedResults.forEach(([provider, result]) => {
                if (result.success) {
                    console.log(`✅ ${provider}: WORKING`);
                    console.log(`   Response: ${result.response?.substring(0, 100)}...`);
                    workingCount++;
                } else {
                    console.log(`❌ ${provider}: FAILED`);
                    console.log(`   Error: ${result.error}`);
                    failedCount++;
                }
                console.log('');
            });
            
            console.log('📈 SUMMARY:');
            console.log(`   Working: ${workingCount}/11 (${(workingCount/11*100).toFixed(1)}%)`);
            console.log(`   Failed: ${failedCount}/11`);
            
            if (workingCount < 11) {
                console.log('\n🔧 SPECIFIC FIXES NEEDED:');
                sortedResults.forEach(([provider, result]) => {
                    if (!result.success) {
                        if (result.error.includes('401') || result.error.includes('Unauthorized') || result.error.includes('API key')) {
                            console.log(`   ${provider}: Need valid API key on Render`);
                        } else if (result.error.includes('billing') || result.error.includes('quota')) {
                            console.log(`   ${provider}: Billing/quota issue`);
                        } else if (result.error.includes('404')) {
                            console.log(`   ${provider}: Wrong endpoint or model`);
                        } else {
                            console.log(`   ${provider}: ${result.error}`);
                        }
                    }
                });
            }
            
            return { workingCount, failedCount, results };
            
        } else {
            console.log(`❌ Test endpoint not found or failed: ${testKeysResponse.status}`);
            console.log('   The /test-all-keys endpoint may not be deployed yet');
            
            // Fallback: test with domain processing
            console.log('\n3️⃣ Fallback: Testing with actual domain processing...');
            const processResponse = await fetch(`${RENDER_URL}/process-domain`, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'User-Agent': 'LLM-Tester/1.0'
                },
                body: JSON.stringify({
                    domain_id: 1,
                    domain: 'test.com',
                    prompt: 'Test LLM availability'
                }),
                timeout: 30000
            });
            
            if (processResponse.ok) {
                const result = await processResponse.json();
                console.log(`✅ Domain processing initiated`);
                console.log(`   Check database for results`);
            } else {
                console.log(`❌ Domain processing failed: ${processResponse.status}`);
            }
        }
        
    } catch (error) {
        console.error('❌ Test failed:', error.message);
        if (error.message.includes('ECONNREFUSED')) {
            console.log('\n⚠️  Cannot connect to Render service');
            console.log('   Make sure domain-runner.onrender.com is running');
        }
    }
}

async function checkDatabaseResults() {
    console.log('\n4️⃣ Checking database for actual results...');
    
    // This would connect to the PostgreSQL database
    // For now, just show the connection string
    console.log('Database: postgresql://raw_capture_db_user:***@dpg-d11fqgndiees73fb35dg-a.oregon-postgres.render.com/raw_capture_db');
    console.log('Run SQL: SELECT provider, COUNT(*) FROM llm_responses WHERE created_at > NOW() - INTERVAL \'1 hour\' GROUP BY provider;');
}

// Main execution
async function main() {
    const results = await testRenderLLMs();
    await checkDatabaseResults();
    
    console.log('\n🎯 FINAL VERDICT:');
    console.log('=================');
    
    if (results && results.workingCount >= 8) {
        console.log('✅ Tensor system is mostly operational');
        console.log(`   ${results.workingCount}/11 LLMs working on Render`);
    } else {
        console.log('❌ Tensor system needs attention');
        console.log('   Update the API keys on Render environment variables');
    }
}

main();