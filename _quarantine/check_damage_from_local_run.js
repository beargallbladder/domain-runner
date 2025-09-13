const { Pool } = require('pg');

const DATABASE_URL = 'postgresql://raw_capture_db_user:wjFesUM8ISNEvE2b4kZtRAKgGYJVtKK5@dpg-d11fqgndiees73fb35dg-a.oregon-postgres.render.com/raw_capture_db';
const pool = new Pool({ connectionString: DATABASE_URL, ssl: { rejectUnauthorized: false } });

(async () => {
  try {
    // Check current status
    const statusResult = await pool.query('SELECT status, COUNT(*) as count FROM domains GROUP BY status ORDER BY count DESC');
    console.log('CURRENT STATUS BREAKDOWN:');
    statusResult.rows.forEach(row => console.log(`${row.status}: ${row.count}`));
    
    // Check domains completed in last hour (likely the damaged ones)
    const recentResult = await pool.query(`
      SELECT COUNT(*) as damaged_domains 
      FROM domains 
      WHERE status = 'completed' 
      AND updated_at > NOW() - INTERVAL '1 hour'
      AND id NOT IN (SELECT DISTINCT domain_id FROM domain_responses WHERE created_at > NOW() - INTERVAL '1 hour')
    `);
    
    console.log(`\nDAMAGED DOMAINS (completed but no responses): ${recentResult.rows[0].damaged_domains}`);
    
    await pool.end();
  } catch (error) {
    console.error('Error:', error.message);
  }
})(); 