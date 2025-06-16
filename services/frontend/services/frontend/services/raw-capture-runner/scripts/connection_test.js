#!/usr/bin/env node
/**
 * 🔍 CONNECTION TEST: Find correct database URL
 */

const { Client } = require('pg');

async function testConnection(url, description) {
  console.log(`\n🔍 Testing: ${description}`);
  console.log(`URL: ${url.replace(/:[^:]*@/, ':***@')}`); // Hide password
  
  const client = new Client({ connectionString: url });
  
  try {
    await client.connect();
    console.log('✅ Connection successful!');
    
    // Test a simple query
    const result = await client.query('SELECT COUNT(*) as count FROM domains');
    console.log(`✅ Query successful: ${result.rows[0].count} domains found`);
    
    await client.end();
    return true;
    
  } catch (error) {
    console.log(`❌ Connection failed: ${error.message}`);
    try {
      await client.end();
    } catch (e) {}
    return false;
  }
}

async function findWorkingConnection() {
  console.log('🔍 DATABASE CONNECTION DETECTIVE');
  console.log('================================');
  
  // Test various connection strings
  const testUrls = [
    // Original format
    'postgresql://raw_capture_user:XFqD7KVw4Nft7Wl3hYqUEO9zRhQPnU@postgres.render.com/raw_capture_db',
    
    // With SSL required
    'postgresql://raw_capture_user:XFqD7KVw4Nft7Wl3hYqUEO9zRhQPnU@postgres.render.com/raw_capture_db?sslmode=require',
    
    // Different SSL modes
    'postgresql://raw_capture_user:XFqD7KVw4Nft7Wl3hYqUEO9zRhQPnU@postgres.render.com/raw_capture_db?ssl=true',
    'postgresql://raw_capture_user:XFqD7KVw4Nft7Wl3hYqUEO9zRhQPnU@postgres.render.com/raw_capture_db?sslmode=disable',
    
    // Different host format
    'postgresql://raw_capture_user:XFqD7KVw4Nft7Wl3hYqUEO9zRhQPnU@postgres-render.onrender.com/raw_capture_db?sslmode=require',
    
    // Check if credentials changed - try common variations
    'postgresql://raw_capture_user:XFqD7KVw4Nft7Wl3hYqUEO9zRhQPnU@dpg-cqajadgl6cac739pqgng-a.oregon-postgres.render.com/raw_capture_db?sslmode=require',
  ];
  
  for (let i = 0; i < testUrls.length; i++) {
    const success = await testConnection(testUrls[i], `Test ${i + 1}`);
    if (success) {
      console.log(`\n🎉 FOUND WORKING CONNECTION: Test ${i + 1}`);
      console.log(`Working URL: ${testUrls[i].replace(/:[^:]*@/, ':***@')}`);
      return testUrls[i];
    }
  }
  
  console.log('\n❌ No working connection found. Database may have new credentials.');
  return null;
}

// Run test
findWorkingConnection().catch(console.error); 