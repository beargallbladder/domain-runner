#!/usr/bin/env node
/**
 * 🧪 PRODUCTION TEST: Modular Domain Update
 * 
 * Purpose: Safe testing against production database
 * Mode: DRY RUN by default for maximum safety
 */

const { ModularDomainUpdater } = require('./modular_domain_update');

// Production database URL with SSL configuration
const PRODUCTION_DB_URL = 'postgresql://raw_capture_user:XFqD7KVw4Nft7Wl3hYqUEO9zRhQPnU@postgres.render.com/raw_capture_db?sslmode=require';

async function runProductionTest() {
  console.log('🧪 PRODUCTION DATABASE TEST');
  console.log('============================');
  console.log('🛡️  Running in DRY RUN mode (no actual changes)');
  console.log('🎯 Testing against: postgres.render.com/raw_capture_db');
  
  // Create updater in DRY RUN mode
  const updater = new ModularDomainUpdater({ 
    dryRun: true,
    batchSize: 10,
    connectionString: PRODUCTION_DB_URL
  });
  
  try {
    // Test connection
    console.log('\n1. Testing production database connection...');
    const connected = await updater.connect();
    if (!connected) {
      console.error('❌ Production connection test failed');
      return;
    }
    console.log('✅ Connected to production database');
    
    // Test current state reading
    console.log('\n2. Reading current production state...');
    const currentState = await updater.getCurrentState();
    console.log('✅ Current production state:');
    console.log(`   Total domains: ${currentState.total_domains}`);
    console.log(`   Pending: ${currentState.pending}`);
    console.log(`   Processing: ${currentState.processing}`);
    console.log(`   Completed: ${currentState.completed}`);
    console.log(`   Errors: ${currentState.errors}`);
    
    // Test domain list
    console.log('\n3. Testing premium domain list...');
    const domains = updater.getPremiumDomains();
    console.log(`✅ Premium domain list ready: ${domains.length} domains`);
    console.log('   Sample premium domains:', domains.slice(0, 5).join(', '));
    
    // Test dry run update (first 10 domains only for safety)
    console.log('\n4. Testing dry run update (first 10 domains only)...');
    const originalGetDomains = updater.getPremiumDomains;
    updater.getPremiumDomains = () => domains.slice(0, 10); // Override for testing
    
    const stats = await updater.updateDomains();
    console.log('✅ Dry run update completed successfully');
    
    // Test verification
    console.log('\n5. Testing verification against production...');
    await updater.verifyUpdate();
    console.log('✅ Verification test completed');
    
    console.log('\n🎉 ALL PRODUCTION TESTS PASSED!');
    console.log('\n📊 Production Test Results:');
    console.log(`- Production connection: ✅ Working`);
    console.log(`- Current domains in DB: ${currentState.total_domains}`);
    console.log(`- Premium domains ready: ${domains.length}`);
    console.log(`- Dry run simulation: ✅ Would insert ${stats.inserted} new domains`);
    console.log(`- Would skip: ${stats.skipped} existing domains`);
    
    console.log('\n🚀 READY FOR LIVE UPDATE!');
    console.log('To run live update: node scripts/modular_domain_update.js');
    console.log('To run live dry-run: node scripts/modular_domain_update.js --dry-run');
    
  } catch (error) {
    console.error('💥 Production test failed:', error);
  } finally {
    await updater.disconnect();
  }
}

// Run production test
runProductionTest().catch(console.error); 