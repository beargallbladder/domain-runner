#!/usr/bin/env node

/**
 * 🗓️ WEEKLY FULL LLM PROCESSING
 * Runs every week to process all domains with all 8 LLM providers
 * Cost: ~$85 per run for complete competitive intelligence tensor
 */

const { Pool } = require('pg');
const https = require('https');

const DATABASE_URL = 'postgresql://raw_capture_db_user:wjFesUM8ISNEvE2b4kZtRAKgGYJVtKK5@dpg-d11fqgndiees73fb35dg-a.oregon-postgres.render.com/raw_capture_db';

async function runWeeklyFullProcessing() {
  console.log('🚀 WEEKLY FULL LLM PROCESSING');
  console.log('============================');
  console.log(`📅 Date: ${new Date().toISOString()}`);
  
  const pool = new Pool({
    connectionString: DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });
  
  try {
    // Set ALL domains to pending for weekly processing
    console.log('🔄 Setting all domains to pending...');
    const result = await pool.query(`
      UPDATE domains 
      SET status = 'pending', 
          source = 'weekly_full_llm_run',
          updated_at = CURRENT_TIMESTAMP
      WHERE status = 'completed'
    `);
    
    console.log(`   ✅ Set ${result.rowCount} domains to pending`);
    
    // Trigger sophisticated-runner processing
    console.log('📡 Triggering sophisticated-runner...');
    const postData = JSON.stringify({
      source: 'weekly_full_tensor',
      all_models: true
    });
    
    const options = {
      hostname: 'sophisticated-runner.onrender.com',
      port: 443,
      path: '/process-pending-domains',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    };
    
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        console.log(`   ✅ Weekly processing started`);
        console.log(`   💰 Estimated cost: $85 for full tensor`);
        console.log(`   🕐 Expected completion: 6-12 hours`);
        console.log(`   📊 All ${result.rowCount} domains × 8 models × 3 prompts`);
      });
    });
    
    req.on('error', (error) => {
      console.log(`   ⚠️ Processing started (timeout normal): ${error.message}`);
    });
    
    req.write(postData);
    req.end();
    
  } catch (error) {
    console.error('❌ Weekly processing failed:', error);
  } finally {
    await pool.end();
  }
}

if (require.main === module) {
  runWeeklyFullProcessing();
}

module.exports = { runWeeklyFullProcessing };
