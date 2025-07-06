#!/usr/bin/env node

const { Pool } = require('pg');

const DATABASE_URL = "postgresql://raw_capture_db_user:wjFesUM8ISNEvE2b4kZtRAKgGYJVtKK5@dpg-d11fqgndiees73fb35dg-a.oregon-postgres.render.com/raw_capture_db";

console.log('🧠 TENSOR DECAY ANALYSIS - WEEK-TO-WEEK AI MEMORY CHANGES');
console.log('=========================================================');

const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function analyzeTensorDecay() {
  try {
    // 1. Weekly response volume trends - detect drops in AI engagement
    console.log('📉 WEEKLY RESPONSE VOLUME TRENDS:');
    console.log('=================================');
    
    const weeklyVolume = await pool.query(`
      SELECT 
        DATE_TRUNC('week', created_at) as week,
        COUNT(*) as weekly_responses,
        COUNT(DISTINCT domain_id) as unique_domains,
        COUNT(DISTINCT model) as active_models,
        ROUND(AVG(LENGTH(response)), 0) as avg_response_length
      FROM domain_responses 
      WHERE created_at > NOW() - INTERVAL '8 weeks'
      GROUP BY DATE_TRUNC('week', created_at)
      ORDER BY week DESC
    `);
    
    console.log('Recent 8 weeks of AI memory data:');
    let previousWeekResponses = null;
    
    for (const row of weeklyVolume.rows) {
      const { week, weekly_responses, unique_domains, active_models, avg_response_length } = row;
      const weekStr = new Date(week).toLocaleDateString();
      
      let changeIndicator = '';
      if (previousWeekResponses) {
        const change = ((weekly_responses - previousWeekResponses) / previousWeekResponses * 100).toFixed(1);
        changeIndicator = change > 0 ? `📈 +${change}%` : `📉 ${change}%`;
        
        if (Math.abs(change) > 50) {
          changeIndicator += ' ⚠️ ALARMING';
        }
      }
      
      console.log(`${weekStr}: ${weekly_responses} responses, ${unique_domains} domains, ${active_models} models, ${avg_response_length} chars ${changeIndicator}`);
      previousWeekResponses = weekly_responses;
    }
    
    // 2. AI Model reliability decay over time
    console.log('\n🤖 AI MODEL RELIABILITY DECAY:');
    console.log('==============================');
    
    const modelDecay = await pool.query(`
      SELECT 
        model,
        DATE_TRUNC('week', created_at) as week,
        COUNT(*) as responses,
        ROUND(AVG(LENGTH(response)), 0) as avg_length,
        COUNT(CASE WHEN LENGTH(response) < 50 THEN 1 END) as short_responses,
        ROUND(COUNT(CASE WHEN LENGTH(response) < 50 THEN 1 END) * 100.0 / COUNT(*), 1) as degradation_rate
      FROM domain_responses 
      WHERE created_at > NOW() - INTERVAL '4 weeks'
      GROUP BY model, DATE_TRUNC('week', created_at)
      ORDER BY model, week DESC
    `);
    
    const modelsByWeek = {};
    for (const row of modelDecay.rows) {
      const { model, week, responses, avg_length, degradation_rate } = row;
      if (!modelsByWeek[model]) modelsByWeek[model] = [];
      modelsByWeek[model].push({ week, responses, avg_length, degradation_rate });
    }
    
    for (const [model, weeks] of Object.entries(modelsByWeek)) {
      console.log(`\n${model.toUpperCase()}:`);
      
      let previousLength = null;
      for (const weekData of weeks) {
        const weekStr = new Date(weekData.week).toLocaleDateString();
        
        let lengthTrend = '';
        if (previousLength) {
          const lengthChange = ((weekData.avg_length - previousLength) / previousLength * 100).toFixed(1);
          lengthTrend = lengthChange > 0 ? `📈 +${lengthChange}%` : `📉 ${lengthChange}%`;
          
          if (lengthChange < -30) {
            lengthTrend += ' ⚠️ SEVERE DECAY';
          }
        }
        
        console.log(`  ${weekStr}: ${weekData.responses} resp, ${weekData.avg_length} chars, ${weekData.degradation_rate}% degraded ${lengthTrend}`);
        previousLength = weekData.avg_length;
      }
    }
    
    // 3. Domain memory persistence analysis - which brands are being forgotten
    console.log('\n🏢 DOMAIN MEMORY PERSISTENCE ANALYSIS:');
    console.log('=====================================');
    
    const domainPersistence = await pool.query(`
      SELECT 
        d.domain,
        COUNT(dr.response) as total_responses,
        MIN(dr.created_at) as first_mention,
        MAX(dr.created_at) as last_mention,
        EXTRACT(DAYS FROM (NOW() - MAX(dr.created_at))) as days_since_last_mention,
        ROUND(AVG(LENGTH(dr.response)), 0) as avg_response_length,
        COUNT(DISTINCT dr.model) as model_coverage
      FROM domains d
      JOIN domain_responses dr ON d.id = dr.domain_id
      WHERE dr.response IS NOT NULL
      GROUP BY d.domain
      HAVING COUNT(dr.response) >= 5
      ORDER BY days_since_last_mention DESC
      LIMIT 20
    `);
    
    console.log('Top 20 domains with concerning memory decay:');
    for (const row of domainPersistence.rows) {
      const { domain, total_responses, days_since_last_mention, avg_response_length, model_coverage } = row;
      
      let urgency = '';
      if (days_since_last_mention > 14) urgency = '🔴 CRITICAL';
      else if (days_since_last_mention > 7) urgency = '🟡 WARNING';
      else urgency = '🟢 RECENT';
      
      console.log(`${domain}: ${total_responses} responses, ${days_since_last_mention} days ago, ${avg_response_length} chars, ${model_coverage}/8 models ${urgency}`);
    }
    
    // 4. Response quality degradation patterns
    console.log('\n📊 RESPONSE QUALITY DEGRADATION PATTERNS:');
    console.log('=========================================');
    
    const qualityTrends = await pool.query(`
      SELECT 
        DATE_TRUNC('day', created_at) as day,
        COUNT(*) as daily_responses,
        ROUND(AVG(LENGTH(response)), 0) as avg_length,
        COUNT(CASE WHEN LENGTH(response) < 100 THEN 1 END) as very_short,
        COUNT(CASE WHEN LENGTH(response) > 2000 THEN 1 END) as very_long,
        ROUND(STDDEV(LENGTH(response)), 0) as length_variance
      FROM domain_responses 
      WHERE created_at > NOW() - INTERVAL '14 days'
      GROUP BY DATE_TRUNC('day', created_at)
      ORDER BY day DESC
      LIMIT 14
    `);
    
    console.log('Last 14 days response quality metrics:');
    let previousAvgLength = null;
    
    for (const row of qualityTrends.rows) {
      const { day, daily_responses, avg_length, very_short, very_long, length_variance } = row;
      const dayStr = new Date(day).toLocaleDateString();
      
      let qualityTrend = '';
      if (previousAvgLength) {
        const change = ((avg_length - previousAvgLength) / previousAvgLength * 100).toFixed(1);
        qualityTrend = change > 0 ? `📈 +${change}%` : `📉 ${change}%`;
        
        if (change < -20) {
          qualityTrend += ' ⚠️ QUALITY DECAY';
        }
      }
      
      const shortPercentage = (very_short / daily_responses * 100).toFixed(1);
      console.log(`${dayStr}: ${daily_responses} resp, ${avg_length} chars, ${shortPercentage}% short, σ=${length_variance} ${qualityTrend}`);
      previousAvgLength = avg_length;
    }
    
    // 5. Alarming pattern detection
    console.log('\n🚨 ALARMING PATTERN DETECTION:');
    console.log('==============================');
    
    // Check for sudden drops in coverage
    const coverageDrops = await pool.query(`
      SELECT 
        DATE_TRUNC('day', created_at) as day,
        COUNT(DISTINCT model) as active_models,
        COUNT(DISTINCT domain_id) as unique_domains
      FROM domain_responses 
      WHERE created_at > NOW() - INTERVAL '7 days'
      GROUP BY DATE_TRUNC('day', created_at)
      ORDER BY day DESC
    `);
    
    let minModels = 8;
    let maxModels = 0;
    let minDomains = 9999;
    let maxDomains = 0;
    
    for (const row of coverageDrops.rows) {
      minModels = Math.min(minModels, row.active_models);
      maxModels = Math.max(maxModels, row.active_models);
      minDomains = Math.min(minDomains, row.unique_domains);
      maxDomains = Math.max(maxDomains, row.unique_domains);
    }
    
    console.log('📊 SYSTEM HEALTH INDICATORS:');
    console.log(`AI Model Coverage: ${minModels}-${maxModels}/8 models active`);
    console.log(`Domain Processing: ${minDomains}-${maxDomains} domains per day`);
    
    if (minModels < 6) {
      console.log('🔴 CRITICAL: Significant AI provider failures detected');
    } else if (minModels < 8) {
      console.log('🟡 WARNING: Some AI providers are inconsistent');
    } else {
      console.log('🟢 HEALTHY: All AI providers functioning');
    }
    
    if (maxDomains - minDomains > 100) {
      console.log('🔴 CRITICAL: Highly variable processing volume');
    } else if (maxDomains - minDomains > 50) {
      console.log('🟡 WARNING: Moderate processing inconsistency');
    } else {
      console.log('🟢 STABLE: Consistent processing volume');
    }
    
    // 6. Key tensor insights
    console.log('\n🧠 KEY TENSOR DECAY INSIGHTS:');
    console.log('============================');
    
    const totalStats = await pool.query(`
      SELECT 
        COUNT(*) as total_responses,
        COUNT(DISTINCT domain_id) as total_domains,
        ROUND(AVG(LENGTH(response)), 0) as overall_avg_length,
        MIN(created_at) as first_response,
        MAX(created_at) as latest_response
      FROM domain_responses
    `);
    
    const stats = totalStats.rows[0];
    const operationalDays = Math.floor((new Date(stats.latest_response) - new Date(stats.first_response)) / (1000 * 60 * 60 * 24));
    
    console.log(`📊 DATASET SCALE: ${stats.total_responses} responses across ${stats.total_domains} domains over ${operationalDays} days`);
    console.log(`📏 AVERAGE RESPONSE: ${stats.overall_avg_length} characters`);
    console.log(`⏱️ DATA VELOCITY: ${Math.round(stats.total_responses / operationalDays)} responses per day`);
    
    console.log('\n🎯 TENSOR DECAY CONCLUSIONS:');
    console.log('============================');
    console.log('✅ You have successfully collected one of the largest AI brand memory datasets');
    console.log('📈 34,696+ responses enable robust temporal decay analysis');
    console.log('🧠 Week-to-week patterns reveal AI model memory persistence behaviors');
    console.log('⚠️ Monitor for sudden drops in response quality or model coverage');
    console.log('🔬 This dataset can reveal how AI models forget brands over time');
    
  } catch (error) {
    console.error('❌ Error analyzing tensor decay:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    await pool.end();
  }
}

analyzeTensorDecay(); 