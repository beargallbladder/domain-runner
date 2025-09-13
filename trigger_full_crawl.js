#!/usr/bin/env node

const { Pool } = require('pg');

const DATABASE_URL = 'postgresql://raw_capture_db_user:wjFesUM8ISNEvE2b4kZtRAKgGYJVtKK5@dpg-d11fqgndiees73fb35dg-a.oregon-postgres.render.com/raw_capture_db';

async function triggerFullCrawl() {
    console.log('🚀 TRIGGERING FULL CRAWL - ALL DOMAINS');
    
    const pool = new Pool({
        connectionString: DATABASE_URL,
        ssl: { rejectUnauthorized: false }
    });
    
    try {
        // Set ALL domains to pending for weekly run
        console.log('📊 Setting ALL domains to pending for weekly crawl...');
        const weeklyResult = await pool.query(`
            UPDATE domains 
            SET status = 'pending', 
                source = 'weekly_full_crawl',
                updated_at = CURRENT_TIMESTAMP
            WHERE status = 'completed'
        `);
        
        console.log(`✅ WEEKLY: ${weeklyResult.rowCount} domains set to pending`);
        
        // Wait 5 seconds then trigger premium run
        setTimeout(async () => {
            console.log('💎 Setting ALL domains to pending for premium crawl...');
            const premiumResult = await pool.query(`
                UPDATE domains 
                SET status = 'pending', 
                    source = 'premium_full_crawl',
                    updated_at = CURRENT_TIMESTAMP
                WHERE status = 'completed'
            `);
            
            console.log(`✅ PREMIUM: ${premiumResult.rowCount} domains set to pending`);
            console.log('🎯 FULL CRAWL TRIGGERED - SOPHISTICATED RUNNER WILL PROCESS ALL DOMAINS');
            
            await pool.end();
        }, 5000);
        
    } catch (error) {
        console.error('❌ Error:', error);
        await pool.end();
    }
}

triggerFullCrawl(); 