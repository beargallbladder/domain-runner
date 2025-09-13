#!/usr/bin/env node

const { Pool } = require('pg');

// Use the working database connection
const DATABASE_URL = 'postgresql://raw_capture_db_user:wjFesUM8ISNEvE2b4kZtRAKgGYJVtKK5@dpg-d11fqgndiees73fb35dg-a.oregon-postgres.render.com/raw_capture_db';

async function checkDomainStatus() {
  console.log('🔍 CHECKING DOMAIN STATUS...\n');
  
  const pool = new Pool({
    connectionString: DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    // Get overall status counts
    const statusCounts = await pool.query(`
      SELECT status, COUNT(*) as count
      FROM domains
      GROUP BY status
      ORDER BY status
    `);

    console.log('📊 DOMAIN STATUS OVERVIEW:');
    console.log('==========================');
    let totalDomains = 0;
    
    for (const row of statusCounts.rows) {
      console.log(`${row.status.padEnd(15)}: ${row.count.toLocaleString()}`);
      totalDomains += parseInt(row.count);
    }
    console.log(`${'TOTAL'.padEnd(15)}: ${totalDomains.toLocaleString()}\n`);

    // Check recent processing activity
    const recentActivity = await pool.query(`
      SELECT 
        DATE(updated_at) as date,
        status,
        COUNT(*) as count
      FROM domains
      WHERE updated_at >= CURRENT_DATE - INTERVAL '7 days'
      GROUP BY DATE(updated_at), status
      ORDER BY date DESC, status
    `);

    if (recentActivity.rows.length > 0) {
      console.log('📅 RECENT ACTIVITY (Last 7 days):');
      console.log('==================================');
      for (const row of recentActivity.rows) {
        console.log(`${row.date} | ${row.status.padEnd(12)}: ${row.count.toLocaleString()}`);
      }
      console.log('');
    }

    // Check domain_responses table
    const responseCount = await pool.query(`
      SELECT COUNT(*) as count FROM domain_responses
    `);

    console.log('💬 RESPONSE DATA:');
    console.log('=================');
    console.log(`Total responses: ${responseCount.rows[0].count.toLocaleString()}\n`);

    // Check recent responses
    const recentResponses = await pool.query(`
      SELECT 
        model,
        prompt_type,
        COUNT(*) as count
      FROM domain_responses
      WHERE created_at >= CURRENT_DATE - INTERVAL '1 day'
      GROUP BY model, prompt_type
      ORDER BY count DESC
      LIMIT 10
    `);

    if (recentResponses.rows.length > 0) {
      console.log('🔥 RECENT RESPONSES (Last 24 hours):');
      console.log('====================================');
      for (const row of recentResponses.rows) {
        console.log(`${row.model.padEnd(25)} | ${row.prompt_type.padEnd(20)}: ${row.count.toLocaleString()}`);
      }
      console.log('');
    }

    // Check for pending domains specifically
    const pendingDetails = await pool.query(`
      SELECT 
        COUNT(*) as total_pending,
        COUNT(CASE WHEN last_processed_at IS NULL THEN 1 END) as never_processed,
        COUNT(CASE WHEN process_count = 0 THEN 1 END) as zero_attempts
      FROM domains
      WHERE status = 'pending'
    `);

    if (pendingDetails.rows[0].total_pending > 0) {
      console.log('⚠️  PENDING DOMAINS DETAILS:');
      console.log('============================');
      console.log(`Total pending: ${pendingDetails.rows[0].total_pending.toLocaleString()}`);
      console.log(`Never processed: ${pendingDetails.rows[0].never_processed.toLocaleString()}`);
      console.log(`Zero attempts: ${pendingDetails.rows[0].zero_attempts.toLocaleString()}\n`);
      
      // Show some example pending domains
      const examples = await pool.query(`
        SELECT domain, last_processed_at, process_count, error_count
        FROM domains
        WHERE status = 'pending'
        ORDER BY last_processed_at ASC NULLS FIRST
        LIMIT 5
      `);
      
      console.log('📋 EXAMPLE PENDING DOMAINS:');
      console.log('===========================');
      for (const row of examples.rows) {
        console.log(`${row.domain} | Processed: ${row.last_processed_at || 'never'} | Attempts: ${row.process_count}`);
      }
    }

  } catch (error) {
    console.error('❌ Error checking status:', error);
  } finally {
    await pool.end();
  }
}

checkDomainStatus().catch(console.error);