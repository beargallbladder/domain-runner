#!/usr/bin/env ts-node

import fetch from 'node-fetch';
import { Pool } from 'pg';

// Database connection
const pool = new Pool({
  connectionString: 'postgresql://raw_capture_db_user:wjFesUM8ISNEvE2b4kZtRAKgGYJVtKK5@dpg-d11fqgndiees73fb35dg-a.oregon-postgres.render.com/raw_capture_db',
  ssl: { rejectUnauthorized: false }
});

interface MonitoringMetrics {
  timestamp: Date;
  pendingDomains: number;
  completedDomains: number;
  processingRate: number; // domains per hour
  apiSuccessRate: number;
  errorCount: number;
  lastProcessedDomain?: string;
  systemHealth: 'healthy' | 'warning' | 'critical';
}

interface AlertCondition {
  type: 'processing_rate' | 'api_failure' | 'system_error' | 'database_error';
  severity: 'warning' | 'critical';
  message: string;
  timestamp: Date;
}

class RealTimeMonitor {
  private metrics: MonitoringMetrics[] = [];
  private alerts: AlertCondition[] = [];
  private lastDomainCount = 0;
  private startTime = new Date();
  private monitoringInterval: NodeJS.Timeout | null = null;

  constructor() {
    console.log('🚀 Real-time Domain Processing Monitor Starting...');
    console.log('📊 Target: 1000+ domains/hour | 95%+ API success rate');
    console.log('─'.repeat(80));
  }

  async start() {
    // Initial baseline
    await this.collectMetrics();
    
    // Start continuous monitoring every 30 seconds
    this.monitoringInterval = setInterval(async () => {
      await this.collectMetrics();
      await this.checkAlertConditions();
      this.displayRealTimeStatus();
    }, 30000);

    // Display dashboard every 5 seconds
    setInterval(() => {
      this.displayDashboard();
    }, 5000);

    console.log('✅ Monitoring started - Press Ctrl+C to stop');
  }

  async collectMetrics(): Promise<void> {
    try {
      const timestamp = new Date();
      
      // Get domain counts
      const pendingResult = await pool.query('SELECT COUNT(*) FROM domains WHERE status = $1', ['pending']);
      const completedResult = await pool.query('SELECT COUNT(*) FROM domains WHERE status = $1', ['completed']);
      
      const pendingDomains = parseInt(pendingResult.rows[0].count);
      const completedDomains = parseInt(completedResult.rows[0].count);
      
      // Calculate processing rate
      const elapsedHours = (timestamp.getTime() - this.startTime.getTime()) / (1000 * 60 * 60);
      const domainsProcessed = this.lastDomainCount > 0 ? this.lastDomainCount - pendingDomains : 0;
      const processingRate = elapsedHours > 0 ? domainsProcessed / elapsedHours : 0;
      
      // Get last processed domain
      const lastDomainResult = await pool.query(
        'SELECT domain FROM domains WHERE status = $1 ORDER BY id DESC LIMIT 1', 
        ['completed']
      );
      const lastProcessedDomain = lastDomainResult.rows[0]?.domain;

      // Check API success rate (simplified - would need error logging in production)
      const apiSuccessRate = await this.checkApiSuccessRate();
      
      // System health assessment
      let systemHealth: 'healthy' | 'warning' | 'critical' = 'healthy';
      if (processingRate < 100) systemHealth = 'warning';
      if (processingRate < 50 || apiSuccessRate < 0.90) systemHealth = 'critical';

      const metrics: MonitoringMetrics = {
        timestamp,
        pendingDomains,
        completedDomains,
        processingRate,
        apiSuccessRate,
        errorCount: 0, // Would track from error logs
        lastProcessedDomain,
        systemHealth
      };

      this.metrics.push(metrics);
      this.lastDomainCount = pendingDomains;
      
      // Keep only last 100 metrics
      if (this.metrics.length > 100) {
        this.metrics = this.metrics.slice(-100);
      }

    } catch (error) {
      console.error('❌ Error collecting metrics:', error);
      this.addAlert({
        type: 'database_error',
        severity: 'critical',
        message: `Database connection failed: ${error}`,
        timestamp: new Date()
      });
    }
  }

  async checkApiSuccessRate(): Promise<number> {
    try {
      // Test API endpoint health
      const response = await fetch('https://sophisticated-runner.onrender.com/health', {
        timeout: 5000
      });
      return response.ok ? 1.0 : 0.0;
    } catch {
      return 0.0;
    }
  }

  async checkAlertConditions(): Promise<void> {
    if (this.metrics.length === 0) return;

    const latest = this.metrics[this.metrics.length - 1];
    
    // Processing rate alerts
    if (latest.processingRate < 100) {
      this.addAlert({
        type: 'processing_rate',
        severity: latest.processingRate < 50 ? 'critical' : 'warning',
        message: `Processing rate low: ${latest.processingRate.toFixed(1)} domains/hour (target: 1000+)`,
        timestamp: new Date()
      });
    }

    // API failure alerts
    if (latest.apiSuccessRate < 0.95) {
      this.addAlert({
        type: 'api_failure',
        severity: latest.apiSuccessRate < 0.90 ? 'critical' : 'warning',
        message: `API success rate: ${(latest.apiSuccessRate * 100).toFixed(1)}% (target: 95%+)`,
        timestamp: new Date()
      });
    }

    // System health alerts
    if (latest.systemHealth === 'critical') {
      this.addAlert({
        type: 'system_error',
        severity: 'critical',
        message: 'System health critical - immediate attention required',
        timestamp: new Date()
      });
    }
  }

  private addAlert(alert: AlertCondition): void {
    this.alerts.push(alert);
    
    // Keep only last 50 alerts
    if (this.alerts.length > 50) {
      this.alerts = this.alerts.slice(-50);
    }

    // Display critical alerts immediately
    if (alert.severity === 'critical') {
      console.log(`\n🚨 CRITICAL ALERT: ${alert.message}`);
      this.triggerEmergencyResponse(alert);
    }
  }

  private async triggerEmergencyResponse(alert: AlertCondition): Promise<void> {
    console.log('🛠️  Triggering emergency response...');
    
    switch (alert.type) {
      case 'api_failure':
        console.log('📞 Checking API endpoints...');
        await this.diagnoseApiIssues();
        break;
      case 'processing_rate':
        console.log('⚡ Analyzing processing bottlenecks...');
        await this.diagnoseProcessingIssues();
        break;
      case 'system_error':
        console.log('🔧 Running system diagnostics...');
        await this.runSystemDiagnostics();
        break;
    }
  }

  private async diagnoseApiIssues(): Promise<void> {
    try {
      const response = await fetch('https://sophisticated-runner.onrender.com/health');
      const health = await response.json();
      console.log('📊 Service health:', JSON.stringify(health, null, 2));
    } catch (error) {
      console.log('❌ Service unreachable:', error);
    }
  }

  private async diagnoseProcessingIssues(): Promise<void> {
    try {
      // Check recent domain processing activity
      const recentActivity = await pool.query(`
        SELECT COUNT(*) as processed_last_hour 
        FROM domains 
        WHERE status = 'completed' 
        AND updated_at > NOW() - INTERVAL '1 hour'
      `);
      
      console.log('📈 Domains processed in last hour:', recentActivity.rows[0].processed_last_hour);
      
      // Check for stuck domains
      const stuckDomains = await pool.query(`
        SELECT COUNT(*) as stuck_count
        FROM domains 
        WHERE status = 'processing' 
        AND updated_at < NOW() - INTERVAL '10 minutes'
      `);
      
      if (parseInt(stuckDomains.rows[0].stuck_count) > 0) {
        console.log(`⚠️  Found ${stuckDomains.rows[0].stuck_count} stuck domains - may need reset`);
      }
      
    } catch (error) {
      console.log('❌ Error diagnosing processing:', error);
    }
  }

  private async runSystemDiagnostics(): Promise<void> {
    console.log('🔍 Running comprehensive system check...');
    
    // Check database connection
    try {
      await pool.query('SELECT 1');
      console.log('✅ Database connection: OK');
    } catch (error) {
      console.log('❌ Database connection: FAILED');
    }

    // Check service availability
    try {
      const response = await fetch('https://sophisticated-runner.onrender.com/health', { timeout: 10000 });
      console.log(`✅ Service availability: ${response.status} ${response.statusText}`);
    } catch (error) {
      console.log('❌ Service availability: FAILED');
    }
  }

  displayRealTimeStatus(): void {
    if (this.metrics.length === 0) return;

    const latest = this.metrics[this.metrics.length - 1];
    const statusIcon = latest.systemHealth === 'healthy' ? '🟢' : 
                      latest.systemHealth === 'warning' ? '🟡' : '🔴';
    
    process.stdout.write(`\r${statusIcon} ${latest.timestamp.toLocaleTimeString()} | ` +
      `Pending: ${latest.pendingDomains} | ` +
      `Rate: ${latest.processingRate.toFixed(1)}/hr | ` +
      `API: ${(latest.apiSuccessRate * 100).toFixed(1)}% | ` +
      `Health: ${latest.systemHealth}`);
  }

  displayDashboard(): void {
    if (this.metrics.length === 0) return;

    const latest = this.metrics[this.metrics.length - 1];
    const totalDomains = 3183; // From project specs
    const progress = ((totalDomains - latest.pendingDomains) / totalDomains * 100);
    
    // Clear screen and show dashboard
    console.clear();
    console.log('🎯 DOMAIN PROCESSING REAL-TIME MONITOR');
    console.log('═'.repeat(80));
    console.log();
    
    // Progress bar
    const barLength = 50;
    const filled = Math.floor(progress / 100 * barLength);
    const progressBar = '█'.repeat(filled) + '░'.repeat(barLength - filled);
    console.log(`📊 Progress: [${progressBar}] ${progress.toFixed(2)}%`);
    console.log();
    
    // Key metrics
    console.log('📈 KEY METRICS:');
    console.log(`   Domains Remaining: ${latest.pendingDomains.toLocaleString()} / ${totalDomains.toLocaleString()}`);
    console.log(`   Processing Rate:   ${latest.processingRate.toFixed(1)} domains/hour (target: 1000+)`);
    console.log(`   API Success Rate:  ${(latest.apiSuccessRate * 100).toFixed(1)}% (target: 95%+)`);
    console.log(`   System Health:     ${latest.systemHealth.toUpperCase()}`);
    console.log(`   Last Processed:    ${latest.lastProcessedDomain || 'None'}`);
    console.log();
    
    // Estimated completion
    if (latest.processingRate > 0) {
      const hoursRemaining = latest.pendingDomains / latest.processingRate;
      const completionTime = new Date(Date.now() + hoursRemaining * 60 * 60 * 1000);
      console.log(`⏱️  Estimated Completion: ${completionTime.toLocaleString()} (${hoursRemaining.toFixed(1)} hours)`);
    }
    console.log();
    
    // Recent alerts
    if (this.alerts.length > 0) {
      console.log('🚨 RECENT ALERTS:');
      this.alerts.slice(-5).forEach(alert => {
        const icon = alert.severity === 'critical' ? '🔴' : '🟡';
        console.log(`   ${icon} ${alert.timestamp.toLocaleTimeString()}: ${alert.message}`);
      });
      console.log();
    }
    
    // Status line
    console.log('─'.repeat(80));
    console.log(`Last Update: ${latest.timestamp.toLocaleTimeString()} | Monitoring every 30s | Press Ctrl+C to stop`);
  }

  async triggerProcessingBatch(): Promise<void> {
    try {
      console.log('\n🔄 Triggering processing batch...');
      const response = await fetch('https://sophisticated-runner.onrender.com/process-pending-domains', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        timeout: 30000
      });
      
      if (response.ok) {
        const result = await response.json();
        console.log(`✅ Batch triggered successfully: ${JSON.stringify(result)}`);
      } else {
        console.log(`❌ Batch trigger failed: ${response.status} ${response.statusText}`);
      }
    } catch (error) {
      console.log(`❌ Error triggering batch: ${error}`);
    }
  }

  stop(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }
    console.log('\n🛑 Monitoring stopped');
    process.exit(0);
  }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down monitor...');
  process.exit(0);
});

// Start monitoring
const monitor = new RealTimeMonitor();
monitor.start().catch(console.error);

// Auto-trigger processing every 5 minutes if rate is too low
setInterval(async () => {
  if (monitor['metrics'].length > 0) {
    const latest = monitor['metrics'][monitor['metrics'].length - 1];
    if (latest.processingRate < 500) {
      await monitor.triggerProcessingBatch();
    }
  }
}, 300000); // 5 minutes