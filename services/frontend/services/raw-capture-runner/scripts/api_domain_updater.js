#!/usr/bin/env node
/**
 * 🚀 API-BASED DOMAIN UPDATER
 * 
 * Purpose: Add premium domains via the existing API (most modular approach)
 * Strategy: Use deployed service's /seed endpoint after temporarily updating domain list
 * Architecture: Leverage existing tested infrastructure
 */

const https = require('https');

class APIDomainUpdater {
  constructor(options = {}) {
    this.baseUrl = options.baseUrl || 'https://raw-capture-runner.onrender.com';
    this.dryRun = options.dryRun || false;
  }

  // 🔧 MODULAR: HTTP request helper
  async makeRequest(url, options = {}) {
    return new Promise((resolve, reject) => {
      const req = https.request(url, options, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          try {
            const result = {
              statusCode: res.statusCode,
              data: res.statusCode === 200 ? JSON.parse(data) : data
            };
            resolve(result);
          } catch (error) {
            resolve({ statusCode: res.statusCode, data: data });
          }
        });
      });
      
      req.on('error', reject);
      
      if (options.method === 'POST' && options.body) {
        req.write(JSON.stringify(options.body));
      }
      
      req.end();
    });
  }

  // 📊 MODULAR: Get current system status
  async getCurrentStatus() {
    try {
      console.log('📊 Checking current system status...');
      const response = await this.makeRequest(`${this.baseUrl}/status`);
      
      if (response.statusCode === 200) {
        console.log('✅ System is operational');
        console.log(`   Total domains: ${response.data.domain_stats.total_domains}`);
        console.log(`   Pending: ${response.data.domain_stats.pending}`);
        console.log(`   Processing: ${response.data.domain_stats.processing}`);
        console.log(`   Completed: ${response.data.domain_stats.completed}`);
        return response.data;
      } else {
        throw new Error(`Status check failed: ${response.statusCode}`);
      }
    } catch (error) {
      console.error('❌ Status check failed:', error.message);
      throw error;
    }
  }

  // 🔧 MODULAR: Test system health
  async testSystemHealth() {
    try {
      console.log('🔍 Testing system health...');
      const response = await this.makeRequest(`${this.baseUrl}/health`);
      
      if (response.statusCode === 200 && response.data.status === 'ok') {
        console.log('✅ System health check passed');
        return true;
      } else {
        throw new Error(`Health check failed: ${response.statusCode}`);
      }
    } catch (error) {
      console.error('❌ Health check failed:', error.message);
      return false;
    }
  }

  // 🚀 MODULAR: Trigger domain seeding
  async triggerSeed() {
    try {
      console.log('🌱 Triggering domain seeding...');
      
      if (this.dryRun) {
        console.log('[DRY RUN] Would trigger seed endpoint');
        return {
          success: true,
          inserted: 'DRY_RUN',
          skipped: 'DRY_RUN',
          message: 'Dry run - no actual seeding performed'
        };
      }

      const response = await this.makeRequest(`${this.baseUrl}/seed`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      if (response.statusCode === 200) {
        console.log('✅ Seed endpoint successful');
        console.log(`   Inserted: ${response.data.inserted} domains`);
        console.log(`   Skipped: ${response.data.skipped} existing domains`);
        console.log(`   Total in list: ${response.data.total_in_list}`);
        return response.data;
      } else {
        throw new Error(`Seed failed: ${response.statusCode} - ${response.data}`);
      }
    } catch (error) {
      console.error('❌ Seed trigger failed:', error.message);
      throw error;
    }
  }

  // 🎯 MODULAR: Main update process
  async updateDomains() {
    console.log('🚀 STARTING API-BASED DOMAIN UPDATE');
    console.log('====================================');
    console.log(`Mode: ${this.dryRun ? 'DRY RUN' : 'LIVE UPDATE'}`);
    console.log(`Target: ${this.baseUrl}`);
    
    try {
      // Step 1: Test system health
      const healthy = await this.testSystemHealth();
      if (!healthy) {
        throw new Error('System health check failed');
      }
      
      // Step 2: Get current status
      const beforeStatus = await this.getCurrentStatus();
      const domainsBefore = parseInt(beforeStatus.domain_stats.total_domains);
      
      // Step 3: Trigger seeding (this will add any new domains from the deployed list)
      console.log('\n🌱 Triggering seed to add new domains...');
      const seedResult = await this.triggerSeed();
      
      // Step 4: Get updated status
      console.log('\n📊 Checking updated status...');
      await new Promise(resolve => setTimeout(resolve, 2000)); // Brief wait
      const afterStatus = await this.getCurrentStatus();
      const domainsAfter = parseInt(afterStatus.domain_stats.total_domains);
      
      // Step 5: Report results
      console.log('\n🎉 UPDATE COMPLETE!');
      console.log('\n📊 Results Summary:');
      console.log(`   Domains before: ${domainsBefore}`);
      console.log(`   Domains after: ${domainsAfter}`);
      console.log(`   Net change: ${domainsAfter - domainsBefore}`);
      console.log(`   Seed result: ${seedResult.inserted} inserted, ${seedResult.skipped} skipped`);
      
      if (domainsAfter > domainsBefore) {
        console.log('✅ SUCCESS: New domains added to processing queue!');
      } else {
        console.log('ℹ️  INFO: No new domains added (all domains already exist)');
      }
      
      return {
        domainsBefore,
        domainsAfter,
        netChange: domainsAfter - domainsBefore,
        seedResult
      };
      
    } catch (error) {
      console.error('💥 Update failed:', error.message);
      throw error;
    }
  }

  // 🔍 MODULAR: Verification method
  async verifyUpdate() {
    console.log('\n🔍 Verifying update...');
    
    try {
      const status = await this.getCurrentStatus();
      const total = parseInt(status.domain_stats.total_domains);
      
      console.log(`✅ Verification complete:`);
      console.log(`   Total domains in system: ${total}`);
      console.log(`   Pending processing: ${status.domain_stats.pending}`);
      console.log(`   Currently processing: ${status.domain_stats.processing}`);
      console.log(`   Completed: ${status.domain_stats.completed}`);
      
      if (total > 350) {
        console.log('🎉 SUCCESS: Domain count increased beyond original 350!');
        return true;
      } else {
        console.log('⚠️  WARNING: Domain count still at original level');
        return false;
      }
      
    } catch (error) {
      console.error('❌ Verification failed:', error.message);
      return false;
    }
  }
}

// 🚀 MAIN EXECUTION
async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const verifyOnly = args.includes('--verify-only');
  
  console.log('🚀 API-BASED DOMAIN UPDATER v1.0.0');
  console.log('===================================');
  
  const updater = new APIDomainUpdater({ 
    dryRun,
    baseUrl: 'https://raw-capture-runner.onrender.com'
  });
  
  try {
    if (verifyOnly) {
      await updater.verifyUpdate();
    } else {
      const result = await updater.updateDomains();
      await updater.verifyUpdate();
      
      console.log('\n📄 Final Report:');
      console.log(`   API-based update ${result.netChange > 0 ? 'successful' : 'completed'}`);
      console.log(`   New domains added: ${result.netChange}`);
      console.log(`   System ready for processing`);
    }
    
  } catch (error) {
    console.error('💥 Fatal error:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main().catch(console.error);
}

module.exports = { APIDomainUpdater }; 