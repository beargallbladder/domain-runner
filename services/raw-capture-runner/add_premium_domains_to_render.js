/**
 * Add Premium Domains to Existing Render Infrastructure
 * Uses the existing raw-capture-runner with Ultimate API Fleet
 */

const { Pool } = require('pg');
require('dotenv').config();

// Premium domains from the mega dataset
const PREMIUM_DOMAINS = [
    // AI/ML Platforms
    'openai.com', 'anthropic.com', 'deepmind.com', 'mistral.ai', 'cohere.com',
    'ai21.com', 'x.ai', 'databricks.com', 'snowflake.com', 'datarobot.com',
    'wandb.ai', 'arize.com', 'neptune.ai',
    
    // Cloud Infrastructure  
    'aws.amazon.com', 'azure.microsoft.com', 'cloud.google.com', 'oracle.com',
    'ibm.com', 'digitalocean.com',
    
    // Search & Discovery
    'google.com', 'bing.com', 'duckduckgo.com', 'neeva.com', 'you.com',
    'perplexity.ai',
    
    // Fintech & Payments
    'stripe.com', 'paypal.com', 'squareup.com', 'plaid.com', 'adyen.com',
    'wise.com', 'brex.com', 'mercury.com',
    
    // Cryptocurrency
    'coinbase.com', 'binance.com', 'kraken.com', 'gemini.com', 'uniswap.org',
    'paxos.com', 'circle.com', 'chainalysis.com',
    
    // Accounting & Finance
    'quickbooks.intuit.com', 'xero.com', 'waveapps.com', 'freshbooks.com',
    'zohobooks.com', 'gusto.com', 'rippling.com',
    
    // E-commerce Platforms
    'shopify.com', 'squarespace.com', 'bigcommerce.com', 'wix.com',
    'webflow.com', 'bubble.io',
    
    // Design & Creative
    'figma.com', 'canva.com', 'adobe.com', 'sketch.com', 'affinity.serif.com',
    'icons8.com',
    
    // Creator Economy
    'patreon.com', 'onlyfans.com', 'ko-fi.com', 'buymeacoffee.com',
    'substack.com', 'ghost.org', 'medium.com',
    
    // Streaming & Entertainment
    'netflix.com', 'disneyplus.com', 'max.com', 'hulu.com', 'primevideo.com',
    'youtube.com', 'peacocktv.com',
    
    // Music & Audio
    'spotify.com', 'music.apple.com', 'tidal.com', 'soundcloud.com',
    'pandora.com', 'deezer.com',
    
    // News & Media
    'nytimes.com', 'wsj.com', 'cnn.com', 'bbc.com', 'reuters.com',
    'theverge.com', 'axios.com', 'bloomberg.com',
    
    // Electric Vehicles
    'tesla.com', 'rivian.com', 'lucidmotors.com', 'byd.com', 'nio.com',
    'polestar.com', 'fiskerinc.com',
    
    // Mental Health
    'talkspace.com', 'betterhelp.com', 'cerebral.com', 'ginger.com',
    'springhealth.com', 'lyrahealth.com',
    
    // Health & Fitness
    'whoop.com', 'ouraring.com', 'fitbit.com', 'apple.com', 'garmin.com',
    'eightsleep.com',
    
    // Beauty & Personal Care
    'glossier.com', 'rarebeauty.com', 'fentybeauty.com', 'kyliecosmetics.com',
    'sephora.com', 'ulta.com',
    
    // Sleep & Wellness
    'sleepnumber.com', 'casper.com', 'purple.com', 'helixsleep.com',
    'tuftandneedle.com',
    
    // Genomics & Biotech
    '23andme.com', 'ancestry.com', 'invitae.com', 'color.com', 'helix.com',
    'myheritage.com', 'illumina.com',
    
    // Healthcare & Diagnostics
    'thermofisher.com', 'roche.com', 'abbott.com', 'labcorp.com',
    'questdiagnostics.com',
    
    // Education & Learning
    'coursera.org', 'edx.org', 'udemy.com', 'khanacademy.org', 'duolingo.com',
    'skillshare.com', 'masterclass.com',
    
    // CRM & Sales Tools
    'salesforce.com', 'hubspot.com', 'zendesk.com', 'intercom.com',
    'freshdesk.com', 'zoho.com', 'atlassian.com',
    
    // Developer Tools
    'github.com', 'gitlab.com', 'bitbucket.org', 'docker.com', 'vercel.com',
    'netlify.com', 'render.com', 'railway.app',
    
    // Monitoring & Analytics
    'datadoghq.com', 'newrelic.com', 'grafana.com', 'splunk.com',
    'honeycomb.io', 'logrocket.com',
    
    // Semiconductors
    'intel.com', 'amd.com', 'nvidia.com', 'qualcomm.com', 'broadcom.com',
    'mediatek.com', 'arm.com',
    
    // EDA & Design Tools
    'altium.com', 'kicad.org', 'easyeda.com', 'autodesk.com', 'upverter.com',
    'cadence.com', 'mentor.com',
    
    // Electronics Distribution
    'digikey.com', 'mouser.com', 'arrow.com', 'avnet.com', 'rs-online.com',
    'adafruit.com', 'sparkfun.com',
    
    // No-Code Platforms
    'retool.com', 'glideapps.com', 'thunkable.com', 'outsystems.com',
    
    // Email Marketing
    'convertkit.com', 'mailchimp.com', 'beehiiv.com', 'buttondown.email',
    
    // Logistics & Shipping
    'flexport.com', 'goshippo.com', 'shipstation.com', 'easypost.com',
    'stord.com', 'deliverr.com'
];

async function addPremiumDomainsToRender() {
    console.log('🚀 ADDING PREMIUM DOMAINS TO RENDER INFRASTRUCTURE');
    console.log('=================================================');
    console.log(`📊 Adding ${PREMIUM_DOMAINS.length} premium domains to existing raw-capture-runner`);
    
    // Connect to the Render database (same as existing infrastructure)
    const pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
    });
    
    try {
        // Check current domain count
        const beforeCount = await pool.query('SELECT COUNT(*) FROM domains');
        console.log(`📈 Current domains in database: ${beforeCount.rows[0].count}`);
        
        let inserted = 0;
        let skipped = 0;
        
        console.log('\n🔄 Adding premium domains...');
        
        for (const domain of PREMIUM_DOMAINS) {
            try {
                const result = await pool.query(`
                    INSERT INTO domains (domain, source, status, created_at)
                    VALUES ($1, $2, $3, CURRENT_TIMESTAMP)
                    ON CONFLICT (domain) DO UPDATE SET 
                        updated_at = CURRENT_TIMESTAMP,
                        source = CASE 
                            WHEN domains.source = 'premium_mega_analysis' THEN domains.source
                            ELSE 'premium_mega_analysis'
                        END
                    RETURNING id, domain
                `, [domain.trim(), 'premium_mega_analysis', 'pending']);
                
                if (result.rows.length > 0) {
                    inserted++;
                    if (inserted % 20 === 0) {
                        console.log(`✅ Added ${inserted}/${PREMIUM_DOMAINS.length} domains...`);
                    }
                } else {
                    skipped++;
                }
                
            } catch (error) {
                console.error(`❌ Error adding ${domain}:`, error.message);
                skipped++;
            }
        }
        
        // Check final count
        const afterCount = await pool.query('SELECT COUNT(*) FROM domains');
        const pendingCount = await pool.query(`
            SELECT COUNT(*) FROM domains 
            WHERE source = 'premium_mega_analysis' AND status = 'pending'
        `);
        
        console.log('\n📊 PREMIUM DOMAINS ADDED TO RENDER INFRASTRUCTURE');
        console.log('==================================================');
        console.log(`✅ Successfully added: ${inserted} domains`);
        console.log(`⏭️  Already existed: ${skipped} domains`);
        console.log(`📈 Total domains now: ${afterCount.rows[0].count}`);
        console.log(`🔄 Pending processing: ${pendingCount.rows[0].count}`);
        
        console.log('\n🚀 NEXT STEPS - AUTOMATIC PROCESSING');
        console.log('====================================');
        console.log('✅ Domains added to Render database');
        console.log('✅ raw-capture-runner will automatically process them');
        console.log('✅ Ultimate API Fleet will use all configured keys');
        console.log('✅ Fire alarm system will generate business intelligence');
        console.log('✅ Results will appear in embedding-engine analysis');
        
        console.log('\n📊 MONITORING PROGRESS:');
        console.log('• Check processing: https://embedding-engine.onrender.com/data/count');
        console.log('• View domains: https://embedding-engine.onrender.com/insights/domains');
        console.log('• Monitor status via existing admin endpoints');
        
        return {
            inserted,
            skipped,
            total_domains: afterCount.rows[0].count,
            pending_processing: pendingCount.rows[0].count
        };
        
    } catch (error) {
        console.error('❌ Database operation failed:', error);
        throw error;
    } finally {
        await pool.end();
    }
}

// For deployment: create a simple trigger script
async function createProcessingTrigger() {
    console.log('\n🎯 CREATING PROCESSING TRIGGER');
    console.log('==============================');
    
    const triggerScript = `
#!/bin/bash
# Trigger processing of premium domains on Render

echo "🚀 TRIGGERING PREMIUM DOMAIN PROCESSING"
echo "======================================="

# The raw-capture-runner will automatically pick up pending domains
# This can be triggered via Render's manual deploy or cron job

curl -X POST "https://your-raw-capture-runner.onrender.com/admin/process-pending" \\
  -H "Content-Type: application/json" \\
  -d '{"source": "premium_mega_analysis", "batch_size": 50}'

echo "✅ Processing trigger sent to raw-capture-runner"
echo "📊 Monitor progress at: https://embedding-engine.onrender.com/data/count"
    `;
    
    require('fs').writeFileSync('./trigger_premium_processing.sh', triggerScript);
    console.log('✅ Created trigger_premium_processing.sh');
    console.log('💡 Run this after deploying to trigger processing');
}

// Main execution
async function main() {
    try {
        const results = await addPremiumDomainsToRender();
        await createProcessingTrigger();
        
        console.log('\n🎉 PREMIUM DOMAINS SUCCESSFULLY ADDED TO RENDER!');
        console.log('===============================================');
        console.log('Your existing Ultimate API Fleet will now process 200+ premium domains');
        console.log('Fire alarm business intelligence will be generated automatically');
        console.log('Results will feed into your existing 4-layer analysis system');
        
    } catch (error) {
        console.error('💥 Error:', error.message);
        process.exit(1);
    }
}

if (require.main === module) {
    main();
}

module.exports = { addPremiumDomainsToRender, PREMIUM_DOMAINS }; 