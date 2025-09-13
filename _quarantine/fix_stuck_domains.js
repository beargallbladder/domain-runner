#!/usr/bin/env node

const { Pool } = require('pg');

// Production database connection
const DATABASE_URL = "postgresql://raw_capture_db_user:wjFesUM8ISNEvE2b4kZtRAKgGYJVtKK5@dpg-d11fqgndiees73fb35dg-a.oregon-postgres.render.com/raw_capture_db";

// The 6 stuck domains identified
const STUCK_DOMAINS = [
  'lucidmotors.com',
  'cruise.com', 
  'altos.com',
  'unity-biotechnology.com',
  'threads.net',
  'synthesia.io'
];

async function fixStuckDomains() {
  console.log('🔧 FIXING STUCK DOMAINS');
  console.log('=======================');
  console.log(`Target domains: ${STUCK_DOMAINS.join(', ')}`);
  console.log('');
  
  const pool = new Pool({
    connectionString: DATABASE_URL,
    ssl: { rejectUnauthorized: false },
    max: 1,
    connectionTimeoutMillis: 10000
  });
  
  try {
    // Test connection
    await pool.query('SELECT NOW()');
    console.log('✅ Database connected successfully');
    
    // First, let's verify these domains are actually stuck
    console.log('\n🔍 VERIFYING STUCK DOMAINS:');
    console.log('============================');
    
    const verifyQuery = `
      SELECT 
        domain,
        status,
        last_processed_at,
        process_count,
        error_count,
        EXTRACT(EPOCH FROM (NOW() - last_processed_at))/3600 as hours_stuck
      FROM domains 
      WHERE domain = ANY($1) AND status = 'processing'
      ORDER BY domain
    `;
    
    const verifyResult = await pool.query(verifyQuery, [STUCK_DOMAINS]);
    
    if (verifyResult.rows.length === 0) {
      console.log('✅ No stuck domains found - they may have been fixed already!');
      return;
    }
    
    console.log(`Found ${verifyResult.rows.length} stuck domains:`);
    verifyResult.rows.forEach((domain, index) => {
      console.log(`${index + 1}. ${domain.domain} - stuck for ${parseFloat(domain.hours_stuck).toFixed(1)} hours`);
    });
    
    // Reset the stuck domains to pending
    console.log('\n🔄 RESETTING STUCK DOMAINS TO PENDING:');
    console.log('======================================');
    
    const resetQuery = `
      UPDATE domains 
      SET 
        status = 'pending',
        last_processed_at = NULL,
        updated_at = CURRENT_TIMESTAMP,
        process_count = process_count + 1
      WHERE domain = ANY($1) AND status = 'processing'
      RETURNING domain, process_count
    `;
    
    const resetResult = await pool.query(resetQuery, [STUCK_DOMAINS]);
    
    if (resetResult.rows.length > 0) {
      console.log(`✅ Successfully reset ${resetResult.rows.length} domains to pending:`);
      resetResult.rows.forEach((domain, index) => {
        console.log(`${index + 1}. ${domain.domain} (attempt #${domain.process_count})`);
      });
    } else {
      console.log('⚠️  No domains were reset (may have been fixed already)');
    }
    
    // Verify the fix
    console.log('\n✅ VERIFICATION:');
    console.log('================');
    
    const finalVerifyQuery = `
      SELECT 
        status,
        COUNT(*) as count
      FROM domains 
      WHERE domain = ANY($1)
      GROUP BY status
      ORDER BY status
    `;
    
    const finalResult = await pool.query(finalVerifyQuery, [STUCK_DOMAINS]);
    
    finalResult.rows.forEach(row => {
      const emoji = row.status === 'completed' ? '✅' : 
                   row.status === 'processing' ? '🔄' : 
                   row.status === 'pending' ? '⏳' : 
                   row.status === 'error' ? '❌' : '❓';
      console.log(`${emoji} ${row.status}: ${row.count} domains`);
    });
    
    console.log('\n🚀 NEXT STEPS:');
    console.log('==============');
    console.log('1. The sophisticated-runner will automatically pick up these pending domains');
    console.log('2. Processing should resume within 12 seconds');
    console.log('3. Monitor the system to ensure processing continues');
    console.log('4. Check https://sophisticated-runner.onrender.com/health for status');
    
    console.log('\n✅ STUCK DOMAINS FIXED!');
    console.log('The 6 domains have been reset to pending status and should start processing again.');
    
  } catch (error) {
    console.error('❌ Error fixing stuck domains:', error.message);
    console.log('\n🔧 MANUAL FIX INSTRUCTIONS:');
    console.log('============================');
    console.log('Run this SQL query in your Render database console:');
    console.log('');
    console.log('UPDATE domains');
    console.log('SET status = \'pending\', last_processed_at = NULL, updated_at = CURRENT_TIMESTAMP');
    console.log('WHERE domain IN (');
    STUCK_DOMAINS.forEach((domain, index) => {
      console.log(`  '${domain}'${index < STUCK_DOMAINS.length - 1 ? ',' : ''}`);
    });
    console.log(') AND status = \'processing\';');
  } finally {
    try {
      await pool.end();
    } catch (e) {
      // Ignore cleanup errors
    }
  }
}

// Run the fix
fixStuckDomains().catch(console.error); 