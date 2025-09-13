#!/usr/bin/env node

/**
 * TRIGGER WEEKLY & PREMIUM RUNS
 * Add domains with 'pending' status to trigger sophisticated-runner processing
 */

const { Pool } = require('pg');

// Weekly Budget Models - 7 cheapest models
const WEEKLY_BUDGET_DOMAINS = [
    'openai.com', 'anthropic.com', 'google.com', 'microsoft.com', 'apple.com',
    'tesla.com', 'nvidia.com', 'meta.com', 'amazon.com', 'netflix.com',
    'stripe.com', 'shopify.com', 'salesforce.com', 'adobe.com', 'github.com',
    'figma.com', 'canva.com', 'spotify.com', 'coinbase.com', 'paypal.com',
    'nytimes.com', 'wsj.com', 'cnn.com', 'bloomberg.com', 'reuters.com'
];

// Premium Models - 3 most expensive models  
const PREMIUM_DOMAINS = [
    'deepmind.com', 'mistral.ai', 'cohere.com', 'x.ai', 'databricks.com',
    'snowflake.com', 'aws.amazon.com', 'azure.microsoft.com', 'cloud.google.com',
    'binance.com', 'kraken.com', 'gemini.com', 'quickbooks.intuit.com', 'xero.com'
];

// Use the sophisticated runner's database connection
const DATABASE_URL = 'postgresql://raw_capture_db_user:wjFesUM8ISNEvE2b4kZtRAKgGYJVtKK5@dpg-d11fqgndiees73fb35dg-a.oregon-postgres.render.com/raw_capture_db';

async function triggerWeeklyRun() {
    console.log('🚀 TRIGGERING WEEKLY BUDGET RUN');
    console.log('===============================');
    console.log(`📊 Adding ${WEEKLY_BUDGET_DOMAINS.length} domains for weekly processing`);
    
    const pool = new Pool({
        connectionString: DATABASE_URL,
        ssl: { rejectUnauthorized: false }
    });
    
    try {
        let inserted = 0;
        
        for (const domain of WEEKLY_BUDGET_DOMAINS) {
            try {
                await pool.query(`
                    INSERT INTO domains (domain, source, status, created_at, updated_at)
                    VALUES ($1, $2, $3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
                    ON CONFLICT (domain) DO UPDATE SET 
                        status = 'pending',
                        updated_at = CURRENT_TIMESTAMP,
                        source = 'weekly_budget_run'
                `, [domain.trim(), 'weekly_budget_run', 'pending']);
                
                inserted++;
                console.log(`✅ ${domain} - ready for weekly processing`);
                
            } catch (error) {
                console.error(`❌ Error adding ${domain}:`, error.message);
            }
        }
        
        console.log(`\n🎯 WEEKLY RUN TRIGGERED: ${inserted} domains set to pending`);
        console.log('📡 Sophisticated-runner will automatically process them with 7 budget models');
        
    } catch (error) {
        console.error('❌ Weekly run trigger failed:', error);
    } finally {
        await pool.end();
    }
}

async function triggerPremiumRun() {
    console.log('\n💎 TRIGGERING PREMIUM RUN');
    console.log('=========================');
    console.log(`📊 Adding ${PREMIUM_DOMAINS.length} domains for premium processing`);
    
    const pool = new Pool({
        connectionString: DATABASE_URL,
        ssl: { rejectUnauthorized: false }
    });
    
    try {
        let inserted = 0;
        
        for (const domain of PREMIUM_DOMAINS) {
            try {
                await pool.query(`
                    INSERT INTO domains (domain, source, status, created_at, updated_at)
                    VALUES ($1, $2, $3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
                    ON CONFLICT (domain) DO UPDATE SET 
                        status = 'pending',
                        updated_at = CURRENT_TIMESTAMP,
                        source = 'premium_run'
                `, [domain.trim(), 'premium_run', 'pending']);
                
                inserted++;
                console.log(`✅ ${domain} - ready for premium processing`);
                
            } catch (error) {
                console.error(`❌ Error adding ${domain}:`, error.message);
            }
        }
        
        console.log(`\n💎 PREMIUM RUN TRIGGERED: ${inserted} domains set to pending`);
        console.log('📡 Sophisticated-runner will automatically process them with 15 models');
        
    } catch (error) {
        console.error('❌ Premium run trigger failed:', error);
    } finally {
        await pool.end();
    }
}

async function main() {
    const args = process.argv.slice(2);
    
    if (args.includes('weekly') || args.length === 0) {
        await triggerWeeklyRun();
    }
    
    if (args.includes('premium') || args.length === 0) {
        await triggerPremiumRun();
    }
    
    console.log('\n🎉 DATA COLLECTION TRIGGERED!');
    console.log('============================');
    console.log('✅ Domains added with pending status');
    console.log('✅ Sophisticated-runner will process them automatically');
    console.log('✅ Real LLM API calls will be made');
    console.log('✅ Data will be stored in the database');
    console.log('\n📊 Monitor progress:');
    console.log('• Health: https://sophisticated-runner.onrender.com/health');
    console.log('• Data: https://llm-pagerank-public-api.onrender.com/health');
}

if (require.main === module) {
    main().catch(console.error);
}

module.exports = { triggerWeeklyRun, triggerPremiumRun }; 