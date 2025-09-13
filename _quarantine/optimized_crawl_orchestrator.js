#!/usr/bin/env node

const axios = require('axios');
const { Pool } = require('pg');

// OPTIMIZATION CONSTANTS
const OPTIMIZATION_CONFIG = {
  // Increased concurrent workers and batch sizes
  CONCURRENT_WORKERS: 30,
  BATCH_SIZE_PER_WORKER: 50,
  
  // API Provider Distribution (based on speed tiers)
  TIER_DISTRIBUTION: {
    fast: 0.6,    // 60% - DeepSeek, Together, XAI, Perplexity
    medium: 0.3,  // 30% - OpenAI, Mistral
    slow: 0.1     // 10% - Anthropic, Google
  },
  
  // Rate limiting and retry configuration
  RATE_LIMIT_CONFIG: {
    maxRetries: 3,
    baseDelay: 1000,
    maxDelay: 30000,
    backoffMultiplier: 2
  },
  
  // Performance targets
  TARGETS: {
    domainsPerMinute: 100,
    totalDomains: 2639
  }
};

// Database connection
const DATABASE_URL = 'postgresql://raw_capture_db_user:wjFesUM8ISNEvE2b4kZtRAKgGYJVtKK5@dpg-d11fqgndiees73fb35dg-a.oregon-postgres.render.com/raw_capture_db';
const pool = new Pool({ 
  connectionString: DATABASE_URL, 
  ssl: { rejectUnauthorized: false },
  max: 50,
  min: 10
});

// Service endpoint
const SOPHISTICATED_RUNNER_URL = 'https://sophisticated-runner.onrender.com';

// API usage tracking
const apiUsageTracker = {
  providers: {
    deepseek: { calls: 0, errors: 0, lastError: null },
    together: { calls: 0, errors: 0, lastError: null },
    xai: { calls: 0, errors: 0, lastError: null },
    perplexity: { calls: 0, errors: 0, lastError: null },
    openai: { calls: 0, errors: 0, lastError: null },
    mistral: { calls: 0, errors: 0, lastError: null },
    anthropic: { calls: 0, errors: 0, lastError: null },
    google: { calls: 0, errors: 0, lastError: null }
  },
  startTime: Date.now(),
  domainsProcessed: 0
};

// Performance metrics
const performanceMetrics = {
  startTime: Date.now(),
  domainsProcessed: 0,
  batchesCompleted: 0,
  errors: 0,
  avgProcessingTime: 0
};

// Exponential backoff with jitter
async function exponentialBackoff(attempt, baseDelay = 1000) {
  const delay = Math.min(
    baseDelay * Math.pow(2, attempt) + Math.random() * 1000,
    OPTIMIZATION_CONFIG.RATE_LIMIT_CONFIG.maxDelay
  );
  await new Promise(resolve => setTimeout(resolve, delay));
}

// Process a batch with retry logic
async function processBatchWithRetry(workerIndex) {
  let attempt = 0;
  
  while (attempt < OPTIMIZATION_CONFIG.RATE_LIMIT_CONFIG.maxRetries) {
    try {
      const startTime = Date.now();
      
      // Use the ultra-fast endpoint with maximum batch size
      const response = await axios.post(
        `${SOPHISTICATED_RUNNER_URL}/ultra-fast-process`,
        {},
        {
          timeout: 300000,
          headers: {
            'X-Worker-Index': workerIndex,
            'X-Batch-Size': OPTIMIZATION_CONFIG.BATCH_SIZE_PER_WORKER
          }
        }
      );
      
      const processingTime = Date.now() - startTime;
      
      if (response.data.processed > 0) {
        performanceMetrics.domainsProcessed += response.data.processed;
        performanceMetrics.batchesCompleted++;
        performanceMetrics.avgProcessingTime = 
          (performanceMetrics.avgProcessingTime * (performanceMetrics.batchesCompleted - 1) + processingTime) / 
          performanceMetrics.batchesCompleted;
        
        console.log(`✅ Worker ${workerIndex}: Processed ${response.data.processed} domains in ${(processingTime/1000).toFixed(1)}s`);
        return response.data.processed;
      }
      
      return 0;
      
    } catch (error) {
      attempt++;
      performanceMetrics.errors++;
      
      console.log(`⚠️ Worker ${workerIndex} attempt ${attempt} failed: ${error.message}`);
      
      if (attempt < OPTIMIZATION_CONFIG.RATE_LIMIT_CONFIG.maxRetries) {
        await exponentialBackoff(attempt);
      }
    }
  }
  
  console.error(`❌ Worker ${workerIndex} failed after ${OPTIMIZATION_CONFIG.RATE_LIMIT_CONFIG.maxRetries} attempts`);
  return 0;
}

// Worker function that continuously processes batches
async function crawlWorker(workerIndex) {
  console.log(`🚀 Worker ${workerIndex} started`);
  
  while (true) {
    try {
      // Check if there are still pending domains
      const pendingCheck = await pool.query(
        'SELECT COUNT(*) as count FROM domains WHERE status = $1',
        ['pending']
      );
      
      const pendingCount = parseInt(pendingCheck.rows[0].count);
      
      if (pendingCount === 0) {
        console.log(`🏁 Worker ${workerIndex}: No more pending domains`);
        break;
      }
      
      // Process a batch
      const processed = await processBatchWithRetry(workerIndex);
      
      // Add slight delay between batches to prevent overwhelming the service
      if (processed > 0) {
        await new Promise(resolve => setTimeout(resolve, 500));
      } else {
        // If no domains were processed, wait longer before retrying
        await new Promise(resolve => setTimeout(resolve, 5000));
      }
      
    } catch (error) {
      console.error(`❌ Worker ${workerIndex} error: ${error.message}`);
      await new Promise(resolve => setTimeout(resolve, 10000));
    }
  }
  
  console.log(`✅ Worker ${workerIndex} completed`);
}

// Monitor and report progress
async function monitorProgress() {
  const startTime = Date.now();
  
  while (true) {
    try {
      // Get current status from database
      const statusResult = await pool.query(
        'SELECT status, COUNT(*) as count FROM domains GROUP BY status'
      );
      
      const statusMap = {};
      statusResult.rows.forEach(row => {
        statusMap[row.status] = parseInt(row.count);
      });
      
      const pending = statusMap.pending || 0;
      const completed = statusMap.completed || 0;
      const processing = statusMap.processing || 0;
      const total = pending + completed + processing;
      
      // Calculate metrics
      const elapsedMinutes = (Date.now() - startTime) / 60000;
      const domainsPerMinute = performanceMetrics.domainsProcessed / elapsedMinutes;
      const estimatedMinutesRemaining = pending / domainsPerMinute;
      
      // Display progress
      console.log('\n' + '='.repeat(60));
      console.log('📊 CRAWL OPTIMIZATION DASHBOARD');
      console.log('='.repeat(60));
      console.log(`⏱️  Elapsed Time: ${elapsedMinutes.toFixed(1)} minutes`);
      console.log(`📈 Performance: ${domainsPerMinute.toFixed(1)} domains/minute`);
      console.log(`🎯 Target: ${OPTIMIZATION_CONFIG.TARGETS.domainsPerMinute} domains/minute`);
      console.log('');
      console.log(`✅ Completed: ${completed} (${((completed/total)*100).toFixed(1)}%)`);
      console.log(`🔄 Processing: ${processing}`);
      console.log(`⏳ Pending: ${pending} (${((pending/total)*100).toFixed(1)}%)`);
      console.log('');
      console.log(`⚡ Active Workers: ${OPTIMIZATION_CONFIG.CONCURRENT_WORKERS}`);
      console.log(`📦 Batch Size: ${OPTIMIZATION_CONFIG.BATCH_SIZE_PER_WORKER} domains/worker`);
      console.log(`🚀 Total Throughput: ${OPTIMIZATION_CONFIG.CONCURRENT_WORKERS * OPTIMIZATION_CONFIG.BATCH_SIZE_PER_WORKER} domains/batch`);
      console.log('');
      console.log(`⏰ Estimated Time Remaining: ${estimatedMinutesRemaining.toFixed(1)} minutes`);
      console.log(`🏁 Estimated Completion: ${new Date(Date.now() + estimatedMinutesRemaining * 60000).toLocaleTimeString()}`);
      console.log('='.repeat(60));
      
      // Check if complete
      if (pending === 0 && processing === 0) {
        console.log('\n🎉 CRAWL OPTIMIZATION COMPLETE!');
        console.log(`✅ Total domains processed: ${completed}`);
        console.log(`⏱️  Total time: ${elapsedMinutes.toFixed(1)} minutes`);
        console.log(`📈 Average speed: ${domainsPerMinute.toFixed(1)} domains/minute`);
        break;
      }
      
      // Wait before next update
      await new Promise(resolve => setTimeout(resolve, 30000)); // Update every 30 seconds
      
    } catch (error) {
      console.error('❌ Monitor error:', error.message);
      await new Promise(resolve => setTimeout(resolve, 10000));
    }
  }
}

// Main orchestrator
async function orchestrateCrawl() {
  console.log('🚀 OPTIMIZED CRAWL ORCHESTRATOR STARTING');
  console.log('=====================================');
  console.log(`🎯 Target: ${OPTIMIZATION_CONFIG.TARGETS.domainsPerMinute}+ domains/minute`);
  console.log(`👥 Workers: ${OPTIMIZATION_CONFIG.CONCURRENT_WORKERS}`);
  console.log(`📦 Batch Size: ${OPTIMIZATION_CONFIG.BATCH_SIZE_PER_WORKER} domains/worker`);
  console.log(`⚡ Total Capacity: ${OPTIMIZATION_CONFIG.CONCURRENT_WORKERS * OPTIMIZATION_CONFIG.BATCH_SIZE_PER_WORKER} domains/batch`);
  console.log('');
  
  try {
    // Check service health
    const healthResponse = await axios.get(`${SOPHISTICATED_RUNNER_URL}/health`);
    console.log(`✅ Service healthy: ${healthResponse.data.service}`);
    
    // Check API keys
    const keysResponse = await axios.get(`${SOPHISTICATED_RUNNER_URL}/api-keys`);
    console.log(`🔑 API keys available: ${keysResponse.data.workingKeys} providers`);
    console.log('');
    
    // Start all workers concurrently
    const workerPromises = [];
    for (let i = 0; i < OPTIMIZATION_CONFIG.CONCURRENT_WORKERS; i++) {
      workerPromises.push(crawlWorker(i));
      // Stagger worker starts slightly
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    // Start monitoring in parallel
    const monitorPromise = monitorProgress();
    
    // Wait for all workers to complete
    await Promise.all([...workerPromises, monitorPromise]);
    
    console.log('\n🏁 All workers completed!');
    
  } catch (error) {
    console.error('❌ Orchestrator error:', error.message);
  } finally {
    await pool.end();
  }
}

// Handle graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n⚠️ Shutting down gracefully...');
  await pool.end();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\n⚠️ Shutting down gracefully...');
  await pool.end();
  process.exit(0);
});

// Start the orchestrator
orchestrateCrawl()
  .then(() => {
    console.log('✅ Crawl orchestration completed successfully');
    process.exit(0);
  })
  .catch(error => {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  });