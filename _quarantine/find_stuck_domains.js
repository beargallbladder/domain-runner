#!/usr/bin/env node

const { Pool } = require('pg');

// Production database connection
const DATABASE_URL = "postgresql://raw_capture_db_user:wjFesUM8ISNEvE2b4kZtRAKgGYJVtKK5@dpg-d11fqgndiees73fb35dg-a.oregon-postgres.render.com/raw_capture_db";

async function findStuckDomains() {
  console.log('🔍 ANALYZING STUCK DOMAINS');
  console.log('==========================');
  
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
    
    // Get domains stuck in processing status
    console.log('\n📊 DOMAINS STUCK IN PROCESSING STATUS:');
    console.log('=====================================');
    
    const stuckQuery = `
      SELECT 
        id,
        domain,
        status,
        last_processed_at,
        updated_at,
        process_count,
        error_count,
        EXTRACT(EPOCH FROM (NOW() - last_processed_at))/3600 as hours_stuck,
        EXTRACT(EPOCH FROM (NOW() - updated_at))/3600 as hours_since_update
      FROM domains 
      WHERE status = 'processing'
      ORDER BY last_processed_at ASC NULLS FIRST
    `;
    
    const stuckResult = await pool.query(stuckQuery);
    
    if (stuckResult.rows.length === 0) {
      console.log('✅ No domains stuck in processing status!');
    } else {
      console.log(`❌ Found ${stuckResult.rows.length} domains stuck in processing:`);
      console.log('');
      
      stuckResult.rows.forEach((domain, index) => {
        console.log(`${index + 1}. ${domain.domain}`);
        console.log(`   ID: ${domain.id}`);
        console.log(`   Status: ${domain.status}`);
        console.log(`   Process Count: ${domain.process_count}`);
        console.log(`   Error Count: ${domain.error_count}`);
        console.log(`   Last Processed: ${domain.last_processed_at || 'Never'}`);
        console.log(`   Last Updated: ${domain.updated_at || 'Never'}`);
        console.log(`   Hours Stuck: ${domain.hours_stuck ? parseFloat(domain.hours_stuck).toFixed(1) : 'N/A'}`);
        console.log(`   Hours Since Update: ${domain.hours_since_update ? parseFloat(domain.hours_since_update).toFixed(1) : 'N/A'}`);
        console.log('');
      });
    }
    
    // Get domains with errors
    console.log('\n🚨 DOMAINS WITH ERRORS:');
    console.log('=======================');
    
    const errorQuery = `
      SELECT 
        id,
        domain,
        status,
        error_count,
        last_processed_at,
        updated_at
      FROM domains 
      WHERE error_count > 0
      ORDER BY error_count DESC, updated_at DESC
      LIMIT 10
    `;
    
    const errorResult = await pool.query(errorQuery);
    
    if (errorResult.rows.length === 0) {
      console.log('✅ No domains with errors!');
    } else {
      console.log(`Found ${errorResult.rows.length} domains with errors:`);
      console.log('');
      
      errorResult.rows.forEach((domain, index) => {
        console.log(`${index + 1}. ${domain.domain}`);
        console.log(`   Status: ${domain.status}`);
        console.log(`   Error Count: ${domain.error_count}`);
        console.log(`   Last Processed: ${domain.last_processed_at || 'Never'}`);
        console.log(`   Last Updated: ${domain.updated_at || 'Never'}`);
        console.log('');
      });
    }
    
    // Get overall status summary
    console.log('\n📈 OVERALL STATUS SUMMARY:');
    console.log('==========================');
    
    const summaryQuery = `
      SELECT 
        status,
        COUNT(*) as count,
        AVG(process_count) as avg_process_count,
        AVG(error_count) as avg_error_count
      FROM domains 
      GROUP BY status
      ORDER BY count DESC
    `;
    
    const summaryResult = await pool.query(summaryQuery);
    
    summaryResult.rows.forEach(row => {
      const emoji = row.status === 'completed' ? '✅' : 
                   row.status === 'processing' ? '🔄' : 
                   row.status === 'pending' ? '⏳' : 
                   row.status === 'error' ? '❌' : '❓';
      console.log(`${emoji} ${row.status}: ${row.count} domains`);
      console.log(`   Avg Process Count: ${parseFloat(row.avg_process_count).toFixed(1)}`);
      console.log(`   Avg Error Count: ${parseFloat(row.avg_error_count).toFixed(1)}`);
      console.log('');
    });
    
    // Check for recent API responses
    console.log('\n📡 RECENT API RESPONSES:');
    console.log('========================');
    
    const responsesQuery = `
      SELECT 
        COUNT(*) as total_responses,
        COUNT(DISTINCT domain) as unique_domains,
        MAX(created_at) as latest_response,
        MIN(created_at) as earliest_response
      FROM domain_responses
      WHERE created_at > NOW() - INTERVAL '24 hours'
    `;
    
    const responsesResult = await pool.query(responsesQuery);
    
    if (responsesResult.rows.length > 0) {
      const data = responsesResult.rows[0];
      console.log(`📊 Last 24 hours:`);
      console.log(`   Total Responses: ${data.total_responses}`);
      console.log(`   Unique Domains: ${data.unique_domains}`);
      console.log(`   Latest Response: ${data.latest_response || 'None'}`);
      console.log(`   Earliest Response: ${data.earliest_response || 'None'}`);
    }
    
    console.log('\n🔧 RECOMMENDED ACTIONS:');
    console.log('=======================');
    
    if (stuckResult.rows.length > 0) {
      console.log('1. Reset stuck domains to pending status');
      console.log('2. Check sophisticated-runner logs for processing errors');
      console.log('3. Verify API keys are working for all 8 providers');
      console.log('4. Consider increasing timeout values');
    } else {
      console.log('✅ System appears to be running normally');
    }
    
  } catch (error) {
    console.error('❌ Error analyzing domains:', error.message);
    console.log('\n🔧 MANUAL DATABASE QUERY:');
    console.log('=========================');
    console.log('Run this SQL query in your Render database console:');
    console.log('');
    console.log('SELECT domain, status, last_processed_at, process_count, error_count');
    console.log('FROM domains');
    console.log('WHERE status = \'processing\'');
    console.log('ORDER BY last_processed_at ASC;');
  } finally {
    try {
      await pool.end();
    } catch (e) {
      // Ignore cleanup errors
    }
  }
}

// Run the analysis
findStuckDomains().catch(console.error); 