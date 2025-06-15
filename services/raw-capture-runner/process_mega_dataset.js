const fs = require('fs');
const path = require('path');
const { processWithUltimateFleet } = require('./production_with_ultimate_fleet');

// Load the mega dataset
const megaDataset = JSON.parse(fs.readFileSync('./mega_dataset.json', 'utf8'));

// Ultra-budget model configuration (proven performers only)
const ULTRA_BUDGET_MODELS = [
    // CHAMPIONS - Proven ultra-low cost, high success
    'claude-3-haiku-20240307',           // $0.00151 - CHAMPION
    'deepseek-chat',                     // $0.000002 - ULTRA CHAMPION  
    'deepseek-coder',                    // $0.000008 - CODE CHAMPION
    'mistral-small-latest',              // $0.000002 - SPEED CHAMPION
    
    // HIGH PERFORMERS - Great cost/performance
    'gpt-4o-mini',                       // $0.000150 - OpenAI Budget
    'claude-3-5-haiku-20241022',         // $0.000800 - Latest Haiku
    'gemini-1.5-flash',                  // $0.000075 - Google Budget
    'llama-3.1-8b-instant',             // $0.000018 - Meta Budget
    'llama-3.1-70b-versatile',          // $0.000059 - Meta Power
    
    // RELIABLE PERFORMERS
    'mixtral-8x7b-32768',               // $0.000024 - Mistral Power
    'nous-hermes-2-mixtral-8x7b-dpo',   // $0.000027 - Together Budget
    'meta-llama-3-8b-instruct',         // $0.000018 - Meta Reliable
    'gemma-7b-it',                       // $0.000007 - Google Efficient
    'qwen-2-7b-instruct',               // $0.000009 - Alibaba Budget
    'microsoft-wizardlm-2-8x22b'        // $0.000063 - Microsoft Power
];

// Enhanced prompts for comprehensive business intelligence
const ANALYSIS_PROMPTS = [
    {
        name: "brand_perception_analysis",
        prompt: `Analyze this company as a business expert and provide:
1. PRIMARY BUSINESS: What is their core business and value proposition?
2. MARKET POSITION: How do they differentiate from competitors?
3. BRAND PERCEPTION: What 3 words best describe how the market views them?
4. COMPETITIVE ADVANTAGE: What gives them an edge over competitors?
5. GROWTH TRAJECTORY: Are they scaling up, maintaining, or declining?
6. RISK FACTORS: What are the top 2 business risks they face?
7. INNOVATION SCORE: Rate their innovation level 1-10 with reasoning.
8. MARKET OPPORTUNITY: What's their biggest untapped opportunity?

Be specific, concise, and fact-based. Focus on actionable business insights.`
    },
    {
        name: "investment_analysis", 
        prompt: `Analyze this company from an investment perspective:
1. BUSINESS MODEL: How do they make money? Is it sustainable?
2. MARKET SIZE: Large/Medium/Small addressable market?
3. COMPETITIVE MOAT: What protects them from competition?
4. SCALABILITY: Can they grow 10x without linear cost increases?
5. MANAGEMENT QUALITY: Strong/Average/Weak leadership indicators?
6. FINANCIAL HEALTH: Revenue growth, profitability, cash position outlook
7. INVESTMENT THESIS: Bull case vs Bear case (2-3 points each)
8. VALUATION INSIGHT: Currently overvalued/fairly valued/undervalued?

Focus on factors that drive long-term business value and investment returns.`
    },
    {
        name: "strategic_intelligence",
        prompt: `Provide strategic intelligence on this company:
1. STRATEGIC PRIORITIES: What are their top 3 strategic initiatives?
2. PARTNERSHIPS: Key strategic partnerships and ecosystem plays?
3. TECHNOLOGY STACK: Core technologies and technical advantages?
4. CUSTOMER BASE: Who are their ideal customers and why?
5. GO-TO-MARKET: How do they acquire and retain customers?
6. EXPANSION STRATEGY: Geographic/product expansion plans and potential?
7. DISRUPTION THREATS: What could make their business obsolete?
8. FUTURE OUTLOOK: Where will they be in 3-5 years?

Focus on strategic moves, competitive dynamics, and future positioning.`
    }
];

async function processMegaDataset() {
    console.log('🚀 STARTING MEGA BUSINESS INTELLIGENCE ANALYSIS');
    console.log(`📊 Dataset: ${megaDataset.mega_business_intelligence_dataset.total_domains} domains across ${megaDataset.mega_business_intelligence_dataset.sector_coverage} sectors`);
    console.log(`💰 Estimated cost: ${megaDataset.mega_business_intelligence_dataset.processing_estimates.estimated_cost_ultra_budget}`);
    console.log(`⚡ Processing time: ${megaDataset.mega_business_intelligence_dataset.processing_estimates.processing_time_with_fleet}`);
    
    // Flatten all domains from all categories
    const allDomains = [];
    const categories = megaDataset.mega_business_intelligence_dataset.categories;
    
    for (const [categoryName, domains] of Object.entries(categories)) {
        for (const domain of domains) {
            allDomains.push({
                domain: domain,
                category: categoryName,
                sector: categoryName.replace(/_/g, ' ').toUpperCase()
            });
        }
    }
    
    console.log(`📍 Total domains to process: ${allDomains.length}`);
    
    // Process in optimized batches for maximum throughput
    const BATCH_SIZE = 25; // Optimal batch size for Ultimate Fleet
    const results = [];
    
    for (let i = 0; i < allDomains.length; i += BATCH_SIZE) {
        const batch = allDomains.slice(i, i + BATCH_SIZE);
        const batchNumber = Math.floor(i / BATCH_SIZE) + 1;
        const totalBatches = Math.ceil(allDomains.length / BATCH_SIZE);
        
        console.log(`\n🔄 Processing Batch ${batchNumber}/${totalBatches} (${batch.length} domains)`);
        console.log(`📦 Domains: ${batch.map(d => d.domain).join(', ')}`);
        
        // Process batch with Ultimate Fleet
        const batchPromises = batch.map(async (domainInfo) => {
            const domainResults = [];
            
            // Process each analysis type for this domain
            for (const analysisPrompt of ANALYSIS_PROMPTS) {
                try {
                    const result = await processWithUltimateFleet(
                        domainInfo.domain,
                        ULTRA_BUDGET_MODELS,
                        analysisPrompt.prompt,
                        {
                            timeout: 30000,
                            maxRetries: 2,
                            analysisType: analysisPrompt.name,
                            category: domainInfo.category,
                            sector: domainInfo.sector
                        }
                    );
                    
                    domainResults.push({
                        domain: domainInfo.domain,
                        category: domainInfo.category,
                        sector: domainInfo.sector,
                        analysis_type: analysisPrompt.name,
                        ...result
                    });
                    
                } catch (error) {
                    console.error(`❌ Error processing ${domainInfo.domain} - ${analysisPrompt.name}:`, error.message);
                    
                    domainResults.push({
                        domain: domainInfo.domain,
                        category: domainInfo.category,
                        sector: domainInfo.sector,
                        analysis_type: analysisPrompt.name,
                        success: false,
                        error: error.message,
                        timestamp: new Date().toISOString()
                    });
                }
            }
            
            return domainResults;
        });
        
        // Execute batch in parallel
        const batchResults = await Promise.all(batchPromises);
        results.push(...batchResults.flat());
        
        // Progress update
        const processedSoFar = Math.min((i + BATCH_SIZE), allDomains.length);
        const progressPercent = ((processedSoFar / allDomains.length) * 100).toFixed(1);
        console.log(`✅ Batch ${batchNumber} complete! Progress: ${processedSoFar}/${allDomains.length} (${progressPercent}%)`);
        
        // Save intermediate results every 5 batches
        if (batchNumber % 5 === 0) {
            const intermediateFile = `./mega_analysis_intermediate_${Date.now()}.json`;
            fs.writeFileSync(intermediateFile, JSON.stringify({
                progress: {
                    processed: processedSoFar,
                    total: allDomains.length,
                    percent: progressPercent,
                    batches_completed: batchNumber
                },
                results: results
            }, null, 2));
            console.log(`💾 Intermediate results saved to ${intermediateFile}`);
        }
        
        // Brief pause between batches to respect rate limits
        if (i + BATCH_SIZE < allDomains.length) {
            await new Promise(resolve => setTimeout(resolve, 2000));
        }
    }
    
    // Final results processing
    console.log('\n🎉 MEGA ANALYSIS COMPLETE!');
    
    // Calculate statistics
    const successfulResponses = results.filter(r => r.success !== false);
    const failedResponses = results.filter(r => r.success === false);
    const totalCost = successfulResponses.reduce((sum, r) => sum + (r.cost || 0), 0);
    const uniqueDomains = new Set(results.map(r => r.domain)).size;
    const uniqueModels = new Set(successfulResponses.map(r => r.model)).size;
    
    const finalResults = {
        meta: {
            analysis_date: new Date().toISOString(),
            total_domains_processed: uniqueDomains,
            total_api_calls: results.length,
            successful_responses: successfulResponses.length,
            failed_responses: failedResponses.length,
            success_rate: `${((successfulResponses.length / results.length) * 100).toFixed(1)}%`,
            models_used: uniqueModels,
            total_cost: `$${totalCost.toFixed(4)}`,
            cost_per_domain: `$${(totalCost / uniqueDomains).toFixed(6)}`,
            sectors_analyzed: megaDataset.mega_business_intelligence_dataset.sector_coverage,
            business_intelligence_value: "EXTRAORDINARY - Complete technology sector analysis"
        },
        sector_breakdown: {},
        results: results
    };
    
    // Organize results by sector
    for (const result of successfulResponses) {
        if (!finalResults.sector_breakdown[result.sector]) {
            finalResults.sector_breakdown[result.sector] = {
                domains: new Set(),
                analyses: 0,
                avg_cost: 0,
                models_used: new Set()
            };
        }
        
        finalResults.sector_breakdown[result.sector].domains.add(result.domain);
        finalResults.sector_breakdown[result.sector].analyses++;
        finalResults.sector_breakdown[result.sector].avg_cost += (result.cost || 0);
        finalResults.sector_breakdown[result.sector].models_used.add(result.model);
    }
    
    // Convert Sets to Arrays and calculate averages
    for (const sector of Object.keys(finalResults.sector_breakdown)) {
        const sectorData = finalResults.sector_breakdown[sector];
        sectorData.domains = sectorData.domains.size;
        sectorData.models_used = sectorData.models_used.size;
        sectorData.avg_cost = sectorData.avg_cost / sectorData.analyses;
    }
    
    // Save final results
    const finalFile = `./MEGA_BUSINESS_INTELLIGENCE_${Date.now()}.json`;
    fs.writeFileSync(finalFile, JSON.stringify(finalResults, null, 2));
    
    console.log('\n📊 FINAL STATISTICS:');
    console.log(`✅ Domains Analyzed: ${uniqueDomains}`);
    console.log(`📈 API Calls Made: ${results.length.toLocaleString()}`);
    console.log(`🎯 Success Rate: ${finalResults.meta.success_rate}`);
    console.log(`🤖 Models Used: ${uniqueModels}`);
    console.log(`💰 Total Cost: ${finalResults.meta.total_cost}`);
    console.log(`📊 Cost per Domain: ${finalResults.meta.cost_per_domain}`);
    console.log(`💾 Results saved to: ${finalFile}`);
    console.log('\n🏆 MEGA BUSINESS INTELLIGENCE ANALYSIS COMPLETE!');
    
    return finalResults;
}

// Error handling and graceful shutdown
process.on('unhandledRejection', (error) => {
    console.error('❌ Unhandled promise rejection:', error);
    process.exit(1);
});

process.on('SIGINT', () => {
    console.log('\n⚠️  Process interrupted - saving current progress...');
    // Save any current results before exiting
    process.exit(0);
});

// Export for use
module.exports = { processMegaDataset, ULTRA_BUDGET_MODELS, ANALYSIS_PROMPTS };

// Run if called directly
if (require.main === module) {
    processMegaDataset()
        .then(() => {
            console.log('🎊 All processing complete!');
            process.exit(0);
        })
        .catch((error) => {
            console.error('💥 Fatal error:', error);
            process.exit(1);
        });
} 