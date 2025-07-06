console.log('🔍 CHECKING ALL 8 AI PROVIDERS STATUS...');

const { Pool } = require('pg');

async function main() {
  const pool = new Pool({
    connectionString: "postgresql://raw_capture_db_user:wjFesUM8ISNEvE2b4kZtRAKgGYJVtKK5@dpg-d11fqgndiees73fb35dg-a.oregon-postgres.render.com/raw_capture_db",
    ssl: { rejectUnauthorized: false }
  });

  try {
    const result = await pool.query(`
      SELECT model, COUNT(*) as count 
      FROM domain_responses 
      WHERE created_at > NOW() - INTERVAL '1 hour'
      GROUP BY model 
      ORDER BY count DESC
    `);
    
    console.log('🤖 AI MODELS (LAST HOUR):');
    result.rows.forEach(row => {
      console.log(`  ${row.model}: ${row.count} responses`);
    });
    
    console.log(`Working models: ${result.rows.length}/8`);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

main();
