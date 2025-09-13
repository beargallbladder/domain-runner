#!/usr/bin/env ts-node

import fetch from 'node-fetch';
import { Pool } from 'pg';
import { execSync } from 'child_process';

// Database connection
const pool = new Pool({
  connectionString: 'postgresql://raw_capture_db_user:wjFesUM8ISNEvE2b4kZtRAKgGYJVtKK5@dpg-d11fqgndiees73fb35dg-a.oregon-postgres.render.com/raw_capture_db',
  ssl: { rejectUnauthorized: false }
});

class EmergencyResponseSystem {
  private serviceUrl = 'https://sophisticated-runner.onrender.com';
  
  async runFullDiagnostics(): Promise<void> {
    console.log('🚨 EMERGENCY RESPONSE SYSTEM ACTIVATED');
    console.log('═'.repeat(60));
    
    const issues = await this.detectIssues();
    
    if (issues.length === 0) {
      console.log('✅ No critical issues detected');
      return;
    }
    
    console.log(`🔍 Detected ${issues.length} issues:`);
    issues.forEach((issue, i) => {
      console.log(`   ${i + 1}. ${issue.type}: ${issue.description}`);
    });
    
    console.log('\n🛠️  Applying fixes...');
    for (const issue of issues) {
      await this.applyFix(issue);
    }
  }

  async detectIssues(): Promise<Array<{type: string, description: string, severity: 'low' | 'medium' | 'high'}>> {
    const issues = [];
    
    // Check service health
    try {
      const healthResponse = await fetch(`${this.serviceUrl}/health`, { timeout: 10000 });
      if (!healthResponse.ok) {
        issues.push({
          type: 'SERVICE_DOWN',
          description: `Service returning ${healthResponse.status}`,
          severity: 'high' as const
        });
      }
    } catch (error) {
      issues.push({
        type: 'SERVICE_UNREACHABLE',
        description: 'Cannot connect to sophisticated-runner service',
        severity: 'high' as const
      });
    }
    
    // Check database connectivity
    try {
      await pool.query('SELECT 1');
    } catch (error) {
      issues.push({
        type: 'DATABASE_CONNECTION',
        description: `Database connection failed: ${error}`,
        severity: 'high' as const
      });
    }
    
    // Check for stuck domains
    try {
      const stuckResult = await pool.query(`
        SELECT COUNT(*) as stuck_count
        FROM domains 
        WHERE status = 'processing' 
        AND updated_at < NOW() - INTERVAL '15 minutes'
      `);
      
      const stuckCount = parseInt(stuckResult.rows[0].stuck_count);
      if (stuckCount > 0) {
        issues.push({
          type: 'STUCK_DOMAINS',
          description: `${stuckCount} domains stuck in processing state`,
          severity: 'medium' as const
        });
      }
    } catch (error) {
      issues.push({
        type: 'DATABASE_QUERY',
        description: `Cannot query domain status: ${error}`,
        severity: 'high' as const
      });
    }
    
    // Check processing rate
    try {
      const recentResult = await pool.query(`
        SELECT COUNT(*) as recent_count
        FROM domains 
        WHERE status = 'completed' 
        AND updated_at > NOW() - INTERVAL '1 hour'
      `);
      
      const recentCount = parseInt(recentResult.rows[0].recent_count);
      if (recentCount < 50) { // Less than 50 domains per hour
        issues.push({
          type: 'LOW_PROCESSING_RATE',
          description: `Only ${recentCount} domains processed in last hour`,
          severity: 'medium' as const
        });
      }
    } catch (error) {
      console.error('Error checking processing rate:', error);
    }
    
    return issues;
  }

  async applyFix(issue: {type: string, description: string, severity: string}): Promise<void> {
    console.log(`🔧 Applying fix for: ${issue.type}`);
    
    switch (issue.type) {
      case 'SERVICE_DOWN':
      case 'SERVICE_UNREACHABLE':
        await this.restartService();
        break;
        
      case 'STUCK_DOMAINS':
        await this.resetStuckDomains();
        break;
        
      case 'LOW_PROCESSING_RATE':
        await this.triggerProcessingBoost();
        break;
        
      case 'DATABASE_CONNECTION':
        await this.testDatabaseRecovery();
        break;
        
      default:
        console.log(`⚠️  No automated fix available for: ${issue.type}`);
    }
  }

  async restartService(): Promise<void> {
    console.log('🔄 Attempting service restart...');
    
    // For Render.com, we can trigger a redeploy via webhook or git push
    try {
      // First try to trigger processing batch to wake up service
      const response = await fetch(`${this.serviceUrl}/process-pending-domains`, {
        method: 'POST',
        timeout: 30000
      });
      
      if (response.ok) {
        console.log('✅ Service responded to processing request');
      } else {
        console.log('⚠️  Service restart may be needed - consider manual intervention');
      }
    } catch (error) {
      console.log('❌ Service restart failed, manual intervention required');
    }
  }

  async resetStuckDomains(): Promise<void> {
    console.log('🔄 Resetting stuck domains...');
    
    try {
      const result = await pool.query(`
        UPDATE domains 
        SET status = 'pending', updated_at = NOW()
        WHERE status = 'processing' 
        AND updated_at < NOW() - INTERVAL '15 minutes'
        RETURNING id, domain
      `);
      
      console.log(`✅ Reset ${result.rows.length} stuck domains`);
      
      if (result.rows.length > 0) {
        console.log('Reset domains:', result.rows.map(r => r.domain).join(', '));
      }
    } catch (error) {
      console.log(`❌ Failed to reset stuck domains: ${error}`);
    }
  }

  async triggerProcessingBoost(): Promise<void> {
    console.log('⚡ Triggering processing boost...');
    
    try {
      // Trigger multiple batches rapidly
      for (let i = 0; i < 3; i++) {
        const response = await fetch(`${this.serviceUrl}/process-pending-domains`, {
          method: 'POST',
          timeout: 30000
        });
        
        if (response.ok) {
          const result = await response.json();
          console.log(`✅ Batch ${i + 1} triggered: ${JSON.stringify(result)}`);
        } else {
          console.log(`⚠️  Batch ${i + 1} failed: ${response.status}`);
        }
        
        // Wait 10 seconds between batches
        await new Promise(resolve => setTimeout(resolve, 10000));
      }
    } catch (error) {
      console.log(`❌ Processing boost failed: ${error}`);
    }
  }

  async testDatabaseRecovery(): Promise<void> {
    console.log('🔍 Testing database recovery...');
    
    let retries = 3;
    while (retries > 0) {
      try {
        await pool.query('SELECT COUNT(*) FROM domains LIMIT 1');
        console.log('✅ Database connection recovered');
        return;
      } catch (error) {
        retries--;
        console.log(`⚠️  Database test failed, ${retries} retries remaining`);
        
        if (retries > 0) {
          await new Promise(resolve => setTimeout(resolve, 5000));
        }
      }
    }
    
    console.log('❌ Database recovery failed - manual intervention required');
  }

  async generateSystemReport(): Promise<void> {
    console.log('\n📊 SYSTEM STATUS REPORT');
    console.log('═'.repeat(50));
    
    try {
      // Domain counts
      const pendingResult = await pool.query('SELECT COUNT(*) FROM domains WHERE status = $1', ['pending']);
      const completedResult = await pool.query('SELECT COUNT(*) FROM domains WHERE status = $1', ['completed']);
      const processingResult = await pool.query('SELECT COUNT(*) FROM domains WHERE status = $1', ['processing']);
      
      console.log(`📈 Domains Status:`);
      console.log(`   Pending:    ${pendingResult.rows[0].count}`);
      console.log(`   Processing: ${processingResult.rows[0].count}`);
      console.log(`   Completed:  ${completedResult.rows[0].count}`);
      
      // Recent activity
      const recentResult = await pool.query(`
        SELECT COUNT(*) as recent_count
        FROM domains 
        WHERE status = 'completed' 
        AND updated_at > NOW() - INTERVAL '1 hour'
      `);
      
      console.log(`⏱️  Last Hour Activity: ${recentResult.rows[0].recent_count} domains processed`);
      
      // Service health
      try {
        const healthResponse = await fetch(`${this.serviceUrl}/health`, { timeout: 5000 });
        const health = await healthResponse.json();
        console.log(`🔧 Service Health:`, JSON.stringify(health, null, 2));
      } catch (error) {
        console.log(`❌ Service Health: UNREACHABLE`);
      }
      
    } catch (error) {
      console.log(`❌ Error generating report: ${error}`);
    }
  }
}

// Command line interface
async function main() {
  const emergencyResponse = new EmergencyResponseSystem();
  
  const command = process.argv[2] || 'diagnose';
  
  switch (command) {
    case 'diagnose':
      await emergencyResponse.runFullDiagnostics();
      break;
    case 'report':
      await emergencyResponse.generateSystemReport();
      break;
    case 'reset-stuck':
      await emergencyResponse.resetStuckDomains();
      break;
    case 'boost':
      await emergencyResponse.triggerProcessingBoost();
      break;
    default:
      console.log('Usage: ts-node emergency-response.ts [diagnose|report|reset-stuck|boost]');
  }
  
  process.exit(0);
}

if (require.main === module) {
  main().catch(console.error);
}