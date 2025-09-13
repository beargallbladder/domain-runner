#!/usr/bin/env node

// CRITICAL DATABASE DEBUGGING SCRIPT
// This script will verify the database state and identify why crawls aren't working

const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://raw_capture_db_user:wjFesUM8ISNEvE2b4kZtRAKgGYJVtKK5@dpg-d11fqgndiees73fb35dg-a.oregon-postgres.render.com/raw_capture_db',
  ssl: { rejectUnauthorized: false }
});

async function debugDatabase() {
  console.log('🔍 CRITICAL DATABASE DEBUGGING');
  console.log('=====================================');
  console.log('Debugging why crawler runs but writes no data...\n');

  try {
    // 1. Test basic connection
    console.log('1️⃣ Testing database connection...');
    await pool.query('SELECT NOW()');
    console.log('✅ Database connection successful\n');

    // 2. List ALL tables
    console.log('2️⃣ Checking which tables exist...');
    const tables = await pool.query(`
      SELECT table_name, table_type 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name
    `);
    
    console.log(`Found ${tables.rows.length} tables:`);
    tables.rows.forEach(table => {
      console.log(`  - ${table.table_name} (${table.table_type})`);
    });
    console.log('');

    // 3. CRITICAL: Check if domain_responses table exists
    console.log('3️⃣ CRITICAL CHECK: Does domain_responses table exist?');
    const domainResponsesExists = tables.rows.find(t => t.table_name === 'domain_responses');
    if (domainResponsesExists) {
      console.log('✅ domain_responses table EXISTS');
      
      // Check its structure
      const schema = await pool.query(`
        SELECT column_name, data_type, is_nullable, column_default
        FROM information_schema.columns 
        WHERE table_name = 'domain_responses'
        ORDER BY ordinal_position
      `);
      
      console.log('   Table structure:');
      schema.rows.forEach(col => {
        console.log(`     ${col.column_name}: ${col.data_type} ${col.is_nullable === 'NO' ? 'NOT NULL' : 'NULL'}`);
      });
      
      // Check if it has data
      const count = await pool.query('SELECT COUNT(*) FROM domain_responses');
      console.log(`   Rows in table: ${count.rows[0].count}`);
      
      // Check recent entries
      const recent = await pool.query(`
        SELECT model, created_at 
        FROM domain_responses 
        ORDER BY created_at DESC 
        LIMIT 5
      `);
      console.log('   Recent entries:');
      recent.rows.forEach(row => {
        console.log(`     ${row.model} - ${row.created_at}`);
      });
      
    } else {
      console.log('❌ domain_responses table DOES NOT EXIST');
      console.log('   🚨 THIS IS THE ROOT CAUSE OF THE PROBLEM!');
      console.log('   The crawler cannot write data to a non-existent table.');
    }
    console.log('');

    // 4. Check domains table
    console.log('4️⃣ Checking domains table...');
    const domainsExists = tables.rows.find(t => t.table_name === 'domains');
    if (domainsExists) {
      const domainCount = await pool.query('SELECT COUNT(*) FROM domains');
      console.log(`✅ domains table exists with ${domainCount.rows[0].count} domains`);
      
      // Show sample domains
      const sampleDomains = await pool.query('SELECT id, domain FROM domains LIMIT 5');
      console.log('   Sample domains:');
      sampleDomains.rows.forEach(d => {
        console.log(`     ${d.id}: ${d.domain}`);
      });
    } else {
      console.log('❌ domains table does not exist');
    }
    console.log('');

    // 5. Check for any failed writes or constraints
    console.log('5️⃣ Checking for recent database errors...');
    try {
      // Try to simulate what the crawler does
      if (domainsExists && domainResponsesExists) {
        const testDomain = await pool.query('SELECT id FROM domains LIMIT 1');
        if (testDomain.rows.length > 0) {
          console.log('   Testing a simulated crawler write...');
          await pool.query(`
            INSERT INTO domain_responses (domain_id, model, response, sentiment_score, memory_score, created_at)
            VALUES ($1, 'debug-test', 'Test response', 50, 50, NOW())
          `, [testDomain.rows[0].id]);
          console.log('✅ Test write successful');
          
          // Clean up the test
          await pool.query(`DELETE FROM domain_responses WHERE model = 'debug-test'`);
        }
      }
    } catch (error) {
      console.log(`❌ Test write failed: ${error.message}`);
      console.log('   This indicates a database permissions or schema issue');
    }
    console.log('');

    // 6. Check migrations status
    console.log('6️⃣ Checking migration status...');
    const migrationTables = tables.rows.filter(t => 
      t.table_name.includes('migration') || 
      t.table_name.includes('schema') ||
      t.table_name.includes('version')
    );
    
    if (migrationTables.length > 0) {
      console.log('   Migration-related tables:');
      migrationTables.forEach(t => console.log(`     - ${t.table_name}`));
    } else {
      console.log('   No migration tracking tables found');
    }
    console.log('');

    // 7. Final diagnosis
    console.log('🏁 DIAGNOSIS & NEXT STEPS');
    console.log('=====================================');
    
    if (!domainResponsesExists) {
      console.log('🚨 ROOT CAUSE: domain_responses table is missing');
      console.log('');
      console.log('IMMEDIATE FIX REQUIRED:');
      console.log('1. Create the domain_responses table with proper schema');
      console.log('2. Ensure the crawler service can access it');
      console.log('3. Re-run the crawler');
      console.log('');
      console.log('SQL to create table:');
      console.log(`
CREATE TABLE domain_responses (
    id SERIAL PRIMARY KEY,
    domain_id UUID NOT NULL,
    model VARCHAR(100) NOT NULL,
    response TEXT NOT NULL,
    sentiment_score DECIMAL(5,2),
    memory_score DECIMAL(5,2),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_domain_responses_domain_id ON domain_responses(domain_id);
CREATE INDEX idx_domain_responses_model ON domain_responses(model);
CREATE INDEX idx_domain_responses_created_at ON domain_responses(created_at DESC);
      `);
    } else if (!domainsExists) {
      console.log('🚨 SECONDARY ISSUE: domains table is missing');
      console.log('The crawler has no domains to process');
    } else {
      console.log('✅ Database structure looks correct');
      console.log('The issue might be with API keys or network connectivity from Render');
    }

  } catch (error) {
    console.error('❌ Database debugging failed:', error.message);
    console.error('Full error:', error);
  } finally {
    await pool.end();
  }
}

// Run the debug
debugDatabase().catch(console.error);