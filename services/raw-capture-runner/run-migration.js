#!/usr/bin/env node

const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

async function runMigration() {
  console.log('🔧 Starting JOLT schema migration...');
  
  try {
    // Read the migration file
    const migrationPath = path.join(__dirname, 'migrations', '002_add_jolt_support.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    console.log('📖 Loaded migration SQL');
    
    // Execute the migration
    await pool.query(migrationSQL);
    
    console.log('✅ JOLT schema migration completed successfully!');
    console.log('📊 Added JOLT metadata fields to domains table');
    console.log('💰 Added cost tracking fields to responses table');
    console.log('🔍 Created JOLT analysis views');
    console.log('📋 Seeded test JOLT domains');
    
    // Verify the changes
    const joltDomains = await pool.query('SELECT domain, is_jolt, jolt_severity FROM domains WHERE is_jolt = TRUE');
    console.log(`\n🎯 Found ${joltDomains.rows.length} JOLT domains in database:`);
    joltDomains.rows.forEach(row => {
      console.log(`  - ${row.domain} (${row.jolt_severity} severity)`);
    });
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

if (require.main === module) {
  runMigration().catch(error => {
    console.error('Migration error:', error);
    process.exit(1);
  });
}

module.exports = { runMigration }; 