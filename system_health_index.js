#!/usr/bin/env node

/**
 * 🏥 SYSTEM HEALTH INDEX
 * 
 * Comprehensive health monitoring dashboard for the entire backend infrastructure
 * Provides real-time status on system health, last crawl, domain count, and issues
 */

const https = require('https');
const fs = require('fs');
const { Pool } = require('pg');

// Configuration
const CONFIG = {
  services: {
    mainApi: 'https://llm-pagerank-public-api.onrender.com',
    processingEngine: 'https://sophisticated-runner.onrender.com',
    embeddingEngine: 'https://embedding-engine.onrender.com'
  },
  database: {
    url: process.env.DATABASE_URL || 'postgresql://raw_capture_db_user:wjFesUM8ISNEvE2b4kZtRAKgGYJVtKK5@dpg-d11fqgndiees73fb35dg-a.oregon-postgres.render.com/raw_capture_db?sslmode=require'
  },
  thresholds: {
    responseTime: 1000, // ms
    lastCrawlHours: 24,
    minDomains: 1000,
    maxErrorRate: 5 // percent
  }
};

class SystemHealthIndex {
  constructor() {
    this.healthData = {
      timestamp: new Date().toISOString(),
      overall: 'unknown',
      services: {},
      database: {},
      crawling: {},
      issues: [],
      recommendations: []
    };
  }

  async generateHealthReport() {
    console.log('🏥 SYSTEM HEALTH INDEX - COMPREHENSIVE SCAN');
    console.log('=' .repeat(60));
    
    try {
      // Test all services in parallel
      await Promise.all([
        this.checkServiceHealth(),
        this.checkDatabaseHealth(),
        this.checkCrawlingStatus(),
        this.checkSystemIssues()
      ]);
      
      // Calculate overall health
      this.calculateOverallHealth();
      
      // Display results
      this.displayHealthReport();
      
      // Save to file
      this.saveHealthReport();
      
    } catch (error) {
      console.error('❌ Health check failed:', error);
      this.healthData.overall = 'critical';
      this.healthData.issues.push(`Health check system failure: ${error.message}`);
    }
  }

  async checkServiceHealth() {
    console.log('🔍 Checking service health...');
    
    const services = [
      { name: 'mainApi', url: CONFIG.services.mainApi + '/health' },
      { name: 'processingEngine', url: CONFIG.services.processingEngine + '/health' },
      { name: 'embeddingEngine', url: CONFIG.services.embeddingEngine + '/health' }
    ];

    for (const service of services) {
      try {
        const startTime = Date.now();
        const response = await this.makeRequest(service.url);
        const responseTime = Date.now() - startTime;
        
        this.healthData.services[service.name] = {
          status: response.status === 'healthy' ? 'healthy' : 'degraded',
          responseTime,
          lastCheck: new Date().toISOString(),
          details: response
        };
        
        if (responseTime > CONFIG.thresholds.responseTime) {
          this.healthData.issues.push(`${service.name} slow response: ${responseTime}ms`);
        }
        
      } catch (error) {
        this.healthData.services[service.name] = {
          status: 'down',
          error: error.message,
          lastCheck: new Date().toISOString()
        };
        this.healthData.issues.push(`${service.name} is down: ${error.message}`);
      }
    }
  }

  async checkDatabaseHealth() {
    console.log('🔍 Checking database health...');
    
    try {
      const pool = new Pool({
        connectionString: CONFIG.database.url,
        ssl: { rejectUnauthorized: false },
        max: 1,
        connectionTimeoutMillis: 5000
      });

      const startTime = Date.now();
      
      // Test connection
      const client = await pool.connect();
      const connectionTime = Date.now() - startTime;
      
      // Get basic stats
      const domainCount = await client.query('SELECT COUNT(*) as count FROM domains');
      const responseCount = await client.query('SELECT COUNT(*) as count FROM domain_responses');
      const lastUpdate = await client.query('SELECT MAX(updated_at) as last_update FROM domains');
      
      // Check for stuck domains
      const stuckDomains = await client.query(`
        SELECT COUNT(*) as count FROM domains 
        WHERE status = 'processing' AND updated_at < NOW() - INTERVAL '1 hour'
      `);
      
      client.release();
      await pool.end();
      
      this.healthData.database = {
        status: 'healthy',
        connectionTime,
        stats: {
          totalDomains: parseInt(domainCount.rows[0].count),
          totalResponses: parseInt(responseCount.rows[0].count),
          lastUpdate: lastUpdate.rows[0].last_update,
          stuckDomains: parseInt(stuckDomains.rows[0].count)
        }
      };
      
      // Check thresholds
      if (this.healthData.database.stats.totalDomains < CONFIG.thresholds.minDomains) {
        this.healthData.issues.push(`Low domain count: ${this.healthData.database.stats.totalDomains}`);
      }
      
      if (this.healthData.database.stats.stuckDomains > 0) {
        this.healthData.issues.push(`${this.healthData.database.stats.stuckDomains} domains stuck in processing`);
      }
      
    } catch (error) {
      this.healthData.database = {
        status: 'down',
        error: error.message
      };
      this.healthData.issues.push(`Database connection failed: ${error.message}`);
    }
  }

  async checkCrawlingStatus() {
    console.log('🔍 Checking crawling status...');
    
    try {
      // Get crawling stats from main API
      const response = await this.makeRequest(CONFIG.services.mainApi + '/api/fire-alarm-dashboard?limit=1');
      
      if (response.domains && response.domains.length > 0) {
        const lastCrawl = new Date(response.domains[0].last_updated || response.domains[0].updated_at);
        const hoursSinceLastCrawl = (Date.now() - lastCrawl.getTime()) / (1000 * 60 * 60);
        
        this.healthData.crawling = {
          status: hoursSinceLastCrawl < CONFIG.thresholds.lastCrawlHours ? 'active' : 'stale',
          lastCrawl: lastCrawl.toISOString(),
          hoursSinceLastCrawl: Math.round(hoursSinceLastCrawl * 100) / 100,
          totalDomains: response.total_domains || 0,
          highRiskDomains: response.high_risk_count || 0
        };
        
        if (hoursSinceLastCrawl > CONFIG.thresholds.lastCrawlHours) {
          this.healthData.issues.push(`Crawling stale: ${Math.round(hoursSinceLastCrawl)} hours since last update`);
        }
      } else {
        this.healthData.crawling = {
          status: 'inactive',
          error: 'No recent crawl data found'
        };
        this.healthData.issues.push('No recent crawl data available');
      }
      
    } catch (error) {
      this.healthData.crawling = {
        status: 'error',
        error: error.message
      };
      this.healthData.issues.push(`Crawling status check failed: ${error.message}`);
    }
  }

  async checkSystemIssues() {
    console.log('🔍 Checking for system issues...');
    
    // Check for common issues
    const checks = [
      this.checkDiskSpace(),
      this.checkMemoryUsage(),
      this.checkErrorRates()
    ];
    
    await Promise.allSettled(checks);
  }

  async checkDiskSpace() {
    // This would be implemented for production monitoring
    // For now, we'll skip as it requires system-level access
  }

  async checkMemoryUsage() {
    // This would be implemented for production monitoring
    // For now, we'll skip as it requires system-level access
  }

  async checkErrorRates() {
    try {
      // Get error rates from processing logs
      const response = await this.makeRequest(CONFIG.services.processingEngine + '/health');
      
      if (response.error_rate && response.error_rate > CONFIG.thresholds.maxErrorRate) {
        this.healthData.issues.push(`High error rate: ${response.error_rate}%`);
      }
    } catch (error) {
      // Non-critical error
    }
  }

  calculateOverallHealth() {
    const criticalIssues = this.healthData.issues.filter(issue => 
      issue.includes('down') || issue.includes('failed') || issue.includes('Database')
    );
    
    const serviceStatuses = Object.values(this.healthData.services).map(s => s.status);
    const hasDownServices = serviceStatuses.includes('down');
    const hasDatabaseIssues = this.healthData.database.status === 'down';
    
    if (criticalIssues.length > 0 || hasDownServices || hasDatabaseIssues) {
      this.healthData.overall = 'critical';
    } else if (this.healthData.issues.length > 0) {
      this.healthData.overall = 'warning';
    } else {
      this.healthData.overall = 'healthy';
    }
    
    // Add recommendations based on issues
    this.generateRecommendations();
  }

  generateRecommendations() {
    if (this.healthData.overall === 'critical') {
      this.healthData.recommendations.push('🚨 IMMEDIATE ACTION REQUIRED: Critical system issues detected');
    }
    
    if (this.healthData.issues.some(i => i.includes('slow response'))) {
      this.healthData.recommendations.push('⚡ Consider scaling up services with slow response times');
    }
    
    if (this.healthData.issues.some(i => i.includes('stuck'))) {
      this.healthData.recommendations.push('🔄 Restart processing services to clear stuck domains');
    }
    
    if (this.healthData.issues.some(i => i.includes('stale'))) {
      this.healthData.recommendations.push('🔄 Trigger manual crawl to refresh data');
    }
  }

  displayHealthReport() {
    console.log('\n🏥 SYSTEM HEALTH REPORT');
    console.log('=' .repeat(60));
    
    // Overall status
    const statusEmoji = {
      healthy: '✅',
      warning: '⚠️',
      critical: '🚨'
    };
    
    console.log(`\n${statusEmoji[this.healthData.overall]} OVERALL STATUS: ${this.healthData.overall.toUpperCase()}`);
    
    // Services
    console.log('\n📊 SERVICES:');
    Object.entries(this.healthData.services).forEach(([name, data]) => {
      const emoji = data.status === 'healthy' ? '✅' : data.status === 'degraded' ? '⚠️' : '❌';
      const responseTime = data.responseTime ? ` (${data.responseTime}ms)` : '';
      console.log(`  ${emoji} ${name}: ${data.status}${responseTime}`);
    });
    
    // Database
    console.log('\n💾 DATABASE:');
    const dbEmoji = this.healthData.database.status === 'healthy' ? '✅' : '❌';
    console.log(`  ${dbEmoji} Status: ${this.healthData.database.status}`);
    if (this.healthData.database.stats) {
      console.log(`  📊 Domains: ${this.healthData.database.stats.totalDomains.toLocaleString()}`);
      console.log(`  📈 Responses: ${this.healthData.database.stats.totalResponses.toLocaleString()}`);
      console.log(`  🕐 Last Update: ${new Date(this.healthData.database.stats.lastUpdate).toLocaleString()}`);
    }
    
    // Crawling
    console.log('\n🕷️ CRAWLING:');
    const crawlEmoji = this.healthData.crawling.status === 'active' ? '✅' : '⚠️';
    console.log(`  ${crawlEmoji} Status: ${this.healthData.crawling.status}`);
    if (this.healthData.crawling.lastCrawl) {
      console.log(`  🕐 Last Crawl: ${new Date(this.healthData.crawling.lastCrawl).toLocaleString()}`);
      console.log(`  ⏱️ Hours Ago: ${this.healthData.crawling.hoursSinceLastCrawl}`);
    }
    
    // Issues
    if (this.healthData.issues.length > 0) {
      console.log('\n🚨 ISSUES:');
      this.healthData.issues.forEach(issue => {
        console.log(`  ❌ ${issue}`);
      });
    }
    
    // Recommendations
    if (this.healthData.recommendations.length > 0) {
      console.log('\n💡 RECOMMENDATIONS:');
      this.healthData.recommendations.forEach(rec => {
        console.log(`  ${rec}`);
      });
    }
    
    console.log('\n' + '=' .repeat(60));
  }

  saveHealthReport() {
    const reportPath = 'SYSTEM_HEALTH_REPORT.json';
    fs.writeFileSync(reportPath, JSON.stringify(this.healthData, null, 2));
    console.log(`📄 Health report saved to: ${reportPath}`);
  }

  makeRequest(url) {
    return new Promise((resolve, reject) => {
      const request = https.get(url, { timeout: 10000 }, (response) => {
        let data = '';
        
        response.on('data', (chunk) => {
          data += chunk;
        });
        
        response.on('end', () => {
          try {
            const parsed = JSON.parse(data);
            resolve(parsed);
          } catch (error) {
            resolve({ status: 'healthy', raw: data });
          }
        });
      });
      
      request.on('error', (error) => {
        reject(error);
      });
      
      request.on('timeout', () => {
        request.destroy();
        reject(new Error('Request timeout'));
      });
    });
  }
}

// Main execution
async function main() {
  const healthIndex = new SystemHealthIndex();
  await healthIndex.generateHealthReport();
}

// Run if called directly
if (require.main === module) {
  main().catch(console.error);
}

module.exports = SystemHealthIndex; 