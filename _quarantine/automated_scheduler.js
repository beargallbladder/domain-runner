#!/usr/bin/env node

/**
 * 🚀 AUTOMATED LLM SCHEDULER
 * ==========================
 * Handles cost-tiered processing with automated scheduling
 * 
 * COST TIERS:
 * 🟢 CHEAP: DeepSeek, Together, Perplexity (~$0.0002/call)
 * 🟡 MEDIUM: OpenAI Mini, Mistral (~$0.002/call) 
 * 🔴 EXPENSIVE: Anthropic, Google, OpenAI GPT-4 (~$0.02/call)
 */

const { Pool } = require('pg');
const cron = require('node-cron');
const axios = require('axios');

const DATABASE_URL = 'postgresql://raw_capture_db_user:wjFesUM8ISNEvE2b4kZtRAKgGYJVtKK5@dpg-d11fqgndiees73fb35dg-a.oregon-postgres.render.com/raw_capture_db';
const SOPHISTICATED_RUNNER_URL = 'https://sophisticated-runner.onrender.com';

// 🎯 SCHEDULING CONFIGURATION
const SCHEDULE_CONFIG = {
  // Daily cheap runs - Every day at 6 AM
  DAILY_CHEAP: {
    schedule: '0 6 * * *',
    tier: 'cheap',
    domain_limit: 100,
    estimated_cost: '$0.02',
    description: 'Daily budget run with cheapest models'
  },
  
  // Weekly medium runs - Every Monday at 10 AM  
  WEEKLY_MEDIUM: {
    schedule: '0 10 * * 1',
    tier: 'medium', 
    domain_limit: 500,
    estimated_cost: '$1.00',
    description: 'Weekly medium-cost comprehensive analysis'
  },
  
  // Bi-weekly expensive runs - Every other Monday at 2 PM
  BIWEEKLY_EXPENSIVE: {
    schedule: '0 14 * * 1',
    tier: 'expensive',
    domain_limit: 200,
    estimated_cost: '$4.00',
    description: 'Bi-weekly premium analysis with best models'
  },
  
  // Monthly full crawl - First Sunday of month at 8 AM
  MONTHLY_FULL: {
    schedule: '0 8 1-7 * 0',
    tier: 'all',
    domain_limit: null, // All domains
    estimated_cost: '$50.00',
    description: 'Monthly comprehensive crawl of all domains'
  }
};

// 💰 COST TIER CONFIGURATIONS
const TIER_CONFIGS = {
  cheap: {
    models: ['deepseek', 'together', 'perplexity'],
    cost_per_domain: 0.0006, // 3 models × $0.0002
    max_daily_spend: 2.00,
    priority_domains: 'high_traffic'
  },
  
  medium: {
    models: ['openai', 'mistral', 'deepseek', 'together'],
    cost_per_domain: 0.008, // 4 models × $0.002 avg
    max_weekly_spend: 10.00,
    priority_domains: 'trending'
  },
  
  expensive: {
    models: ['anthropic', 'google', 'openai', 'mistral'],
    cost_per_domain: 0.04, // 4 models × $0.01 avg
    max_monthly_spend: 100.00,
    priority_domains: 'strategic'
  },
  
  all: {
    models: ['all_8_providers'],
    cost_per_domain: 0.05, // All 8 models
    max_monthly_spend: 200.00,
    priority_domains: 'all'
  }
};

class AutomatedScheduler {
  constructor() {
    this.pool = new Pool({
      connectionString: DATABASE_URL,
      ssl: { rejectUnauthorized: false }
    });
    
    this.isRunning = false;
    this.lastRuns = {};
    this.monthlySpend = 0;
    
    console.log('🚀 Automated LLM Scheduler initialized');
    console.log('📅 Scheduling configuration:');
    Object.entries(SCHEDULE_CONFIG).forEach(([key, config]) => {
      console.log(`   ${key}: ${config.schedule} - ${config.description} (${config.estimated_cost})`);
    });
  }
  
  async start() {
    console.log('\n⏰ Starting automated scheduler...');
    
    // Daily cheap runs - Every day at 6 AM
    cron.schedule(SCHEDULE_CONFIG.DAILY_CHEAP.schedule, () => {
      this.runScheduledJob('DAILY_CHEAP');
    });
    
    // Weekly medium runs - Every Monday at 10 AM
    cron.schedule(SCHEDULE_CONFIG.WEEKLY_MEDIUM.schedule, () => {
      this.runScheduledJob('WEEKLY_MEDIUM');
    });
    
    // Bi-weekly expensive runs - Every other Monday at 2 PM
    cron.schedule(SCHEDULE_CONFIG.BIWEEKLY_EXPENSIVE.schedule, () => {
      if (this.shouldRunBiweekly()) {
        this.runScheduledJob('BIWEEKLY_EXPENSIVE');
      }
    });
    
    // Monthly full crawl - First Sunday of month at 8 AM
    cron.schedule(SCHEDULE_CONFIG.MONTHLY_FULL.schedule, () => {
      this.runScheduledJob('MONTHLY_FULL');
    });
    
    console.log('✅ All scheduled jobs configured');
    console.log('🔄 Scheduler is now running...');
    
    // Keep process alive
    process.on('SIGINT', () => {
      console.log('\n🛑 Shutting down scheduler...');
      process.exit(0);
    });
  }
  
  async runScheduledJob(jobType) {
    const config = SCHEDULE_CONFIG[jobType];
    const tierConfig = TIER_CONFIGS[config.tier];
    
    if (this.isRunning) {
      console.log(`⏸️ Skipping ${jobType} - another job is running`);
      return;
    }
    
    try {
      this.isRunning = true;
      console.log(`\n🚀 STARTING ${jobType}`);
      console.log('='.repeat(50));
      console.log(`📅 Time: ${new Date().toISOString()}`);
      console.log(`💰 Tier: ${config.tier} (${config.estimated_cost})`);
      console.log(`🎯 Domain limit: ${config.domain_limit || 'ALL'}`);
      
      // Check budget constraints
      if (!this.checkBudget(tierConfig)) {
        console.log(`💸 Budget exceeded for ${config.tier} tier - skipping`);
        return;
      }
      
      // Get domains for processing
      const domains = await this.getDomainsForProcessing(config.tier, config.domain_limit);
      
      if (domains.length === 0) {
        console.log('📊 No domains need processing');
        return;
      }
      
      // Set domains to pending
      await this.setDomainsPending(domains, jobType);
      
      // Trigger sophisticated-runner processing
      const result = await this.triggerProcessing();
      
      // Log results
      this.logJobResult(jobType, {
        domains_processed: domains.length,
        estimated_cost: domains.length * tierConfig.cost_per_domain,
        result
      });
      
      console.log(`✅ ${jobType} completed successfully`);
      
    } catch (error) {
      console.error(`❌ ${jobType} failed:`, error.message);
    } finally {
      this.isRunning = false;
    }
  }
  
  async getDomainsForProcessing(tier, limit) {
    let query;
    let params = [];
    
    if (tier === 'all') {
      // Monthly full crawl - all completed domains
      query = `
        SELECT id, domain FROM domains 
        WHERE status = 'completed'
        ORDER BY updated_at ASC
      `;
      if (limit) {
        query += ` LIMIT $1`;
        params = [limit];
      }
    } else {
      // Tiered processing - prioritize domains that haven't been processed recently
      const priorities = {
        cheap: "domain LIKE '%.com' AND length(domain) < 15", // Short popular domains
        medium: "domain LIKE ANY(ARRAY['%ai%', '%tech%', '%app%']) OR domain IN (SELECT domain FROM domains WHERE updated_at < NOW() - INTERVAL '7 days')", // AI/tech domains or stale
        expensive: "domain IN (SELECT domain FROM domain_responses GROUP BY domain_id HAVING COUNT(*) < 50)" // Domains with few responses
      };
      
      query = `
        SELECT id, domain FROM domains 
        WHERE status = 'completed' 
        AND (${priorities[tier] || 'true'})
        ORDER BY updated_at ASC
        LIMIT $1
      `;
      params = [limit];
    }
    
    const result = await this.pool.query(query, params);
    console.log(`📊 Found ${result.rows.length} domains for ${tier} tier processing`);
    
    return result.rows;
  }
  
  async setDomainsPending(domains, source) {
    const domainIds = domains.map(d => d.id);
    
    const result = await this.pool.query(`
      UPDATE domains 
      SET status = 'pending', 
          source = $1,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ANY($2)
    `, [source.toLowerCase(), domainIds]);
    
    console.log(`🔄 Set ${result.rowCount} domains to pending status`);
  }
  
  async triggerProcessing() {
    console.log('📡 Triggering sophisticated-runner processing...');
    
    try {
      const response = await axios.post(`${SOPHISTICATED_RUNNER_URL}/process-pending-domains`, {}, {
        timeout: 30000
      });
      
      console.log(`✅ Processing triggered: ${response.data.processed} domains processed`);
      return response.data;
      
    } catch (error) {
      if (error.code === 'ECONNABORTED') {
        console.log('⏳ Processing request timed out (but may still be running)');
        return { processed: 'timeout', message: 'Processing started but timed out' };
      }
      throw error;
    }
  }
  
  checkBudget(tierConfig) {
    // Simple budget check - in production you'd track actual spending
    return this.monthlySpend < tierConfig.max_monthly_spend;
  }
  
  shouldRunBiweekly() {
    // Run bi-weekly jobs on even weeks
    const weekNumber = this.getWeekNumber();
    return weekNumber % 2 === 0;
  }
  
  getWeekNumber() {
    const now = new Date();
    const start = new Date(now.getFullYear(), 0, 1);
    const diff = now.getTime() - start.getTime();
    return Math.ceil(diff / (7 * 24 * 60 * 60 * 1000));
  }
  
  logJobResult(jobType, result) {
    this.lastRuns[jobType] = {
      timestamp: new Date().toISOString(),
      ...result
    };
    
    console.log('\n📊 JOB SUMMARY');
    console.log(`   Domains: ${result.domains_processed}`);
    console.log(`   Cost: $${result.estimated_cost.toFixed(4)}`);
    console.log(`   Status: ${result.result.processed || 'Processing'}`);
  }
  
  async getStatus() {
    const nextRuns = {
      daily_cheap: this.getNextCronTime(SCHEDULE_CONFIG.DAILY_CHEAP.schedule),
      weekly_medium: this.getNextCronTime(SCHEDULE_CONFIG.WEEKLY_MEDIUM.schedule),
      biweekly_expensive: this.getNextCronTime(SCHEDULE_CONFIG.BIWEEKLY_EXPENSIVE.schedule),
      monthly_full: this.getNextCronTime(SCHEDULE_CONFIG.MONTHLY_FULL.schedule)
    };
    
    return {
      scheduler_status: this.isRunning ? 'RUNNING' : 'IDLE',
      next_runs: nextRuns,
      last_runs: this.lastRuns,
      monthly_spend: this.monthlySpend,
      tier_configs: TIER_CONFIGS
    };
  }
  
  getNextCronTime(cronExpression) {
    // Simple next run calculation - in production use a proper cron parser
    const now = new Date();
    return new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString(); // Tomorrow (simplified)
  }
}

// Manual trigger functions
async function triggerManual(tier, limit = 10) {
  console.log(`🚀 MANUAL TRIGGER: ${tier.toUpperCase()} TIER`);
  console.log('='.repeat(40));
  
  const scheduler = new AutomatedScheduler();
  const config = SCHEDULE_CONFIG[`DAILY_${tier.toUpperCase()}`] || {
    tier,
    domain_limit: limit,
    description: `Manual ${tier} run`
  };
  
  await scheduler.runScheduledJob(`MANUAL_${tier.toUpperCase()}`);
}

async function showStatus() {
  const scheduler = new AutomatedScheduler();
  const status = await scheduler.getStatus();
  
  console.log('\n🎯 SCHEDULER STATUS');
  console.log('==================');
  console.log(JSON.stringify(status, null, 2));
}

// CLI Interface
if (require.main === module) {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    // Start automated scheduler
    const scheduler = new AutomatedScheduler();
    scheduler.start();
    
  } else if (args[0] === 'status') {
    showStatus();
    
  } else if (args[0] === 'manual') {
    const tier = args[1] || 'cheap';
    const limit = parseInt(args[2]) || 10;
    triggerManual(tier, limit);
    
  } else {
    console.log('🚀 Automated LLM Scheduler');
    console.log('Usage:');
    console.log('  node automated_scheduler.js                    # Start automated scheduler');
    console.log('  node automated_scheduler.js status             # Show status');
    console.log('  node automated_scheduler.js manual cheap 50    # Manual cheap run (50 domains)');
    console.log('  node automated_scheduler.js manual medium 20   # Manual medium run (20 domains)');
    console.log('  node automated_scheduler.js manual expensive 5 # Manual expensive run (5 domains)');
    console.log('');
    console.log('🎯 Automated Schedule:');
    console.log('  Daily (6 AM):     Cheap models (~$0.02/day)');
    console.log('  Weekly (Mon 10 AM): Medium models (~$1.00/week)');
    console.log('  Bi-weekly (Mon 2 PM): Expensive models (~$4.00/2weeks)');
    console.log('  Monthly (1st Sun 8 AM): Full crawl (~$50.00/month)');
  }
}

module.exports = { AutomatedScheduler, triggerManual, showStatus }; 