#!/usr/bin/env ts-node

import fetch from 'node-fetch';
import { Pool } from 'pg';

// Database connection
const pool = new Pool({
  connectionString: 'postgresql://raw_capture_db_user:wjFesUM8ISNEvE2b4kZtRAKgGYJVtKK5@dpg-d11fqgndiees73fb35dg-a.oregon-postgres.render.com/raw_capture_db',
  ssl: { rejectUnauthorized: false }
});

async function quickStatus() {
  console.log('🔍 QUICK STATUS CHECK');
  console.log('═'.repeat(50));
  
  try {
    // Check service health
    console.log('🌐 Checking service health...');
    const healthResponse = await fetch('https://sophisticated-runner.onrender.com/health');
    
    if (healthResponse.ok) {
      const health = await healthResponse.json() as any;
      console.log('✅ Service: HEALTHY');
      console.log(`   Status: ${health.status}`);
      console.log(`   Uptime: ${health.uptime_seconds}s`);
    } else {
      console.log(`❌ Service: UNHEALTHY (${healthResponse.status})`);
    }
  } catch (error) {
    console.log('❌ Service: UNREACHABLE');
  }
  
  try {
    // Check database and domain counts
    console.log('\n📊 Checking database...');
    const pendingResult = await pool.query('SELECT COUNT(*) FROM domains WHERE status = $1', ['pending']);
    const completedResult = await pool.query('SELECT COUNT(*) FROM domains WHERE status = $1', ['completed']);
    const processingResult = await pool.query('SELECT COUNT(*) FROM domains WHERE status = $1', ['processing']);
    
    const pending = parseInt(pendingResult.rows[0].count);
    const completed = parseInt(completedResult.rows[0].count);
    const processing = parseInt(processingResult.rows[0].count);
    const total = pending + completed + processing;
    
    console.log('✅ Database: CONNECTED');
    console.log(`   Total domains: ${total.toLocaleString()}`);
    console.log(`   Pending: ${pending.toLocaleString()}`);
    console.log(`   Processing: ${processing.toLocaleString()}`);
    console.log(`   Completed: ${completed.toLocaleString()}`);
    
    // Calculate progress
    const progress = (completed / total * 100);
    console.log(`   Progress: ${progress.toFixed(2)}%`);
    
    // Check recent activity
    const recentResult = await pool.query(`
      SELECT COUNT(*) as recent_count
      FROM domains 
      WHERE status = 'completed' 
      AND updated_at > NOW() - INTERVAL '1 hour'
    `);
    
    const recentCount = parseInt(recentResult.rows[0].recent_count);
    console.log(`   Last hour: ${recentCount} domains processed`);
    
    // Processing rate assessment
    if (recentCount >= 100) {
      console.log('✅ Processing rate: HEALTHY (100+ domains/hour)');
    } else if (recentCount >= 50) {
      console.log('⚠️  Processing rate: SLOW (50-99 domains/hour)');
    } else {
      console.log('❌ Processing rate: CRITICAL (<50 domains/hour)');
    }
    
  } catch (error) {
    console.log('❌ Database: CONNECTION FAILED');
    console.log(`   Error: ${error}`);
  }
  
  console.log('\n🎯 MISSION STATUS');
  console.log('═'.repeat(50));
  console.log('Target: Process 3,183 domains with LLM analysis');
  console.log('Requirements: 1000+ domains/hour, 95%+ API success');
  console.log('');
  
  // Test processing endpoint
  try {
    console.log('🚀 Testing processing endpoint...');
    const processResponse = await fetch('https://sophisticated-runner.onrender.com/process-pending-domains', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
    
    if (processResponse.ok) {
      const result = await processResponse.json();
      console.log('✅ Processing endpoint: WORKING');
      console.log(`   Response: ${JSON.stringify(result)}`);
    } else {
      console.log(`❌ Processing endpoint: FAILED (${processResponse.status})`);
    }
  } catch (error) {
    console.log('❌ Processing endpoint: ERROR');
    console.log(`   Error: ${error}`);
  }
  
  await pool.end();
}

quickStatus().catch(console.error);