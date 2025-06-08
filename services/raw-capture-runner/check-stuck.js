const { Pool } = require('pg');

async function checkAndFixStuckDomains() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL || 'postgres://localhost:5432/raw_capture',
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
  });

  try {
    console.log('🔍 Checking for stuck domains...\n');
    
    // Test connection first
    await pool.query('SELECT 1');
    
    // Get domains that are stuck in processing
    const stuckDomains = await pool.query(`
      SELECT domain, status, last_processed_at, process_count
      FROM domains 
      WHERE status = 'processing'
      ORDER BY domain
    `);

    console.log('📋 Domains stuck in PROCESSING state:');
    console.log('=====================================');
    
    if (stuckDomains.rows.length === 0) {
      console.log('✅ No domains stuck in processing!');
    } else {
      console.log(`Found ${stuckDomains.rows.length} stuck domains:`);
      stuckDomains.rows.forEach((domain, index) => {
        console.log(`${index + 1}. ${domain.domain}`);
        console.log(`   Status: ${domain.status}`);
        console.log(`   Last processed: ${domain.last_processed_at}`);
        console.log(`   Process count: ${domain.process_count}`);
        console.log('');
      });

      // Fix the stuck domains by resetting them to 'pending'
      console.log('🔧 Resetting stuck domains to pending...');
      
      const resetResult = await pool.query(`
        UPDATE domains 
        SET status = 'pending', 
            last_processed_at = NULL
        WHERE status = 'processing'
        RETURNING domain
      `);

      console.log(`✅ Reset ${resetResult.rowCount} domains to pending status`);
      resetResult.rows.forEach((row, index) => {
        console.log(`   ${index + 1}. ${row.domain} → pending`);
      });
    }

    // Get summary stats
    const summary = await pool.query(`
      SELECT 
        status,
        COUNT(*) as count
      FROM domains 
      GROUP BY status
      ORDER BY status
    `);

    console.log('\n📊 Domain Status Summary:');
    console.log('========================');
    summary.rows.forEach(row => {
      const emoji = row.status === 'completed' ? '✅' : 
                   row.status === 'processing' ? '🔄' : 
                   row.status === 'pending' ? '⏳' : '❌';
      console.log(`${emoji} ${row.status}: ${row.count}`);
    });

  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    console.log('\n🔧 MANUAL FIX INSTRUCTIONS:');
    console.log('============================');
    console.log('Since we can\'t connect to your Render database locally, here\'s how to fix the stuck domains:');
    console.log('');
    console.log('1. Go to your Render dashboard');
    console.log('2. Open your PostgreSQL database');
    console.log('3. Click on "Query" or access the database console');
    console.log('4. Run this SQL command:');
    console.log('');
    console.log('   UPDATE domains');
    console.log('   SET status = \'pending\', last_processed_at = NULL');
    console.log('   WHERE status = \'processing\';');
    console.log('');
    console.log('5. Check the result with:');
    console.log('');
    console.log('   SELECT status, COUNT(*) as count');
    console.log('   FROM domains');
    console.log('   GROUP BY status;');
    console.log('');
    console.log('This will reset the 6 stuck domains back to pending so they can be processed again.');
    console.log('');
    console.log('💡 Alternative: If you have the DATABASE_URL from Render, you can:');
    console.log('   export DATABASE_URL="your_render_database_url"');
    console.log('   node check-stuck.js');
  } finally {
    try {
      await pool.end();
    } catch (e) {
      // Ignore cleanup errors
    }
  }
}

checkAndFixStuckDomains(); 