const { Pool } = require('pg');

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://raw_capture_db_user:wjFesUM8ISNEvE2b4kZtRAKgGYJVtKK5@dpg-d11fqgndiees73fb35dg-a.oregon-postgres.render.com/raw_capture_db',
  ssl: {
    rejectUnauthorized: false
  }
});

async function checkDataQuality() {
  try {
    console.log('🔍 CHECKING DATA QUALITY FROM ULTRA-FAST PROCESSING\n');
    
    // Get total response count
    const totalResult = await pool.query('SELECT COUNT(*) as total FROM domain_responses');
    console.log(`📊 Total responses collected: ${totalResult.rows[0].total}`);
    
    // Get responses by model
    const modelResult = await pool.query(`
      SELECT model, COUNT(*) as count 
      FROM domain_responses 
      GROUP BY model 
      ORDER BY count DESC
    `);
    
    console.log('\n📈 Responses by AI Model:');
    modelResult.rows.forEach(row => {
      console.log(`  ${row.model}: ${row.count} responses`);
    });
    
    // Get recent responses with content preview
    const recentResult = await pool.query(`
      SELECT dr.model, dr.prompt_type, dr.response, d.domain, dr.created_at
      FROM domain_responses dr
      JOIN domains d ON dr.domain_id = d.id
      WHERE dr.created_at >= NOW() - INTERVAL '2 hours'
      ORDER BY dr.created_at DESC
      LIMIT 10
    `);
    
    console.log('\n🔍 RECENT RESPONSES SAMPLE:');
    console.log('=' .repeat(80));
    
    recentResult.rows.forEach((row, index) => {
      console.log(`\n${index + 1}. Domain: ${row.domain}`);
      console.log(`   Model: ${row.model}`);
      console.log(`   Prompt: ${row.prompt_type}`);
      console.log(`   Time: ${row.created_at}`);
      console.log(`   Response Preview: ${row.response.substring(0, 200)}...`);
      console.log(`   Response Length: ${row.response.length} characters`);
    });
    
    // Check for real insights vs generic responses
    const insightResult = await pool.query(`
      SELECT 
        COUNT(*) as total_responses,
        COUNT(CASE WHEN LENGTH(response) > 100 THEN 1 END) as substantial_responses,
        COUNT(CASE WHEN response ILIKE '%business model%' THEN 1 END) as business_analysis,
        COUNT(CASE WHEN response ILIKE '%competitive%' THEN 1 END) as competitive_analysis,
        COUNT(CASE WHEN response ILIKE '%market%' THEN 1 END) as market_analysis,
        AVG(LENGTH(response)) as avg_response_length
      FROM domain_responses 
      WHERE created_at >= NOW() - INTERVAL '2 hours'
    `);
    
    const insights = insightResult.rows[0];
    console.log('\n📊 DATA QUALITY METRICS:');
    console.log(`  Total Recent Responses: ${insights.total_responses}`);
    console.log(`  Substantial Responses (>100 chars): ${insights.substantial_responses} (${((insights.substantial_responses/insights.total_responses)*100).toFixed(1)}%)`);
    console.log(`  Business Analysis Mentions: ${insights.business_analysis}`);
    console.log(`  Competitive Analysis Mentions: ${insights.competitive_analysis}`);
    console.log(`  Market Analysis Mentions: ${insights.market_analysis}`);
    console.log(`  Average Response Length: ${Math.round(insights.avg_response_length)} characters`);
    
    // Get unique domains processed recently
    const domainsResult = await pool.query(`
      SELECT COUNT(DISTINCT dr.domain_id) as unique_domains
      FROM domain_responses dr
      WHERE dr.created_at >= NOW() - INTERVAL '2 hours'
    `);
    
    console.log(`  Unique Domains Analyzed: ${domainsResult.rows[0].unique_domains}`);
    
    // Check for errors or empty responses
    const errorResult = await pool.query(`
      SELECT 
        COUNT(CASE WHEN response = '' OR response IS NULL THEN 1 END) as empty_responses,
        COUNT(CASE WHEN response ILIKE '%error%' THEN 1 END) as error_responses,
        COUNT(CASE WHEN response ILIKE '%no response%' THEN 1 END) as no_responses
      FROM domain_responses 
      WHERE created_at >= NOW() - INTERVAL '2 hours'
    `);
    
    const errors = errorResult.rows[0];
    console.log(`  Empty Responses: ${errors.empty_responses}`);
    console.log(`  Error Responses: ${errors.error_responses}`);
    console.log(`  No Response Messages: ${errors.no_responses}`);
    
    // Success rate
    const successRate = ((insights.total_responses - errors.empty_responses - errors.error_responses - errors.no_responses) / insights.total_responses * 100).toFixed(1);
    console.log(`  Success Rate: ${successRate}%`);
    
    console.log('\n✅ DATA QUALITY CHECK COMPLETE');
    
  } catch (error) {
    console.error('❌ Error checking data quality:', error.message);
  } finally {
    await pool.end();
  }
}

checkDataQuality(); 