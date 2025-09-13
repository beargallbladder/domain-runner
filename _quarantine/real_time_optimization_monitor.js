#!/usr/bin/env node

const axios = require('axios');
const { Pool } = require('pg');

// Configuration
const DATABASE_URL = 'postgresql://raw_capture_db_user:wjFesUM8ISNEvE2b4kZtRAKgGYJVtKK5@dpg-d11fqgndiees73fb35dg-a.oregon-postgres.render.com/raw_capture_db';
const SOPHISTICATED_RUNNER_URL = 'https://sophisticated-runner.onrender.com';

const pool = new Pool({ 
  connectionString: DATABASE_URL, 
  ssl: { rejectUnauthorized: false } 
});

// Monitoring state
const monitoringState = {
  startTime: Date.now(),
  previousCounts: { pending: 0, completed: 0, processing: 0 },
  measurements: [],
  providerStats: {},
  alertThresholds: {
    lowProcessingRate: 50,  // domains/minute
    highErrorRate: 0.1,    // 10%
    stuckProcessing: 100   // domains stuck in processing
  }
};

// Clear screen and move cursor to top
function clearScreen() {
  process.stdout.write('\x1b[2J\x1b[H');
}

// Format duration
function formatDuration(ms) {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  
  if (hours > 0) {
    return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
  } else if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`;
  } else {
    return `${seconds}s`;
  }
}

// Calculate processing rate
function calculateRate(current, previous, timeElapsed) {
  const processed = current.completed - previous.completed;
  const ratePerMinute = (processed / timeElapsed) * 60000;
  return { processed, ratePerMinute };
}

// Get database status
async function getDatabaseStatus() {
  try {
    const result = await pool.query(`
      SELECT 
        status, 
        COUNT(*) as count,
        MAX(updated_at) as last_updated
      FROM domains 
      GROUP BY status 
      ORDER BY count DESC
    `);
    
    const statusMap = { pending: 0, completed: 0, processing: 0 };
    let lastUpdated = null;
    
    result.rows.forEach(row => {
      statusMap[row.status] = parseInt(row.count);
      if (row.last_updated && (!lastUpdated || row.last_updated > lastUpdated)) {
        lastUpdated = row.last_updated;
      }
    });
    
    return { ...statusMap, lastUpdated, total: Object.values(statusMap).reduce((a, b) => a + b, 0) };
  } catch (error) {
    console.error('Database query error:', error.message);
    return null;
  }
}

// Get service health and provider stats
async function getServiceStats() {
  try {
    const [healthResponse, keysResponse, usageResponse] = await Promise.allSettled([
      axios.get(`${SOPHISTICATED_RUNNER_URL}/health`, { timeout: 5000 }),
      axios.get(`${SOPHISTICATED_RUNNER_URL}/api-keys`, { timeout: 5000 }),
      axios.get(`${SOPHISTICATED_RUNNER_URL}/provider-usage`, { timeout: 5000 })
    ]);
    
    return {
      health: healthResponse.status === 'fulfilled' ? healthResponse.value.data : null,
      keys: keysResponse.status === 'fulfilled' ? keysResponse.value.data : null,
      usage: usageResponse.status === 'fulfilled' ? usageResponse.value.data : null
    };
  } catch (error) {
    return { health: null, keys: null, usage: null };
  }
}

// Detect performance alerts
function detectAlerts(current, rate, serviceStats) {
  const alerts = [];
  
  // Low processing rate
  if (rate.ratePerMinute < monitoringState.alertThresholds.lowProcessingRate) {
    alerts.push({
      level: 'WARNING',
      message: `Low processing rate: ${rate.ratePerMinute.toFixed(1)}/min (target: 100+/min)`
    });
  }
  
  // Stuck in processing
  if (current.processing > monitoringState.alertThresholds.stuckProcessing) {
    alerts.push({
      level: 'CRITICAL',
      message: `${current.processing} domains stuck in processing state`
    });
  }
  
  // Service health
  if (!serviceStats.health) {
    alerts.push({
      level: 'CRITICAL',
      message: 'Service health check failed'
    });
  }
  
  // Provider errors
  if (serviceStats.usage) {
    Object.entries(serviceStats.usage.usage || {}).forEach(([provider, stats]) => {
      const errorRate = stats.calls > 0 ? stats.errors / stats.calls : 0;
      if (errorRate > monitoringState.alertThresholds.highErrorRate) {
        alerts.push({
          level: 'WARNING',
          message: `High error rate for ${provider}: ${(errorRate * 100).toFixed(1)}%`
        });
      }
    });
  }
  
  return alerts;
}

// Display comprehensive dashboard
function displayDashboard(current, rate, serviceStats, alerts) {
  clearScreen();
  
  const elapsed = Date.now() - monitoringState.startTime;
  const eta = current.pending > 0 && rate.ratePerMinute > 0 ? 
    current.pending / rate.ratePerMinute : 0;
  
  console.log('╔═══════════════════════════════════════════════════════════════════════════════╗');
  console.log('║                        🚀 CRAWL OPTIMIZATION MONITOR                         ║');
  console.log('╠═══════════════════════════════════════════════════════════════════════════════╣');
  console.log(`║ ⏱️  Runtime: ${formatDuration(elapsed).padEnd(20)} │ 🎯 Target: 100+ domains/min     ║`);
  console.log(`║ 📈 Current Rate: ${rate.ratePerMinute.toFixed(1).padEnd(12)} domains/min │ 🕒 ETA: ${eta > 0 ? formatDuration(eta * 60000) : 'Calculating...'}      ║`);
  console.log('╠═══════════════════════════════════════════════════════════════════════════════╣');
  
  // Progress bar
  const progressPercent = current.total > 0 ? (current.completed / current.total) * 100 : 0;
  const progressWidth = 50;
  const filledWidth = Math.floor((progressPercent / 100) * progressWidth);
  const emptyWidth = progressWidth - filledWidth;
  const progressBar = '█'.repeat(filledWidth) + '░'.repeat(emptyWidth);
  
  console.log(`║ Progress: [${progressBar}] ${progressPercent.toFixed(1)}%    ║`);
  console.log('╠═══════════════════════════════════════════════════════════════════════════════╣');
  console.log(`║ ✅ Completed: ${current.completed.toString().padEnd(10)} │ 🔄 Processing: ${current.processing.toString().padEnd(10)} │ ⏳ Pending: ${current.pending.toString().padEnd(8)} ║`);
  console.log(`║ 🔥 Processed This Session: ${rate.processed.toString().padEnd(8)} │ 📊 Total: ${current.total.toString().padEnd(19)} ║`);
  console.log('╠═══════════════════════════════════════════════════════════════════════════════╣');
  
  // Service Status
  console.log('║                                SERVICE STATUS                                 ║');
  console.log('╠═══════════════════════════════════════════════════════════════════════════════╣');
  if (serviceStats.health) {
    console.log(`║ 🟢 Service: HEALTHY        │ 🔑 API Keys: ${(serviceStats.keys?.workingKeys || 0).toString().padEnd(10)} │ ⚡ Status: ACTIVE    ║`);
  } else {
    console.log('║ 🔴 Service: UNHEALTHY      │ ❌ Connection Failed                            ║');
  }
  
  // Provider Usage
  if (serviceStats.usage?.usage) {
    console.log('╠═══════════════════════════════════════════════════════════════════════════════╣');
    console.log('║                               PROVIDER USAGE                                  ║');
    console.log('╠═══════════════════════════════════════════════════════════════════════════════╣');
    
    const sortedProviders = Object.entries(serviceStats.usage.usage)
      .sort(([,a], [,b]) => b.calls - a.calls)
      .slice(0, 6); // Top 6 providers
    
    sortedProviders.forEach(([provider, stats]) => {
      const errorRate = stats.calls > 0 ? (stats.errors / stats.calls * 100).toFixed(1) : '0.0';
      const providerLine = `║ ${provider.padEnd(12)}: ${stats.calls.toString().padEnd(6)} calls │ Errors: ${errorRate.padEnd(5)}% │ Active: ${Date.now() - stats.lastCall < 60000 ? '🟢' : '🔴'} ║`;
      console.log(providerLine);
    });
  }
  
  // Alerts
  if (alerts.length > 0) {
    console.log('╠═══════════════════════════════════════════════════════════════════════════════╣');
    console.log('║                                    ALERTS                                     ║');
    console.log('╠═══════════════════════════════════════════════════════════════════════════════╣');
    alerts.forEach(alert => {
      const icon = alert.level === 'CRITICAL' ? '🚨' : '⚠️';
      const truncatedMessage = alert.message.length > 65 ? 
        alert.message.substring(0, 62) + '...' : alert.message;
      console.log(`║ ${icon} ${alert.level}: ${truncatedMessage.padEnd(65)} ║`);
    });
  }
  
  console.log('╠═══════════════════════════════════════════════════════════════════════════════╣');
  console.log('║ 💡 Tips: Use Ctrl+C to stop monitoring │ 🔄 Updates every 10 seconds        ║');
  console.log('╚═══════════════════════════════════════════════════════════════════════════════╝');
  
  // Show last update time
  if (current.lastUpdated) {
    const timeSinceUpdate = Date.now() - new Date(current.lastUpdated).getTime();
    console.log(`\n🕒 Last database update: ${formatDuration(timeSinceUpdate)} ago`);
  }
}

// Main monitoring loop
async function monitorLoop() {
  while (true) {
    try {
      // Get current status
      const [current, serviceStats] = await Promise.all([
        getDatabaseStatus(),
        getServiceStats()
      ]);
      
      if (!current) {
        console.log('❌ Failed to get database status');
        await new Promise(resolve => setTimeout(resolve, 10000));
        continue;
      }
      
      // Calculate rate since last measurement
      const timeElapsed = Date.now() - monitoringState.startTime;
      const rate = calculateRate(current, monitoringState.previousCounts, timeElapsed);
      
      // Store measurement
      monitoringState.measurements.push({
        timestamp: Date.now(),
        ...current,
        rate: rate.ratePerMinute
      });
      
      // Keep only last 100 measurements
      if (monitoringState.measurements.length > 100) {
        monitoringState.measurements = monitoringState.measurements.slice(-100);
      }
      
      // Detect alerts
      const alerts = detectAlerts(current, rate, serviceStats);
      
      // Display dashboard
      displayDashboard(current, rate, serviceStats, alerts);
      
      // Update previous counts
      monitoringState.previousCounts = { ...current };
      
      // Check if monitoring should stop
      if (current.pending === 0 && current.processing === 0) {
        console.log('\n\n🎉 All domains have been processed!');
        console.log(`✅ Final Results:`);
        console.log(`   • Total processed: ${current.completed} domains`);
        console.log(`   • Total runtime: ${formatDuration(timeElapsed)}`);
        console.log(`   • Average rate: ${(current.completed / timeElapsed * 60000).toFixed(1)} domains/minute`);
        break;
      }
      
      // Wait before next update
      await new Promise(resolve => setTimeout(resolve, 10000));
      
    } catch (error) {
      console.error('❌ Monitoring error:', error.message);
      await new Promise(resolve => setTimeout(resolve, 5000));
    }
  }
}

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n\n⚠️ Monitoring stopped by user');
  await pool.end();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\n\n⚠️ Monitoring terminated');
  await pool.end();
  process.exit(0);
});

// Start monitoring
console.log('🚀 Starting Real-Time Crawl Optimization Monitor...\n');
monitorLoop()
  .then(() => {
    console.log('✅ Monitoring completed successfully');
    process.exit(0);
  })
  .catch(error => {
    console.error('❌ Fatal monitoring error:', error);
    process.exit(1);
  });