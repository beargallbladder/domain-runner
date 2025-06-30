const { Pool } = require('pg');
const DATABASE_URL = 'postgresql://raw_capture_db_user:wjFesUM8ISNEvE2b4kZtRAKgGYJVtKK5@dpg-d11fqgndiees73fb35dg-a.oregon-postgres.render.com/raw_capture_db';
const pool = new Pool({ connectionString: DATABASE_URL, ssl: { rejectUnauthorized: false } });

(async () => {
  try {
    const result = await pool.query('SELECT status, COUNT(*) as count FROM domains GROUP BY status ORDER BY count DESC');
    console.log('CURRENT STATUS:');
    result.rows.forEach(row => console.log(`${row.status}: ${row.count}`));
    await pool.end();
  } catch (error) {
    console.error('Error:', error.message);
  }
})(); 