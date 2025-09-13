#!/usr/bin/env node

/**
 * 🔍 DOMAIN RESEARCH AGENT
 * ========================
 * Analyzes your 3,177 domain portfolio for:
 * - Quality assessment (clear business model vs unclear)
 * - Gap analysis (missing major players)
 * - Cohort completeness (industry coverage)
 * - Recommendations for additions/removals
 */

const { Pool } = require('pg');
const https = require('https');

const DATABASE_URL = 'postgresql://raw_capture_db_user:wjFesUM8ISNEvE2b4kZtRAKgGYJVtKK5@dpg-d11fqgndiees73fb35dg-a.oregon-postgres.render.com/raw_capture_db';

// 🎯 MAJOR COMPANY COHORTS TO CHECK FOR
const MAJOR_COHORTS = {
  'Tech Giants': [
    'apple.com', 'microsoft.com', 'google.com', 'amazon.com', 'meta.com',
    'netflix.com', 'tesla.com', 'nvidia.com', 'adobe.com', 'salesforce.com',
    'oracle.com', 'ibm.com', 'intel.com', 'cisco.com', 'vmware.com'
  ],
  
  'AI/ML Companies': [
    'openai.com', 'anthropic.com', 'deepmind.com', 'stability.ai', 'huggingface.co',
    'cohere.com', 'mistral.ai', 'perplexity.ai', 'character.ai', 'midjourney.com',
    'runwayml.com', 'jasper.ai', 'copy.ai', 'writesonic.com', 'notion.so'
  ],
  
  'Cloud Infrastructure': [
    'aws.amazon.com', 'azure.microsoft.com', 'cloud.google.com', 'digitalocean.com',
    'linode.com', 'vultr.com', 'cloudflare.com', 'fastly.com', 'vercel.com',
    'netlify.com', 'heroku.com', 'railway.app', 'render.com', 'fly.io'
  ],
  
  'Financial Services': [
    'jpmorgan.com', 'bankofamerica.com', 'wellsfargo.com', 'goldmansachs.com',
    'morganstanley.com', 'citigroup.com', 'americanexpress.com', 'visa.com',
    'mastercard.com', 'paypal.com', 'stripe.com', 'square.com', 'klarna.com'
  ],
  
  'Fintech/Crypto': [
    'coinbase.com', 'binance.com', 'kraken.com', 'gemini.com', 'robinhood.com',
    'sofi.com', 'chime.com', 'plaid.com', 'affirm.com', 'block.xyz',
    'ripple.com', 'chainlink.com', 'uniswap.org', 'opensea.io', 'metamask.io'
  ],
  
  'E-commerce/Retail': [
    'shopify.com', 'bigcommerce.com', 'woocommerce.com', 'magento.com',
    'walmart.com', 'target.com', 'costco.com', 'homedepot.com', 'lowes.com',
    'bestbuy.com', 'wayfair.com', 'overstock.com', 'etsy.com', 'ebay.com'
  ],
  
  'SaaS Platforms': [
    'hubspot.com', 'zendesk.com', 'atlassian.com', 'slack.com', 'zoom.us',
    'dropbox.com', 'box.com', 'asana.com', 'monday.com', 'trello.com',
    'airtable.com', 'figma.com', 'canva.com', 'miro.com', 'linear.app'
  ],
  
  'Media/Content': [
    'youtube.com', 'tiktok.com', 'instagram.com', 'twitter.com', 'linkedin.com',
    'reddit.com', 'discord.com', 'twitch.tv', 'spotify.com', 'soundcloud.com',
    'substack.com', 'medium.com', 'wordpress.com', 'wix.com', 'squarespace.com'
  ],
  
  'Enterprise Software': [
    'workday.com', 'servicenow.com', 'snowflake.com', 'databricks.com',
    'palantir.com', 'splunk.com', 'tableau.com', 'looker.com', 'dbt.com',
    'fivetran.com', 'segment.com', 'amplitude.com', 'mixpanel.com', 'pendo.io'
  ],
  
  'Cybersecurity': [
    'crowdstrike.com', 'paloaltonetworks.com', 'fortinet.com', 'checkpoint.com',
    'okta.com', 'auth0.com', 'onelogin.com', 'duo.com', 'proofpoint.com',
    'symantec.com', 'mcafee.com', 'trendmicro.com', 'kaspersky.com', 'bitdefender.com'
  ]
};

// 🚫 QUESTIONABLE DOMAIN PATTERNS (likely to remove)
const QUESTIONABLE_PATTERNS = [
  /^\d+.*\.com$/,           // Starts with numbers (e.g., "123website.com")
  /^.{1,3}\.com$/,          // Very short domains (e.g., "ab.com")
  /.*test.*\.com$/i,        // Contains "test"
  /.*demo.*\.com$/i,        // Contains "demo"
  /.*example.*\.com$/i,     // Contains "example"
  /.*temp.*\.com$/i,        // Contains "temp"
  /.*placeholder.*\.com$/i, // Contains "placeholder"
  /.*lorem.*\.com$/i,       // Contains "lorem"
  /.*xxx.*\.com$/i,         // Adult content
  /.*gambling.*\.com$/i,    // Gambling
  /.*casino.*\.com$/i,      // Casino
  /.*porn.*\.com$/i,        // Adult content
];

// 🏆 HIGH-VALUE DOMAIN PATTERNS (definitely keep)
const HIGH_VALUE_PATTERNS = [
  /.*\.ai$/,                // AI companies
  /.*\.io$/,                // Tech startups
  /.*bank.*\.com$/i,        // Banking
  /.*pay.*\.com$/i,         // Payment companies
  /.*cloud.*\.com$/i,       // Cloud services
  /.*tech.*\.com$/i,        // Tech companies
  /.*soft.*\.com$/i,        // Software companies
];

class DomainResearchAgent {
  constructor() {
    this.pool = new Pool({
      connectionString: DATABASE_URL,
      ssl: { rejectUnauthorized: false }
    });
    
    this.domains = [];
    this.analysis = {
      total_domains: 0,
      cohort_coverage: {},
      missing_major_players: [],
      questionable_domains: [],
      high_value_domains: [],
      unclear_domains: [],
      recommendations: {
        add: [],
        remove: [],
        investigate: []
      }
    };
  }
  
  async analyze() {
    console.log('🔍 DOMAIN RESEARCH AGENT ANALYSIS');
    console.log('='.repeat(50));
    
    await this.loadDomains();
    await this.analyzeCohortCoverage();
    await this.identifyQuestionableDomains();
    await this.identifyHighValueDomains();
    await this.findMissingMajorPlayers();
    await this.generateRecommendations();
    
    this.printReport();
  }
  
  async loadDomains() {
    console.log('📊 Loading domain portfolio...');
    
    const result = await this.pool.query(`
      SELECT domain, 
             COUNT(dr.id) as response_count,
             MAX(dr.created_at) as last_analyzed
      FROM domains d
      LEFT JOIN domain_responses dr ON d.id = dr.domain_id
      GROUP BY d.domain
      ORDER BY response_count DESC, d.domain
    `);
    
    this.domains = result.rows;
    this.analysis.total_domains = this.domains.length;
    
    console.log(`   Found ${this.analysis.total_domains} domains`);
    console.log(`   ${this.domains.filter(d => d.response_count > 0).length} have AI analysis`);
    console.log(`   ${this.domains.filter(d => d.response_count === 0).length} never analyzed`);
  }
  
  async analyzeCohortCoverage() {
    console.log('\n🎯 Analyzing cohort coverage...');
    
    Object.entries(MAJOR_COHORTS).forEach(([cohort, expectedDomains]) => {
      const found = [];
      const missing = [];
      
      expectedDomains.forEach(domain => {
        if (this.domains.find(d => d.domain === domain)) {
          found.push(domain);
        } else {
          missing.push(domain);
        }
      });
      
      this.analysis.cohort_coverage[cohort] = {
        expected: expectedDomains.length,
        found: found.length,
        missing: missing.length,
        coverage_percent: Math.round((found.length / expectedDomains.length) * 100),
        missing_domains: missing,
        found_domains: found
      };
      
      console.log(`   ${cohort}: ${found.length}/${expectedDomains.length} (${this.analysis.cohort_coverage[cohort].coverage_percent}%)`);
    });
  }
  
  async identifyQuestionableDomains() {
    console.log('\n🚫 Identifying questionable domains...');
    
    this.domains.forEach(domainData => {
      const domain = domainData.domain;
      
      // Check against questionable patterns
      const isQuestionable = QUESTIONABLE_PATTERNS.some(pattern => pattern.test(domain));
      
      // Check for very low response count (might indicate unclear business)
      const hasLowEngagement = domainData.response_count < 3;
      
      // Check for very old domains with no recent analysis
      const isStale = domainData.last_analyzed && 
                      new Date(domainData.last_analyzed) < new Date('2024-01-01');
      
      if (isQuestionable || (hasLowEngagement && isStale)) {
        this.analysis.questionable_domains.push({
          domain,
          reason: isQuestionable ? 'Pattern match' : 'Low engagement + stale',
          response_count: domainData.response_count,
          last_analyzed: domainData.last_analyzed
        });
      }
    });
    
    console.log(`   Found ${this.analysis.questionable_domains.length} questionable domains`);
  }
  
  async identifyHighValueDomains() {
    console.log('\n🏆 Identifying high-value domains...');
    
    this.domains.forEach(domainData => {
      const domain = domainData.domain;
      
      // Check against high-value patterns
      const isHighValue = HIGH_VALUE_PATTERNS.some(pattern => pattern.test(domain));
      
      // Check for domains with lots of analysis (indicates importance)
      const hasHighEngagement = domainData.response_count > 20;
      
      if (isHighValue || hasHighEngagement) {
        this.analysis.high_value_domains.push({
          domain,
          reason: isHighValue ? 'High-value pattern' : 'High engagement',
          response_count: domainData.response_count,
          last_analyzed: domainData.last_analyzed
        });
      }
    });
    
    console.log(`   Found ${this.analysis.high_value_domains.length} high-value domains`);
  }
  
  async findMissingMajorPlayers() {
    console.log('\n🔍 Finding missing major players...');
    
    Object.entries(this.analysis.cohort_coverage).forEach(([cohort, data]) => {
      if (data.missing.length > 0) {
        this.analysis.missing_major_players.push({
          cohort,
          missing_count: data.missing.length,
          missing_domains: data.missing,
          priority: data.missing.length > 5 ? 'HIGH' : data.missing.length > 2 ? 'MEDIUM' : 'LOW'
        });
      }
    });
    
    console.log(`   Found ${this.analysis.missing_major_players.length} cohorts with missing players`);
  }
  
  async generateRecommendations() {
    console.log('\n💡 Generating recommendations...');
    
    // Recommend adding missing major players
    this.analysis.missing_major_players.forEach(cohort => {
      if (cohort.priority === 'HIGH' || cohort.priority === 'MEDIUM') {
        this.analysis.recommendations.add.push(...cohort.missing_domains.map(domain => ({
          domain,
          reason: `Missing from ${cohort.cohort} cohort`,
          priority: cohort.priority
        })));
      }
    });
    
    // Recommend removing questionable domains
    this.analysis.questionable_domains.forEach(item => {
      this.analysis.recommendations.remove.push({
        domain: item.domain,
        reason: item.reason,
        priority: item.response_count === 0 ? 'HIGH' : 'MEDIUM'
      });
    });
    
    // Recommend investigating unclear domains
    this.domains.forEach(domainData => {
      if (domainData.response_count === 0 && 
          !this.analysis.questionable_domains.find(q => q.domain === domainData.domain)) {
        this.analysis.recommendations.investigate.push({
          domain: domainData.domain,
          reason: 'Never analyzed - unclear business model',
          priority: 'LOW'
        });
      }
    });
    
    console.log(`   ${this.analysis.recommendations.add.length} domains to add`);
    console.log(`   ${this.analysis.recommendations.remove.length} domains to remove`);
    console.log(`   ${this.analysis.recommendations.investigate.length} domains to investigate`);
  }
  
  printReport() {
    console.log('\n📋 DOMAIN PORTFOLIO ANALYSIS REPORT');
    console.log('='.repeat(60));
    
    // Portfolio Overview
    console.log('\n📊 PORTFOLIO OVERVIEW:');
    console.log(`   Total domains: ${this.analysis.total_domains}`);
    console.log(`   Analyzed domains: ${this.domains.filter(d => d.response_count > 0).length}`);
    console.log(`   Never analyzed: ${this.domains.filter(d => d.response_count === 0).length}`);
    
    // Cohort Coverage
    console.log('\n🎯 COHORT COVERAGE:');
    Object.entries(this.analysis.cohort_coverage).forEach(([cohort, data]) => {
      const status = data.coverage_percent >= 80 ? '✅' : data.coverage_percent >= 50 ? '⚠️' : '❌';
      console.log(`   ${status} ${cohort}: ${data.coverage_percent}% (${data.found}/${data.expected})`);
    });
    
    // Missing Major Players (Top Priority)
    console.log('\n🚨 MISSING MAJOR PLAYERS (HIGH PRIORITY):');
    const highPriorityMissing = this.analysis.missing_major_players
      .filter(c => c.priority === 'HIGH')
      .slice(0, 5);
    
    highPriorityMissing.forEach(cohort => {
      console.log(`   ${cohort.cohort}:`);
      cohort.missing_domains.slice(0, 5).forEach(domain => {
        console.log(`     • ${domain}`);
      });
    });
    
    // Questionable Domains (Consider Removing)
    console.log('\n🗑️ QUESTIONABLE DOMAINS (CONSIDER REMOVING):');
    this.analysis.questionable_domains.slice(0, 10).forEach(item => {
      console.log(`   • ${item.domain} (${item.reason})`);
    });
    
    // High-Value Domains (Definitely Keep)
    console.log('\n🏆 HIGH-VALUE DOMAINS (DEFINITELY KEEP):');
    this.analysis.high_value_domains.slice(0, 10).forEach(item => {
      console.log(`   • ${item.domain} (${item.response_count} responses)`);
    });
    
    // Recommendations Summary
    console.log('\n💡 RECOMMENDATIONS SUMMARY:');
    console.log(`   🟢 ADD: ${this.analysis.recommendations.add.length} domains`);
    console.log(`   🔴 REMOVE: ${this.analysis.recommendations.remove.length} domains`);
    console.log(`   🟡 INVESTIGATE: ${this.analysis.recommendations.investigate.length} domains`);
    
    console.log('\n📈 IMPACT ANALYSIS:');
    const currentSize = this.analysis.total_domains;
    const addCount = this.analysis.recommendations.add.filter(r => r.priority !== 'LOW').length;
    const removeCount = this.analysis.recommendations.remove.filter(r => r.priority === 'HIGH').length;
    const newSize = currentSize + addCount - removeCount;
    
    console.log(`   Current portfolio: ${currentSize} domains`);
    console.log(`   After optimization: ${newSize} domains`);
    console.log(`   Net change: ${newSize - currentSize > 0 ? '+' : ''}${newSize - currentSize}`);
    console.log(`   Quality improvement: Better cohort coverage + cleaner dataset`);
  }
  
  async exportRecommendations() {
    const report = {
      analysis_date: new Date().toISOString(),
      portfolio_size: this.analysis.total_domains,
      cohort_coverage: this.analysis.cohort_coverage,
      recommendations: this.analysis.recommendations,
      questionable_domains: this.analysis.questionable_domains,
      high_value_domains: this.analysis.high_value_domains
    };
    
    require('fs').writeFileSync(
      './domain_analysis_report.json', 
      JSON.stringify(report, null, 2)
    );
    
    console.log('\n💾 Report saved to domain_analysis_report.json');
  }
  
  async close() {
    await this.pool.end();
  }
}

// CLI Interface
if (require.main === module) {
  const args = process.argv.slice(2);
  
  if (args[0] === 'analyze') {
    const agent = new DomainResearchAgent();
    agent.analyze()
      .then(() => agent.exportRecommendations())
      .then(() => agent.close())
      .catch(console.error);
      
  } else if (args[0] === 'quick') {
    // Quick analysis without full report
    const agent = new DomainResearchAgent();
    agent.loadDomains()
      .then(() => agent.analyzeCohortCoverage())
      .then(() => {
        console.log('\n🎯 QUICK COHORT ANALYSIS:');
        Object.entries(agent.analysis.cohort_coverage).forEach(([cohort, data]) => {
          if (data.coverage_percent < 70) {
            console.log(`❌ ${cohort}: ${data.coverage_percent}% coverage`);
            console.log(`   Missing: ${data.missing_domains.slice(0, 3).join(', ')}${data.missing_domains.length > 3 ? '...' : ''}`);
          }
        });
      })
      .then(() => agent.close())
      .catch(console.error);
      
  } else {
    console.log('🔍 Domain Research Agent');
    console.log('Usage:');
    console.log('  node domain_research_agent.js analyze    # Full portfolio analysis');
    console.log('  node domain_research_agent.js quick      # Quick cohort coverage check');
    console.log('');
    console.log('This analyzes your 3,177 domain portfolio for:');
    console.log('• Missing major players in key industries');
    console.log('• Questionable domains that should be removed');
    console.log('• High-value domains to definitely keep');
    console.log('• Cohort coverage gaps and recommendations');
  }
}

module.exports = { DomainResearchAgent }; 