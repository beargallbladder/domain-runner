const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function checkDomainCounts() {
  try {
    console.log('🔍 Checking domain processing status...');
    
    // Total domains
    const totalResult = await pool.query('SELECT COUNT(*) as total FROM domains');
    console.log(`📊 Total domains: ${totalResult.rows[0].total}`);
    
    // Pending domains
    const pendingResult = await pool.query("SELECT COUNT(*) as pending FROM domains WHERE status = 'pending'");
    console.log(`⏳ Pending domains: ${pendingResult.rows[0].pending}`);
    
    // Completed domains
    const completedResult = await pool.query("SELECT COUNT(*) as completed FROM domains WHERE status = 'completed'");
    console.log(`✅ Completed domains: ${completedResult.rows[0].completed}`);
    
    // Total responses collected
    const responsesResult = await pool.query('SELECT COUNT(*) as responses FROM domain_responses');
    console.log(`💬 Total AI responses: ${responsesResult.rows[0].responses}`);
    
    // Recent responses (last 24 hours)
    const recentResult = await pool.query(`
      SELECT COUNT(*) as recent 
      FROM domain_responses 
      WHERE created_at > NOW() - INTERVAL '24 hours'
    `);
    console.log(`🕐 Responses in last 24h: ${recentResult.rows[0].recent}`);
    
    // Domains processed in last 24 hours
    const domainsProcessedResult = await pool.query(`
      SELECT COUNT(DISTINCT domain_id) as domains_processed 
      FROM domain_responses 
      WHERE created_at > NOW() - INTERVAL '24 hours'
    `);
    console.log(`🏗️ Domains processed in last 24h: ${domainsProcessedResult.rows[0].domains_processed}`);
    
  } catch (error) {
    console.error('❌ Error checking domain counts:', error.message);
  } finally {
    await pool.end();
  }
}

checkDomainCounts(); 