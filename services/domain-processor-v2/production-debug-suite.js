#!/usr/bin/env node

// COMPREHENSIVE PRODUCTION DEBUGGING SUITE
// This script will identify and fix ALL crawler issues

const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://raw_capture_db_user:wjFesUM8ISNEvE2b4kZtRAKgGYJVtKK5@dpg-d11fqgndiees73fb35dg-a.oregon-postgres.render.com/raw_capture_db',
  ssl: { rejectUnauthorized: false }
});

async function runComprehensiveDebug() {
  console.log('🔍 COMPREHENSIVE PRODUCTION DEBUGGING');
  console.log('=======================================');
  console.log('Service ID: srv-d1lfb8ur433s73dm0pi0');
  console.log('Issue: Jobs run but write NO data\n');

  const results = {
    database: {},
    schema: {},
    data: {},
    environment: {},
    recommendations: []
  };

  try {
    // 1. DATABASE CONNECTION & BASIC HEALTH
    console.log('1️⃣ DATABASE CONNECTION TEST');
    console.log('----------------------------');
    
    const connectionTest = await pool.query('SELECT NOW() as current_time, version()');
    console.log('✅ Database connection successful');
    console.log(`   Time: ${connectionTest.rows[0].current_time}`);
    console.log(`   Version: ${connectionTest.rows[0].version.split(' ')[0]}`);
    results.database.connected = true;
    results.database.timestamp = connectionTest.rows[0].current_time;
    
    // 2. TABLE EXISTENCE CHECK
    console.log('\n2️⃣ TABLE STRUCTURE ANALYSIS');
    console.log('-----------------------------');
    
    const tables = await pool.query(`
      SELECT table_name, table_type 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('domains', 'domain_responses')
      ORDER BY table_name
    `);
    
    const tableNames = tables.rows.map(t => t.table_name);
    console.log(`Found tables: ${tableNames.join(', ')}`);
    results.schema.tables = tableNames;
    
    // Check domain_responses table specifically
    if (tableNames.includes('domain_responses')) {
      console.log('✅ domain_responses table EXISTS');
      
      // Get schema
      const schema = await pool.query(`
        SELECT column_name, data_type, is_nullable, column_default
        FROM information_schema.columns 
        WHERE table_name = 'domain_responses'
        ORDER BY ordinal_position
      `);
      
      console.log('   Column structure:');
      schema.rows.forEach(col => {
        console.log(`     ${col.column_name}: ${col.data_type}`);
      });
      results.schema.domain_responses = schema.rows;
      
      // Check for critical missing columns
      const columnNames = schema.rows.map(c => c.column_name);
      const requiredColumns = ['domain_id', 'model', 'response', 'created_at'];
      const missingRequired = requiredColumns.filter(c => !columnNames.includes(c));
      
      if (missingRequired.length > 0) {
        console.log(`❌ Missing required columns: ${missingRequired.join(', ')}`);
        results.recommendations.push('Add missing required columns to domain_responses table');
      }
      
      // Check for new vs old schema
      const hasPromptType = columnNames.includes('prompt_type');
      const hasSentimentScore = columnNames.includes('sentiment_score');
      
      if (hasPromptType) {
        console.log('✅ Table uses NEW schema (prompt_type, batch_id) - Python crawler compatible');
        results.schema.type = 'new';
      } else if (hasSentimentScore) {
        console.log('⚠️  Table uses OLD schema (sentiment_score, memory_score) - JavaScript crawler compatible');
        results.schema.type = 'old';
      } else {
        console.log('❓ Table schema unclear - may need updates');
        results.schema.type = 'unknown';
      }
      
    } else {
      console.log('❌ domain_responses table MISSING - This is the problem!');
      results.recommendations.push('Create domain_responses table immediately');
    }
    
    // Check domains table
    if (tableNames.includes('domains')) {
      const domainCount = await pool.query('SELECT COUNT(*) as count FROM domains');
      console.log(`✅ domains table: ${domainCount.rows[0].count} domains available`);
      results.data.domain_count = domainCount.rows[0].count;
      
      // Sample domains
      const samples = await pool.query('SELECT id, domain FROM domains LIMIT 5');
      console.log('   Sample domains:');
      samples.rows.forEach(d => {
        console.log(`     ${d.domain}`);
      });
    } else {
      console.log('❌ domains table MISSING');
      results.recommendations.push('Create domains table and populate with domain data');
    }
    
    // 3. DATA ANALYSIS
    console.log('\n3️⃣ DATA ANALYSIS');
    console.log('-----------------');
    
    if (tableNames.includes('domain_responses')) {
      // Total responses
      const totalResponses = await pool.query('SELECT COUNT(*) as count FROM domain_responses');
      console.log(`Total responses in database: ${totalResponses.rows[0].count}`);
      results.data.total_responses = totalResponses.rows[0].count;
      
      // Recent activity
      const recentResponses = await pool.query(`
        SELECT DATE(created_at) as date, COUNT(*) as count
        FROM domain_responses 
        WHERE created_at > NOW() - INTERVAL '7 days'
        GROUP BY DATE(created_at)
        ORDER BY date DESC
      `);
      
      if (recentResponses.rows.length > 0) {
        console.log('   Recent activity (last 7 days):');
        recentResponses.rows.forEach(r => {
          console.log(`     ${r.date}: ${r.count} responses`);
        });
      } else {
        console.log('❌ NO recent activity in last 7 days');
        results.recommendations.push('Investigate why no data has been written recently');
      }
      
      // Last successful write
      const lastWrite = await pool.query(`
        SELECT created_at, model, COUNT(*) as count
        FROM domain_responses 
        ORDER BY created_at DESC 
        LIMIT 1
      `);
      
      if (lastWrite.rows.length > 0) {
        console.log(`   Last successful write: ${lastWrite.rows[0].created_at}`);
        console.log(`   Last model used: ${lastWrite.rows[0].model}`);
        results.data.last_write = lastWrite.rows[0].created_at;
      }
      
      // Check for August 6 data (user mentioned this was last successful)
      const aug6Data = await pool.query(`
        SELECT COUNT(*) as count 
        FROM domain_responses 
        WHERE DATE(created_at) = '2024-08-06'
      `);
      
      if (aug6Data.rows[0].count > 0) {
        console.log(`✅ Found ${aug6Data.rows[0].count} responses from August 6 (user's last successful crawl)`);
        results.data.aug6_count = aug6Data.rows[0].count;
      }
    }
    
    // 4. ENVIRONMENT ANALYSIS
    console.log('\n4️⃣ RENDER ENVIRONMENT ANALYSIS');
    console.log('-------------------------------');
    
    console.log(`Node.js version: ${process.version}`);
    console.log(`Platform: ${process.platform}`);
    console.log(`Environment: ${process.env.NODE_ENV || 'not set'}`);
    console.log(`Render service: ${process.env.RENDER_SERVICE_NAME || 'not set'}`);
    console.log(`Render external URL: ${process.env.RENDER_EXTERNAL_URL || 'not set'}`);
    
    results.environment = {
      node_version: process.version,
      platform: process.platform,
      render_service: process.env.RENDER_SERVICE_NAME || null,
      external_url: process.env.RENDER_EXTERNAL_URL || null
    };
    
    // Check API keys
    const apiKeys = [
      'OPENAI_API_KEY',
      'ANTHROPIC_API_KEY', 
      'DEEPSEEK_API_KEY',
      'MISTRAL_API_KEY',
      'COHERE_API_KEY',
      'TOGETHER_API_KEY',
      'GROQ_API_KEY',
      'XAI_API_KEY',
      'GOOGLE_API_KEY',
      'GEMINI_API_KEY',
      'AI21_API_KEY',
      'OPENROUTER_API_KEY',
      'PERPLEXITY_API_KEY'
    ];
    
    let foundKeys = 0;
    let missingKeys = [];
    
    console.log('\n   API Key Status:');
    apiKeys.forEach(key => {
      if (process.env[key]) {
        console.log(`   ✅ ${key}: Found`);
        foundKeys++;
      } else {
        console.log(`   ❌ ${key}: Missing`);
        missingKeys.push(key);
      }
    });
    
    results.environment.api_keys_found = foundKeys;
    results.environment.api_keys_total = apiKeys.length;
    results.environment.missing_keys = missingKeys;
    
    if (foundKeys === 0) {
      results.recommendations.push('🚨 CRITICAL: No API keys found - check Render environment variables');
    } else if (foundKeys < 5) {
      results.recommendations.push('⚠️  Few API keys found - may limit crawler effectiveness');
    }
    
    // 5. RENDER SERVICE SPECIFIC CHECKS
    console.log('\n5️⃣ RENDER SERVICE DIAGNOSTICS');
    console.log('------------------------------');
    
    // Check if we can determine what's actually running
    if (process.env.RENDER_SERVICE_NAME) {
      console.log(`✅ Running on Render service: ${process.env.RENDER_SERVICE_NAME}`);
      
      // Check if this matches expected service ID
      if (process.env.RENDER_SERVICE_NAME.includes('d1lfb8ur433s73dm0pi0')) {
        console.log('✅ Service ID matches user-reported ID');
      } else {
        console.log('⚠️  Service ID does not match user-reported srv-d1lfb8ur433s73dm0pi0');
        results.recommendations.push('Verify you are looking at the correct Render service');
      }
    }
    
    // 6. FINAL DIAGNOSIS
    console.log('\n🏁 COMPREHENSIVE DIAGNOSIS');
    console.log('==========================');
    
    // Determine root cause
    if (!tableNames.includes('domain_responses')) {
      console.log('🚨 ROOT CAUSE: domain_responses table missing');
      results.recommendations.unshift('CREATE TABLE domain_responses immediately');
    } else if (results.data.total_responses === 0) {
      console.log('🚨 ROOT CAUSE: Table exists but no data ever written');
      results.recommendations.unshift('Check crawler logic and error handling');
    } else if (!results.data.last_write || new Date(results.data.last_write) < new Date('2024-08-07')) {
      console.log('🚨 ROOT CAUSE: Data exists but nothing written since August 6');
      results.recommendations.unshift('Current crawler is broken - use working Python crawler');
    } else if (foundKeys === 0) {
      console.log('🚨 ROOT CAUSE: No API keys available');
      results.recommendations.unshift('Configure API keys in Render environment');
    } else {
      console.log('❓ Issue unclear - may be crawler logic or deployment problem');
      results.recommendations.unshift('Deploy known-working crawler code');
    }
    
    // Print recommendations
    console.log('\n🎯 IMMEDIATE ACTION PLAN:');
    results.recommendations.forEach((rec, i) => {
      console.log(`${i + 1}. ${rec}`);
    });
    
    // Generate SQL fixes if needed
    if (!tableNames.includes('domain_responses')) {
      console.log('\n📝 SQL TO CREATE MISSING TABLE:');
      console.log(`
CREATE TABLE domain_responses (
    id SERIAL PRIMARY KEY,
    domain_id UUID NOT NULL,
    model VARCHAR(100) NOT NULL,
    prompt_type VARCHAR(50),
    prompt TEXT,
    response TEXT NOT NULL,
    response_time_ms INTEGER,
    retry_count INTEGER DEFAULT 0,
    quality_flag VARCHAR(50),
    processing_timestamp TIMESTAMP DEFAULT NOW(),
    batch_id VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_domain_responses_domain_id ON domain_responses(domain_id);
CREATE INDEX idx_domain_responses_model ON domain_responses(model);
CREATE INDEX idx_domain_responses_created_at ON domain_responses(created_at DESC);
      `);
    }
    
    // Save results to file for later analysis
    require('fs').writeFileSync(
      'debug-results.json', 
      JSON.stringify(results, null, 2)
    );
    console.log('\n💾 Debug results saved to debug-results.json');
    
  } catch (error) {
    console.error('❌ Debug suite failed:', error.message);
    console.error('Full error:', error);
  } finally {
    await pool.end();
  }
}

// Run the comprehensive debug
runComprehensiveDebug().catch(console.error);