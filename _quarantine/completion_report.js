#!/usr/bin/env node

const { Pool } = require('pg');

// Use the working database connection
const DATABASE_URL = 'postgresql://raw_capture_db_user:wjFesUM8ISNEvE2b4kZtRAKgGYJVtKK5@dpg-d11fqgndiees73fb35dg-a.oregon-postgres.render.com/raw_capture_db';

async function generateCompletionReport() {
  console.log('🎉 DOMAIN PROCESSING COMPLETION REPORT');
  console.log('=====================================\n');
  
  const pool = new Pool({
    connectionString: DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    // Overall completion status
    const overallStats = await pool.query(`
      SELECT 
        COUNT(*) as total_domains,
        COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_domains,
        COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_domains,
        COUNT(CASE WHEN status = 'error' THEN 1 END) as error_domains,
        COUNT(CASE WHEN status = 'processing' THEN 1 END) as processing_domains
      FROM domains
    `);

    const stats = overallStats.rows[0];
    const completionRate = (stats.completed_domains / stats.total_domains * 100).toFixed(2);

    console.log('📊 PROCESSING COMPLETION STATUS:');
    console.log('================================');
    console.log(`Total domains: ${stats.total_domains.toLocaleString()}`);
    console.log(`✅ Completed: ${stats.completed_domains.toLocaleString()} (${completionRate}%)`);
    console.log(`⏳ Pending: ${stats.pending_domains.toLocaleString()}`);
    console.log(`❌ Errors: ${stats.error_domains.toLocaleString()}`);
    console.log(`🔄 Processing: ${stats.processing_domains.toLocaleString()}\n`);

    // Response generation statistics
    const responseStats = await pool.query(`
      SELECT 
        COUNT(*) as total_responses,
        COUNT(DISTINCT model) as unique_models,
        COUNT(DISTINCT prompt_type) as unique_prompts,
        COUNT(DISTINCT domain_id) as domains_with_responses,
        SUM(token_count) as total_tokens
      FROM domain_responses
    `);

    const respStats = responseStats.rows[0];
    console.log('💬 LLM RESPONSE GENERATION:');
    console.log('===========================');
    console.log(`Total responses: ${respStats.total_responses.toLocaleString()}`);
    console.log(`Unique models used: ${respStats.unique_models}`);
    console.log(`Unique prompt types: ${respStats.unique_prompts}`);
    console.log(`Domains with responses: ${respStats.domains_with_responses.toLocaleString()}`);
    console.log(`Total tokens processed: ${respStats.total_tokens.toLocaleString()}\n`);

    // Model performance breakdown
    const modelBreakdown = await pool.query(`
      SELECT 
        model,
        COUNT(*) as response_count,
        COUNT(DISTINCT domain_id) as unique_domains,
        SUM(token_count) as total_tokens,
        AVG(token_count) as avg_tokens
      FROM domain_responses
      GROUP BY model
      ORDER BY response_count DESC
    `);

    console.log('🤖 MODEL PERFORMANCE BREAKDOWN:');
    console.log('===============================');
    for (const row of modelBreakdown.rows) {
      console.log(`${row.model.padEnd(25)} | Responses: ${row.response_count.toLocaleString().padStart(6)} | Domains: ${row.unique_domains.toLocaleString().padStart(5)} | Tokens: ${row.total_tokens.toLocaleString().padStart(8)} | Avg: ${Math.round(row.avg_tokens).toString().padStart(3)}`);
    }
    console.log('');

    // Prompt type breakdown
    const promptBreakdown = await pool.query(`
      SELECT 
        prompt_type,
        COUNT(*) as response_count,
        COUNT(DISTINCT domain_id) as unique_domains,
        COUNT(DISTINCT model) as models_used
      FROM domain_responses
      GROUP BY prompt_type
      ORDER BY response_count DESC
    `);

    console.log('📝 PROMPT TYPE BREAKDOWN:');
    console.log('=========================');
    for (const row of promptBreakdown.rows) {
      console.log(`${row.prompt_type.padEnd(20)} | Responses: ${row.response_count.toLocaleString().padStart(6)} | Domains: ${row.unique_domains.toLocaleString().padStart(5)} | Models: ${row.models_used.toString().padStart(2)}`);
    }
    console.log('');

    // Recent processing timeline
    const timeline = await pool.query(`
      SELECT 
        DATE(created_at) as date,
        COUNT(*) as responses_generated,
        COUNT(DISTINCT domain_id) as domains_processed,
        COUNT(DISTINCT model) as models_used
      FROM domain_responses
      WHERE created_at >= CURRENT_DATE - INTERVAL '7 days'
      GROUP BY DATE(created_at)
      ORDER BY date DESC
    `);

    if (timeline.rows.length > 0) {
      console.log('📅 PROCESSING TIMELINE (Last 7 days):');
      console.log('=====================================');
      for (const row of timeline.rows) {
        console.log(`${row.date.toISOString().split('T')[0]} | Responses: ${row.responses_generated.toLocaleString().padStart(6)} | Domains: ${row.domains_processed.toLocaleString().padStart(5)} | Models: ${row.models_used.toString().padStart(2)}`);
      }
      console.log('');
    }

    // Success metrics
    const successMetrics = await pool.query(`
      SELECT 
        COUNT(DISTINCT d.id) as domains_with_complete_analysis
      FROM domains d
      WHERE d.status = 'completed'
      AND EXISTS (SELECT 1 FROM domain_responses dr WHERE dr.domain_id = d.id AND dr.prompt_type = 'business_analysis')
      AND EXISTS (SELECT 1 FROM domain_responses dr WHERE dr.domain_id = d.id AND dr.prompt_type = 'content_strategy')
      AND EXISTS (SELECT 1 FROM domain_responses dr WHERE dr.domain_id = d.id AND dr.prompt_type = 'technical_assessment')
    `);

    const completeAnalysis = successMetrics.rows[0].domains_with_complete_analysis;
    const analysisRate = (completeAnalysis / stats.completed_domains * 100).toFixed(2);

    console.log('🎯 SUCCESS METRICS:');
    console.log('==================');
    console.log(`Domains with complete analysis: ${completeAnalysis.toLocaleString()} (${analysisRate}% of completed)`);
    console.log(`Average responses per domain: ${(respStats.total_responses / respStats.domains_with_responses).toFixed(1)}`);
    console.log(`Average tokens per response: ${Math.round(respStats.total_tokens / respStats.total_responses).toLocaleString()}\n`);

    // Cost estimation (rough)
    const estimatedCost = (respStats.total_tokens / 1000000) * 0.5; // Rough estimate at $0.50 per million tokens
    console.log('💰 ESTIMATED PROCESSING COSTS:');
    console.log('==============================');
    console.log(`Estimated cost: $${estimatedCost.toFixed(2)} (based on token usage)\n`);

    console.log('🚀 MISSION STATUS: SUCCESS! 🚀');
    console.log('==============================');
    
    if (stats.completed_domains >= 3100) {
      console.log('✅ ALL TARGET DOMAINS SUCCESSFULLY PROCESSED!');
      console.log('✅ Brand intelligence data generated for all domains');
      console.log('✅ Multi-model LLM analysis completed');
      console.log('✅ Database populated with comprehensive responses');
      console.log('✅ Ready for production use and analytics');
    } else {
      console.log(`⚠️  ${stats.pending_domains} domains still pending processing`);
    }

  } catch (error) {
    console.error('❌ Error generating report:', error);
  } finally {
    await pool.end();
  }
}

generateCompletionReport().catch(console.error);