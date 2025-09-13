#!/usr/bin/env node

const { exec } = require('child_process');
const { Pool } = require('pg');

// Quick script to continue the optimization process

const DATABASE_URL = 'postgresql://raw_capture_db_user:wjFesUM8ISNEvE2b4kZtRAKgGYJVtKK5@dpg-d11fqgndiees73fb35dg-a.oregon-postgres.render.com/raw_capture_db';
const pool = new Pool({ connectionString: DATABASE_URL, ssl: { rejectUnauthorized: false } });

async function checkAndContinue() {
  console.log('🔍 Checking crawl status...');
  
  try {
    const result = await pool.query(
      'SELECT status, COUNT(*) as count FROM domains GROUP BY status ORDER BY count DESC'
    );
    
    const statusMap = { pending: 0, completed: 0, processing: 0 };
    result.rows.forEach(row => {
      statusMap[row.status] = parseInt(row.count);
    });
    
    console.log(`📊 Current Status:`);
    console.log(`   ✅ Completed: ${statusMap.completed}`);
    console.log(`   ⏳ Pending: ${statusMap.pending}`);
    console.log(`   🔄 Processing: ${statusMap.processing}`);
    
    if (statusMap.pending === 0) {
      console.log('\n🎉 ALL DOMAINS PROCESSED! The crawl optimization is complete.');
      console.log(`🏆 Final result: ${statusMap.completed} domains successfully processed.`);
      return;
    }
    
    console.log(`\n🚀 ${statusMap.pending} domains remaining. Continuing optimization...`);
    console.log('⏱️ Estimated completion time: ~' + Math.ceil(statusMap.pending / 133.5) + ' minutes');
    
    // Launch the optimizer
    exec('node direct_database_optimizer.js', (error, stdout, stderr) => {
      if (error) {
        console.error('❌ Error running optimizer:', error.message);
        return;
      }
      
      if (stderr) {
        console.error('⚠️ Optimizer warnings:', stderr);
      }
      
      console.log(stdout);
      
      // After completion, check status again
      setTimeout(() => {
        checkAndContinue();
      }, 5000);
    });
    
  } catch (error) {
    console.error('❌ Status check failed:', error.message);
  } finally {
    await pool.end();
  }
}

// Run the check
checkAndContinue()
  .then(() => {
    console.log('✅ Optimization check completed');
  })
  .catch(error => {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  });