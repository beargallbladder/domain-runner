#!/usr/bin/env node

const { Pool } = require('pg');

const DATABASE_URL = "postgresql://raw_capture_db_user:wjFesUM8ISNEvE2b4kZtRAKgGYJVtKK5@dpg-d11fqgndiees73fb35dg-a.oregon-postgres.render.com/raw_capture_db";

console.log('🔍 CHECKING DOMAIN PROCESSING STATUS');
console.log('===================================');

const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function checkProcessingStatus() {
  try {
    // Check total domains and their status
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
    
    console.log('📊 DOMAIN STATUS BREAKDOWN:');
    console.log('===========================');
    
    let totalDomains = 0;
    let completedDomains = 0;
    let pendingDomains = 0;
    let processingDomains = 0;
    
    for (const row of domainStats.rows) {
      const { status, count, percentage } = row;
      totalDomains += parseInt(count);
      
      if (status === 'completed') completedDomains = parseInt(count);
      if (status === 'pending') pendingDomains = parseInt(count);
      if (status === 'processing') processingDomains = parseInt(count);
      
      console.log(`${status.toUpperCase()}: ${count} domains (${percentage}%)`);
    }
    
    console.log(`\nTOTAL DOMAINS: ${totalDomains}`);
    
    // Check response counts by provider
    const responseStatsQuery = `
      SELECT 
        provider,
        COUNT(*) as response_count,
        COUNT(DISTINCT domain_id) as unique_domains,
        MAX(created_at) as last_response,
        MIN(created_at) as first_response
      FROM domain_responses 
      GROUP BY provider
      ORDER BY response_count DESC
    `;
    
    const responseStats = await pool.query(responseStatsQuery);
    
    console.log('\n🤖 AI PROVIDER RESPONSE COUNTS:');
    console.log('===============================');
    
    let totalResponses = 0;
    const providerCounts = {};
    
    for (const row of responseStats.rows) {
      const { provider, response_count, unique_domains, last_response } = row;
      totalResponses += parseInt(response_count);
      providerCounts[provider] = parseInt(response_count);
      
      const timeSinceLastResponse = new Date() - new Date(last_response);
      const hoursAgo = Math.floor(timeSinceLastResponse / (1000 * 60 * 60));
      
      console.log(`${provider.toUpperCase()}: ${response_count} responses (${unique_domains} domains, last: ${hoursAgo}h ago)`);
    }
    
    console.log(`\nTOTAL RESPONSES: ${totalResponses}`);
    
    // Check recent activity (last 24 hours)
    const recentActivityQuery = `
      SELECT 
        DATE_TRUNC('hour', created_at) as hour,
        COUNT(*) as responses,
        COUNT(DISTINCT provider) as active_providers,
        COUNT(DISTINCT domain_id) as domains_processed
      FROM domain_responses 
      WHERE created_at > NOW() - INTERVAL '24 hours'
      GROUP BY DATE_TRUNC('hour', created_at)
      ORDER BY hour DESC
      LIMIT 10
    `;
    
    const recentActivity = await pool.query(recentActivityQuery);
    
    console.log('\n⏰ RECENT PROCESSING ACTIVITY (Last 24 Hours):');
    console.log('==============================================');
    
    if (recentActivity.rows.length > 0) {
      for (const row of recentActivity.rows) {
        const { hour, responses, active_providers, domains_processed } = row;
        const hourStr = new Date(hour).toLocaleString();
        console.log(`${hourStr}: ${responses} responses, ${active_providers} providers, ${domains_processed} domains`);
      }
    } else {
      console.log('❌ No recent activity in the last 24 hours');
    }
    
    // Overall assessment
    console.log('\n🎯 PROCESSING ASSESSMENT:');
    console.log('========================');
    
    const expectedProvidersPerDomain = 8;
    const actualResponsesPerCompletedDomain = completedDomains > 0 ? totalResponses / completedDomains : 0;
    
    console.log(`Expected responses per domain: ${expectedProvidersPerDomain}`);
    console.log(`Actual responses per completed domain: ${actualResponsesPerCompletedDomain.toFixed(1)}`);
    
    const completionPercentage = (completedDomains / totalDomains * 100).toFixed(1);
    console.log(`Overall completion: ${completedDomains}/${totalDomains} domains (${completionPercentage}%)`);
    
    if (completedDomains >= totalDomains * 0.95) {
      console.log('🎉 EXCELLENT: Full crawl is nearly complete!');
    } else if (completedDomains >= totalDomains * 0.75) {
      console.log('🟡 GOOD: Most domains have been processed');
    } else if (completedDomains >= totalDomains * 0.25) {
      console.log('🟠 PARTIAL: Some domains have been processed');
    } else {
      console.log('🔴 INCOMPLETE: Most domains still need processing');
    }
    
    // Check if all 8 providers are working
    const activeProviders = Object.keys(providerCounts).length;
    const expectedProviders = 8;
    
    console.log(`\nActive AI providers: ${activeProviders}/${expectedProviders}`);
    
    if (activeProviders === expectedProviders) {
      console.log('✅ All 8 AI providers are working');
    } else {
      console.log('⚠️ Some AI providers are missing responses');
    }
    
  } catch (error) {
    console.error('❌ Error checking processing status:', error.message);
  } finally {
    await pool.end();
  }
}

checkProcessingStatus(); 