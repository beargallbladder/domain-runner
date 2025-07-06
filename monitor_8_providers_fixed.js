#!/usr/bin/env node

const { Pool } = require('pg');
require('dotenv').config();

console.log('🔍 MONITORING ALL 8 AI PROVIDERS - FIXED VERSION');
console.log('Checking if XAI, Anthropic, Perplexity, Together, and Google are now working...\n');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

async function checkProviderStatus() {
  try {
    // Check responses from last 2 hours
    const query = `
      SELECT 
        provider,
        COUNT(*) as response_count,
        MAX(created_at) as last_response,
        MIN(created_at) as first_response
      FROM domain_responses 
      WHERE created_at > NOW() - INTERVAL '2 hours'
      GROUP BY provider
      ORDER BY response_count DESC
    `;
    
    const result = await pool.query(query);
    
    const expectedProviders = [
      'openai', 'anthropic', 'deepseek', 'mistral', 
      'xai', 'together', 'perplexity', 'google'
    ];
    
    console.log('📊 AI PROVIDER STATUS (Last 2 Hours):');
    console.log('=====================================');
    
    const activeProviders = new Set();
    
    for (const row of result.rows) {
      const { provider, response_count, last_response, first_response } = row;
      activeProviders.add(provider);
      
      const timeSinceLastResponse = new Date() - new Date(last_response);
      const minutesAgo = Math.floor(timeSinceLastResponse / (1000 * 60));
      
      console.log(`✅ ${provider.toUpperCase()}: ${response_count} responses (last: ${minutesAgo}m ago)`);
    }
    
    console.log('\n🔍 MISSING PROVIDERS:');
    console.log('=====================');
    
    const missingProviders = expectedProviders.filter(p => !activeProviders.has(p));
    
    if (missingProviders.length === 0) {
      console.log('🎉 ALL 8 PROVIDERS ARE WORKING! 🎉');
    } else {
      for (const provider of missingProviders) {
        console.log(`❌ ${provider.toUpperCase()}: No responses in last 2 hours`);
      }
      console.log(`\n⚠️ ${missingProviders.length}/${expectedProviders.length} providers are missing`);
    }
    
    // Check total processing activity
    const totalQuery = `
      SELECT 
        COUNT(*) as total_responses,
        COUNT(DISTINCT domain) as unique_domains,
        COUNT(DISTINCT provider) as active_providers
      FROM domain_responses 
      WHERE created_at > NOW() - INTERVAL '2 hours'
    `;
    
    const totalResult = await pool.query(totalQuery);
    const { total_responses, unique_domains, active_providers } = totalResult.rows[0];
    
    console.log('\n📈 PROCESSING SUMMARY:');
    console.log('======================');
    console.log(`Total responses: ${total_responses}`);
    console.log(`Unique domains: ${unique_domains}`);
    console.log(`Active providers: ${active_providers}/8`);
    
    const expectedResponsesPerDomain = 8;
    const actualResponsesPerDomain = total_responses / unique_domains;
    
    console.log(`Avg responses per domain: ${actualResponsesPerDomain.toFixed(1)}/${expectedResponsesPerDomain}`);
    
    if (actualResponsesPerDomain >= 7.5) {
      console.log('🎯 EXCELLENT: Nearly all providers responding!');
    } else if (actualResponsesPerDomain >= 5) {
      console.log('⚠️ PARTIAL: Some providers are missing');
    } else {
      console.log('❌ CRITICAL: Most providers are not working');
    }
    
  } catch (error) {
    console.error('❌ Error checking provider status:', error.message);
  } finally {
    await pool.end();
  }
}

checkProviderStatus(); 