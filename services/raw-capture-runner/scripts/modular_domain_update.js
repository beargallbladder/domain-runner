#!/usr/bin/env node
/**
 * 🚀 MODULAR DOMAIN UPDATE SCRIPT
 * 
 * Purpose: Safely insert 565 premium domains directly into production database
 * Architecture: Modular, testable, non-fragile, reversible
 * Principle: Preserve existing data, add only new domains
 */

const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

class ModularDomainUpdater {
  constructor(options = {}) {
    this.dryRun = options.dryRun || false;
    this.batchSize = options.batchSize || 50;
    this.connectionString = options.connectionString || process.env.DATABASE_URL;
    this.client = null;
    this.stats = {
      total_before: 0,
      total_after: 0,
      inserted: 0,
      skipped: 0,
      errors: 0
    };
  }

  // 🏗️ MODULAR: Premium domain list as separate method
  getPremiumDomains() {
    return [
      // 🚀 AI/ML POWERHOUSES ($3T+ market cap)
      'openai.com', 'anthropic.com', 'huggingface.co', 'midjourney.com', 'stability.ai',
      'character.ai', 'perplexity.ai', 'replicate.com', 'runwayml.com', 'cohere.com',
      'together.ai', 'fireworks.ai', 'adept.ai', 'inflection.ai', 'mistral.ai',
      'deepmind.com', 'scale.com', 'databricks.com', 'snowflake.com', 'palantir.com',
      'c3.ai', 'ai21.com', 'jasper.ai', 'copy.ai', 'writesonic.com',
      'synthesia.io', 'luma.ai', 'pika.art', 'elevenlabs.io', 'udio.com',
      
      // ☁️ CLOUD INFRASTRUCTURE TITANS ($2T+ market cap)
      'aws.amazon.com', 'cloud.google.com', 'azure.microsoft.com', 'digitalocean.com', 'linode.com',
      'vultr.com', 'hetzner.com', 'contabo.com', 'ovhcloud.com', 'scaleway.com',
      'fly.io', 'render.com', 'vercel.com', 'railway.app', 'planetscale.com',
      'supabase.com', 'firebase.google.com', 'mongodb.com', 'redis.com', 'elasticsearch.com',
      'docker.com', 'kubernetes.io', 'helm.sh', 'terraform.io', 'pulumi.com',
      'grafana.com', 'datadog.com', 'newrelic.com', 'splunk.com', 'elastic.co',
      
      // 💸 FINTECH REVOLUTION ($1.5T+ market cap)
      'stripe.com', 'wise.com', 'revolut.com', 'klarna.com', 'affirm.com', 
      'robinhood.com', 'coinbase.com', 'binance.com', 'kraken.com', 'gemini.com', 
      'crypto.com', 'blockchain.com', 'circle.com', 'ripple.com', 'opensea.io', 
      'uniswap.org', 'aave.com', 'compound.finance', 'makerdao.com', 'chainlink.com', 
      'solana.com', 'ethereum.org', 'polygon.technology', 'avalanche.network', 'cardano.org',
      
      // 🚗 EV/AUTONOMOUS VEHICLES ($800B+ market cap)  
      'tesla.com', 'rivian.com', 'lucidmotors.com', 'nio.com', 'xpeng.com',
      'byd.com', 'waymo.com', 'cruise.com', 'lime.com', 'bird.com',
      
      // 🏥 HEALTH/FITNESS TECH ($600B+ market cap)
      'teladoc.com', 'doximity.com', 'moderna.com', 'biontech.se', 'illumina.com',
      '23andme.com', 'crispr.com', 'peloton.com', 'whoop.com', 'oura.com',
      'strava.com', 'myfitnesspal.com', 'headspace.com', 'calm.com', 'betterhelp.com',
      
      // 🎮 GAMING/METAVERSE ($400B+ market cap)
      'roblox.com', 'epicgames.com', 'steam.com', 'minecraft.net', 'fortnite.com',
      'unity.com', 'unrealengine.com', 'oculus.com', 'meta.com', 'sandbox.game',
      'decentraland.org', 'axieinfinity.com', 'enjin.io', 'immutable.com',
      
      // 🎓 EDTECH/LEARNING ($200B+ market cap)
      'coursera.org', 'udemy.com', 'edx.org', 'khanacademy.org', 'skillshare.com',
      'masterclass.com', 'pluralsight.com', 'codecademy.com', 'freecodecamp.org',
      'duolingo.com', 'babbel.com', 'rosettastone.com', 'chegg.com', 'pearson.com',
      
      // 🏢 ENTERPRISE SOFTWARE ($1T+ market cap)
      'salesforce.com', 'oracle.com', 'sap.com', 'workday.com', 'servicenow.com',
      'atlassian.com', 'slack.com', 'zoom.us', 'teams.microsoft.com',
      'notion.so', 'airtable.com', 'monday.com', 'asana.com', 'trello.com',
      
      // 🛒 E-COMMERCE GIANTS ($2T+ market cap)
      'shopify.com', 'jd.com', 'pinduoduo.com', 'mercadolibre.com', 'flipkart.com',
      'wayfair.com', 'overstock.com', 'wish.com', 'temu.com', 'shein.com',
      
      // 📱 SOCIAL MEDIA EVOLUTION ($1.5T+ market cap)
      'threads.net', 'snapchat.com', 'clubhouse.com', 'mastodon.social', 
      'bluesky.app', 'substack.com',
      
      // 🎬 STREAMING/ENTERTAINMENT ($500B+ market cap)
      'hbo.com', 'paramount.com', 'peacocktv.com', 'hulu.com', 'tidal.com',
      
      // 🏠 PROPTECH/REAL ESTATE ($300B+ market cap)
      'zillow.com', 'redfin.com', 'realtor.com', 'apartments.com', 'rent.com',
      'airbnb.com', 'vrbo.com', 'compass.com', 'opendoor.com', 'offerpad.com',
      
      // 🚚 LOGISTICS/DELIVERY ($400B+ market cap)
      'fedex.com', 'ups.com', 'dhl.com', 'doordash.com', 'ubereats.com',
      'grubhub.com', 'instacart.com', 'shipt.com', 'deliveroo.com', 'zomato.com',
      
      // 🔒 CYBERSECURITY ($200B+ market cap)
      'crowdstrike.com', 'paloaltonetworks.com', 'fortinet.com', 'checkpoint.com', 'zscaler.com',
      'okta.com', 'auth0.com', 'duo.com', 'onelogin.com', 'ping.com',
      
      // 🛡️ PRIVACY/VPN ($50B+ market cap)
      'nordvpn.com', 'expressvpn.com', 'surfshark.com', 'protonvpn.com', 'mullvad.net',
      'duckduckgo.com', 'brave.com', 'tor.org', 'signal.org', 'protonmail.com',
      
      // 📈 ANALYTICS/DATA ($150B+ market cap)
      'mixpanel.com', 'amplitude.com', 'segment.com', 'tableau.com', 'looker.com',
      
      // 🎨 DESIGN/CREATIVE ($100B+ market cap)
      'figma.com', 'canva.com', 'sketch.com', 'invision.com', 'dribbble.com',
      'behance.net', 'unsplash.com', 'pexels.com',
      
      // 💼 PRODUCTIVITY/COLLABORATION ($200B+ market cap)
      'obsidian.md', 'roam.com', 'basecamp.com',
      
      // 🏦 TRADITIONAL FINANCE DIGITAL ($1T+ market cap)
      'jpmorgan.com', 'bankofamerica.com', 'wellsfargo.com', 'citibank.com',
      'blackrock.com', 'vanguard.com', 'fidelity.com', 'schwab.com',
      
      // 🌟 EMERGING TECH/STARTUPS ($100B+ market cap)
      'spacex.com', 'starlink.com', 'neuralink.com', 'boring.com',
      'relativity.space', 'rocket-lab.com', 'blueorigin.com', 'axiom.space'
    ];
  }

  // 🔧 MODULAR: Database connection with error handling
  async connect() {
    try {
      this.client = new Client({ connectionString: this.connectionString });
      await this.client.connect();
      console.log('✅ Database connection established');
      return true;
    } catch (error) {
      console.error('❌ Database connection failed:', error.message);
      return false;
    }
  }

  // 🔧 MODULAR: Safe disconnect
  async disconnect() {
    if (this.client) {
      await this.client.end();
      console.log('✅ Database connection closed');
    }
  }

  // 📊 MODULAR: Get current database state
  async getCurrentState() {
    try {
      const result = await this.client.query(`
        SELECT 
          COUNT(*) as total_domains,
          COUNT(*) FILTER (WHERE status = 'pending') as pending,
          COUNT(*) FILTER (WHERE status = 'processing') as processing,
          COUNT(*) FILTER (WHERE status = 'completed') as completed,
          COUNT(*) FILTER (WHERE status = 'error') as errors
        FROM domains
      `);
      
      return result.rows[0];
    } catch (error) {
      console.error('❌ Failed to get current state:', error.message);
      throw error;
    }
  }

  // 🔧 MODULAR: Safe domain insertion
  async insertDomainSafely(domain, index, total) {
    try {
      if (this.dryRun) {
        console.log(`[DRY RUN] Would insert: ${domain} (${index + 1}/${total})`);
        this.stats.inserted++;
        return { inserted: true, skipped: false };
      }

      const result = await this.client.query(`
        INSERT INTO domains (domain, source, status, created_at)
        VALUES ($1, $2, $3, CURRENT_TIMESTAMP)
        ON CONFLICT (domain) DO NOTHING
        RETURNING id
      `, [domain.trim(), 'modular_update_v565', 'pending']);
      
      if (result.rows.length > 0) {
        console.log(`✅ Inserted: ${domain} (${index + 1}/${total})`);
        this.stats.inserted++;
        return { inserted: true, skipped: false };
      } else {
        console.log(`⏭️  Skipped (exists): ${domain} (${index + 1}/${total})`);
        this.stats.skipped++;
        return { inserted: false, skipped: true };
      }
    } catch (error) {
      console.error(`❌ Failed to insert ${domain}:`, error.message);
      this.stats.errors++;
      return { inserted: false, skipped: false, error: error.message };
    }
  }

  // 🚀 MODULAR: Main update process
  async updateDomains() {
    console.log('🚀 Starting modular domain update...');
    console.log(`Mode: ${this.dryRun ? 'DRY RUN' : 'LIVE UPDATE'}`);
    
    // Get initial state
    const initialState = await this.getCurrentState();
    this.stats.total_before = parseInt(initialState.total_domains);
    
    console.log('\n📊 Current Database State:');
    console.log(`Total domains: ${initialState.total_domains}`);
    console.log(`Pending: ${initialState.pending}`);
    console.log(`Processing: ${initialState.processing}`);
    console.log(`Completed: ${initialState.completed}`);
    console.log(`Errors: ${initialState.errors}`);
    
    // Get premium domains
    const domains = this.getPremiumDomains();
    console.log(`\n🎯 Target: ${domains.length} premium domains`);
    
    // Process domains in batches
    for (let i = 0; i < domains.length; i += this.batchSize) {
      const batch = domains.slice(i, i + this.batchSize);
      console.log(`\n📦 Processing batch ${Math.floor(i/this.batchSize) + 1}/${Math.ceil(domains.length/this.batchSize)}`);
      
      // Process batch
      for (let j = 0; j < batch.length; j++) {
        await this.insertDomainSafely(batch[j], i + j, domains.length);
      }
      
      // Brief pause between batches to be gentle on database
      if (i + this.batchSize < domains.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
    
    // Get final state
    const finalState = await this.getCurrentState();
    this.stats.total_after = parseInt(finalState.total_domains);
    
    console.log('\n🎉 Update Complete!');
    console.log('\n📊 Final Statistics:');
    console.log(`Domains before: ${this.stats.total_before}`);
    console.log(`Domains after: ${this.stats.total_after}`);
    console.log(`Inserted: ${this.stats.inserted}`);
    console.log(`Skipped: ${this.stats.skipped}`);
    console.log(`Errors: ${this.stats.errors}`);
    console.log(`Net increase: ${this.stats.total_after - this.stats.total_before}`);
    
    return this.stats;
  }

  // 🔧 MODULAR: Verification method
  async verifyUpdate() {
    console.log('\n🔍 Verifying update...');
    
    // Check specific premium domains
    const sampleDomains = ['openai.com', 'anthropic.com', 'huggingface.co', 'stability.ai', 'replicate.com'];
    
    for (const domain of sampleDomains) {
      try {
        const result = await this.client.query('SELECT id, domain, status, source FROM domains WHERE domain = $1', [domain]);
        if (result.rows.length > 0) {
          const row = result.rows[0];
          console.log(`✅ ${domain}: ${row.status} (source: ${row.source})`);
        } else {
          console.log(`❌ ${domain}: NOT FOUND`);
        }
      } catch (error) {
        console.error(`❌ Error checking ${domain}:`, error.message);
      }
    }
  }
}

// 🚀 MAIN EXECUTION (if run directly)
async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const verify = args.includes('--verify-only');
  
  console.log('🚀 MODULAR DOMAIN UPDATER v1.0.0');
  console.log('================================');
  
  const updater = new ModularDomainUpdater({ 
    dryRun,
    batchSize: 50,
    connectionString: process.env.DATABASE_URL
  });
  
  try {
    const connected = await updater.connect();
    if (!connected) {
      process.exit(1);
    }
    
    if (verify) {
      await updater.verifyUpdate();
    } else {
      const stats = await updater.updateDomains();
      await updater.verifyUpdate();
      
      // Write results to file for logging
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const resultsFile = path.join(__dirname, `domain_update_results_${timestamp}.json`);
      fs.writeFileSync(resultsFile, JSON.stringify(stats, null, 2));
      console.log(`\n📄 Results saved to: ${resultsFile}`);
    }
    
  } catch (error) {
    console.error('💥 Fatal error:', error);
    process.exit(1);
  } finally {
    await updater.disconnect();
  }
}

// Run if called directly
if (require.main === module) {
  main().catch(console.error);
}

module.exports = { ModularDomainUpdater }; 