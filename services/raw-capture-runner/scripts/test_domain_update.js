#!/usr/bin/env node
/**
 * 🧪 TEST SCRIPT: Modular Domain Update
 * 
 * Purpose: Safe testing of domain update functionality
 * Mode: DRY RUN by default for safety
 */

require('dotenv').config();
const { ModularDomainUpdater } = require('./modular_domain_update');

async function runSafeTest() {
  console.log('🧪 TESTING MODULAR DOMAIN UPDATER');
  console.log('=================================');
  console.log('🛡️  Running in DRY RUN mode (no actual changes)');
  
  // Create updater in DRY RUN mode
  const updater = new ModularDomainUpdater({ 
    dryRun: true,
    batchSize: 10,
    connectionString: process.env.DATABASE_URL
  });
  
  try {
    // Test connection
    console.log('\n1. Testing database connection...');
    const connected = await updater.connect();
    if (!connected) {
      console.error('❌ Connection test failed');
      return;
    }
    
    // Test current state reading
    console.log('\n2. Testing state reading...');
    const currentState = await updater.getCurrentState();
    console.log('✅ Current state retrieved successfully');
    
    // Test domain list
    console.log('\n3. Testing domain list...');
    const domains = updater.getPremiumDomains();
    console.log(`✅ Premium domain list: ${domains.length} domains`);
    console.log('Sample domains:', domains.slice(0, 5).join(', '));
    
    // Test dry run update (first 20 domains only)
    console.log('\n4. Testing dry run update (first 20 domains)...');
    const originalGetDomains = updater.getPremiumDomains;
    updater.getPremiumDomains = () => domains.slice(0, 20); // Override for testing
    
    const stats = await updater.updateDomains();
    console.log('✅ Dry run completed successfully');
    
    // Test verification
    console.log('\n5. Testing verification...');
    await updater.verifyUpdate();
    console.log('✅ Verification test completed');
    
    console.log('\n🎉 ALL TESTS PASSED!');
    console.log('\n📊 Test Results:');
    console.log(`- Connection: ✅ Working`);
    console.log(`- State reading: ✅ Working`);
    console.log(`- Domain list: ✅ ${domains.length} domains ready`);
    console.log(`- Dry run: ✅ Would insert ${stats.inserted} domains`);
    console.log(`- Verification: ✅ Working`);
    
    console.log('\n🚀 Ready for live update! Run with --live flag when ready.');
    
  } catch (error) {
    console.error('💥 Test failed:', error);
  } finally {
    await updater.disconnect();
  }
}

// Run test
runSafeTest().catch(console.error); 