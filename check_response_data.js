#!/usr/bin/env node

const { Pool } = require('pg');

const DATABASE_URL = "postgresql://raw_capture_db_user:wjFesUM8ISNEvE2b4kZtRAKgGYJVtKK5@dpg-d11fqgndiees73fb35dg-a.oregon-postgres.render.com/raw_capture_db";

console.log('🔍 CHECKING RESPONSE DATA AND AI PROVIDERS');
console.log('==========================================');

const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function checkResponseData() {
  try {
    // First, let's check what tables exist and their schemas
    const tablesQuery = `
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
      ORDER BY table_name
    `;
    
    const tables = await pool.query(tablesQuery);
    console.log('📋 AVAILABLE TABLES:');
    console.log('===================');
    for (const row of tables.rows) {
      console.log(`- ${row.table_name}`);
    }
    
    // Check if domain_responses table exists and its schema
    const responseTableSchema = `
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'domain_responses' 
      AND table_schema = 'public'
      ORDER BY ordinal_position
    `;
    
    const schema = await pool.query(responseTableSchema);
    if (schema.rows.length > 0) {
      console.log('\n📊 DOMAIN_RESPONSES TABLE SCHEMA:');
      console.log('=================================');
      for (const row of schema.rows) {
        console.log(`- ${row.column_name}: ${row.data_type}`);
      }
      
      // Check total responses
      const totalResponsesQuery = `SELECT COUNT(*) as total_responses FROM domain_responses`;
      const totalResponses = await pool.query(totalResponsesQuery);
      console.log(`\nTOTAL RESPONSES: ${totalResponses.rows[0].total_responses}`);
      
      // Check recent responses
      const recentResponsesQuery = `
        SELECT COUNT(*) as recent_responses 
        FROM domain_responses 
        WHERE created_at > NOW() - INTERVAL '24 hours'
      `;
      const recentResponses = await pool.query(recentResponsesQuery);
      console.log(`RECENT RESPONSES (24h): ${recentResponses.rows[0].recent_responses}`);
      
      // Check if there's a provider column or similar
      const hasProvider = schema.rows.some(row => row.column_name.toLowerCase().includes('provider'));
      if (hasProvider) {
        console.log('\n✅ Provider information is available');
      } else {
        console.log('\n⚠️ No provider column found - responses may not be tagged by AI provider');
      }
      
    } else {
      console.log('\n❌ domain_responses table not found');
    }
    
    // Check domain completion status
    const domainStatsQuery = `
      SELECT 
        status,
        COUNT(*) as count,
        ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER (), 2) as percentage
      FROM domains 
      GROUP BY status
      ORDER BY count DESC
    `;
    
    const domainStats = await pool.query(domainStatsQuery);
    
    console.log('\n📊 DOMAIN COMPLETION STATUS:');
    console.log('============================');
    
    let totalDomains = 0;
    let completedDomains = 0;
    
    for (const row of domainStats.rows) {
      const { status, count, percentage } = row;
      totalDomains += parseInt(count);
      
      if (status === 'completed') completedDomains = parseInt(count);
      
      console.log(`${status.toUpperCase()}: ${count} domains (${percentage}%)`);
    }
    
    console.log(`\nTOTAL DOMAINS: ${totalDomains}`);
    console.log(`COMPLETED DOMAINS: ${completedDomains}`);
    
    // Final assessment
    console.log('\n🎯 CRAWL COMPLETION ASSESSMENT:');
    console.log('==============================');
    
    const completionPercentage = (completedDomains / totalDomains * 100).toFixed(1);
    
    if (completedDomains >= totalDomains * 0.99) {
      console.log(`🎉 FULL CRAWL COMPLETE! ${completionPercentage}% of domains processed`);
      console.log('✅ Your AI brand intelligence system has successfully crawled nearly all domains!');
    } else if (completedDomains >= totalDomains * 0.95) {
      console.log(`🟢 NEARLY COMPLETE! ${completionPercentage}% of domains processed`);
      console.log('✅ Full crawl is almost finished');
    } else if (completedDomains >= totalDomains * 0.75) {
      console.log(`🟡 GOOD PROGRESS! ${completionPercentage}% of domains processed`);
    } else {
      console.log(`🔴 INCOMPLETE! Only ${completionPercentage}% of domains processed`);
    }
    
  } catch (error) {
    console.error('❌ Error checking response data:', error.message);
  } finally {
    await pool.end();
  }
}

checkResponseData(); 