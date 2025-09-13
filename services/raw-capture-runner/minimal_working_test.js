const dotenv = require('dotenv');
dotenv.config();

// Simple test with only available OpenAI key
async function testOpenAIOnly() {
    console.log('🧪 TESTING MINIMAL WORKING CONFIGURATION');
    console.log('======================================');
    
    try {
        const OpenAI = require('openai');
        const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
        
        console.log('🚀 Testing OpenAI API call...');
        
        const completion = await client.chat.completions.create({
            model: 'gpt-4o-mini',
            messages: [{ role: 'user', content: 'Analyze tesla.com: What is their primary business model?' }],
            max_tokens: 200,
            temperature: 0.7
        });
        
        const response = completion.choices[0]?.message?.content || 'No response';
        const usage = completion.usage || {};
        
        console.log('✅ SUCCESS! OpenAI API is working');
        console.log('📊 Response:', response.substring(0, 150) + '...');
        console.log('💰 Tokens used:', usage.total_tokens || 0);
        console.log('📈 Cost estimate:', ((usage.prompt_tokens || 0) * 0.00015 + (usage.completion_tokens || 0) * 0.0006) / 1000);
        
        return true;
        
    } catch (error) {
        console.error('❌ OpenAI API test failed:', error.message);
        return false;
    }
}

async function runMinimalMegaAnalysis() {
    console.log('\n🎯 RUNNING MINIMAL MEGA ANALYSIS');
    console.log('================================');
    
    // Test with just a few key domains using only OpenAI
    const testDomains = [
        'openai.com',
        'tesla.com', 
        'apple.com',
        'google.com',
        'microsoft.com'
    ];
    
    const results = [];
    
    for (const domain of testDomains) {
        try {
            console.log(`🚀 Processing ${domain}...`);
            
            const OpenAI = require('openai');
            const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
            
            const completion = await client.chat.completions.create({
                model: 'gpt-4o-mini',
                messages: [{ 
                    role: 'user', 
                    content: `Analyze ${domain}: What is their primary business model and competitive advantage? Be concise (2-3 sentences).` 
                }],
                max_tokens: 150,
                temperature: 0.7
            });
            
            const response = completion.choices[0]?.message?.content || 'No response';
            const usage = completion.usage || {};
            const cost = ((usage.prompt_tokens || 0) * 0.00015 + (usage.completion_tokens || 0) * 0.0006) / 1000;
            
            results.push({
                domain: domain,
                success: true,
                response: response,
                tokens: usage.total_tokens || 0,
                cost: cost
            });
            
            console.log(`✅ ${domain} completed successfully`);
            
        } catch (error) {
            console.error(`❌ Error processing ${domain}:`, error.message);
            results.push({
                domain: domain,
                success: false,
                error: error.message
            });
        }
        
        // Brief pause between requests
        await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    // Summary
    const successful = results.filter(r => r.success);
    const failed = results.filter(r => !r.success);
    const totalCost = successful.reduce((sum, r) => sum + (r.cost || 0), 0);
    
    console.log('\n📊 MINIMAL ANALYSIS RESULTS:');
    console.log('============================');
    console.log(`✅ Successful: ${successful.length}/${results.length}`);
    console.log(`❌ Failed: ${failed.length}/${results.length}`);
    console.log(`💰 Total Cost: $${totalCost.toFixed(6)}`);
    console.log(`📈 Average Cost per Domain: $${(totalCost / successful.length).toFixed(6)}`);
    
    if (successful.length > 0) {
        console.log('\n🎯 SAMPLE RESULTS:');
        successful.slice(0, 2).forEach(result => {
            console.log(`\n${result.domain}:`);
            console.log(`"${result.response.substring(0, 100)}..."`);
        });
    }
    
    return results;
}

// Run the tests
async function main() {
    const openaiWorking = await testOpenAIOnly();
    
    if (openaiWorking) {
        console.log('\n🎉 OpenAI is working! Running minimal mega analysis...');
        await runMinimalMegaAnalysis();
        
        console.log('\n🔧 NEXT STEPS:');
        console.log('1. Add more API keys to .env file for full Ultimate Fleet');
        console.log('2. Re-run mega analysis with expanded key set');
        console.log('3. Full 200+ domain analysis will work once keys are added');
        
    } else {
        console.log('\n❌ OpenAI test failed. Please check your API key configuration.');
    }
}

main().catch(console.error); 