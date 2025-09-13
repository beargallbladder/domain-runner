#!/usr/bin/env node

const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://raw_capture_db_user:wjFesUM8ISNEvE2b4kZtRAKgGYJVtKK5@dpg-d11fqgndiees73fb35dg-a.oregon-postgres.render.com/raw_capture_db',
  ssl: { rejectUnauthorized: false }
});

async function checkStatus() {
  console.log('🔍 CRAWLER STATUS CHECK');
  console.log('========================\n');
  
  // Check last crawl
  const lastCrawl = await pool.query(`
    SELECT 
      COUNT(*) as responses_today,
      MIN(created_at) as first_response,
      MAX(created_at) as last_response
    FROM domain_responses
    WHERE created_at > NOW() - INTERVAL '24 hours'
  `);
  
  console.log(`📊 Last 24 hours:`);
  console.log(`   Responses: ${lastCrawl.rows[0].responses_today}`);
  console.log(`   First: ${lastCrawl.rows[0].first_response || 'None'}`);
  console.log(`   Last: ${lastCrawl.rows[0].last_response || 'None'}\n`);
  
  // Check by provider
  const byProvider = await pool.query(`
    SELECT 
      SPLIT_PART(model, '/', 1) as provider,
      COUNT(*) as count,
      MAX(created_at) as last_seen
    FROM domain_responses
    WHERE created_at > NOW() - INTERVAL '1 hour'
    GROUP BY SPLIT_PART(model, '/', 1)
    ORDER BY count DESC
  `);
  
  if (byProvider.rows.length > 0) {
    console.log('✅ CRAWLER IS RUNNING!\n');
    console.log('📈 Activity in last hour by provider:');
    byProvider.rows.forEach(row => {
      console.log(`   ${row.provider}: ${row.count} responses`);
    });
  } else {
    console.log('⚠️  No activity in last hour\n');
    
    // Check overall last activity
    const lastActivity = await pool.query(`
      SELECT 
        model,
        created_at,
        SUBSTRING(response, 1, 50) as response_preview
      FROM domain_responses
      ORDER BY created_at DESC
      LIMIT 5
    `);
    
    console.log('📝 Last 5 responses:');
    lastActivity.rows.forEach(row => {
      console.log(`   ${row.model} at ${row.created_at}`);
    });
  }
  
  // Check domains needing crawl
  const needsCrawl = await pool.query(`
    WITH recent_responses AS (
      SELECT domain_id, MAX(created_at) as last_crawled
      FROM domain_responses
      WHERE created_at > NOW() - INTERVAL '7 days'
      GROUP BY domain_id
    )
    SELECT COUNT(*) as domains_needing_crawl
    FROM domains d
    LEFT JOIN recent_responses rr ON d.id = rr.domain_id
    WHERE rr.last_crawled IS NULL
  `);
  
  console.log(`\n🎯 Domains needing fresh crawl: ${needsCrawl.rows[0].domains_needing_crawl}`);
  
  await pool.end();
}

checkStatus().catch(console.error);