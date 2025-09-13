import express, { Request, Response } from 'express';
import cors from 'cors';
import * as cron from 'node-cron';
import { Pool } from 'pg';
import winston from 'winston';
import axios from 'axios';
import { SchedulerConfig, ProcessingMode, ProcessingJob } from './types';
import { JobManager } from './job-manager';
import { NotificationService } from './notification-service';
import { HealthMonitor } from './health-monitor';

// Production logging configuration
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { 
    service: 'weekly-scheduler',
    version: '1.0.0',
    environment: process.env.NODE_ENV || 'development'
  },
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    })
  ]
});

// Express app setup
const app = express();
const port = process.env.PORT || 3010;

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? {
    rejectUnauthorized: true,
    ca: process.env.DATABASE_CA_CERT,
  } : false,
  max: 20,
  min: 5,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 30000
});

// CORS Configuration
const allowedOrigins = [
  'https://llmrank.io',
  'https://www.llmrank.io',
  'https://sophisticated-runner.onrender.com',
  'http://localhost:3000',
  'https://localhost:3000'
];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

app.use(express.json());

// Initialize services
const jobManager = new JobManager(pool, logger);
const notificationService = new NotificationService(logger);
const healthMonitor = new HealthMonitor(pool, logger);

// Scheduler configuration
const schedulerConfig: SchedulerConfig = {
  schedules: {
    weekly: {
      pattern: process.env.WEEKLY_SCHEDULE || '0 0 * * 0', // Sunday at midnight
      enabled: process.env.WEEKLY_ENABLED !== 'false',
      description: 'Weekly domain processing run'
    },
    daily: {
      pattern: process.env.DAILY_SCHEDULE || '0 2 * * *', // 2 AM daily
      enabled: process.env.DAILY_ENABLED === 'true',
      description: 'Daily incremental processing'
    },
    hourly: {
      pattern: process.env.HOURLY_SCHEDULE || '0 * * * *', // Every hour
      enabled: process.env.HOURLY_ENABLED === 'true',
      description: 'Hourly priority updates'
    }
  },
  processingModes: {
    full: {
      name: 'Full Processing',
      batchSize: 100,
      maxConcurrency: 30,
      targetService: 'sophisticated-runner',
      endpoints: ['/api/neural-swarm/start', '/process-batch']
    },
    incremental: {
      name: 'Incremental Processing',
      batchSize: 50,
      maxConcurrency: 20,
      targetService: 'sophisticated-runner',
      endpoints: ['/process-batch']
    },
    priority: {
      name: 'Priority Processing',
      batchSize: 25,
      maxConcurrency: 10,
      targetService: 'sophisticated-runner',
      endpoints: ['/process-priority']
    }
  },
  alerts: {
    slackWebhook: process.env.SLACK_WEBHOOK_URL,
    emailRecipients: process.env.ALERT_EMAIL_RECIPIENTS?.split(',') || [],
    alertOnFailure: true,
    alertOnSuccess: process.env.ALERT_ON_SUCCESS === 'true',
    alertOnLongRunning: true,
    longRunningThresholdMinutes: 120
  }
};

// Active jobs tracking
const activeJobs = new Map<string, ProcessingJob>();

// Health check endpoint
app.get('/health', async (_req: Request, res: Response) => {
  try {
    const health = await healthMonitor.getHealth();
    res.json(health);
  } catch (error) {
    logger.error('Health check failed:', error);
    res.status(503).json({ status: 'unhealthy', error: 'Health check failed' });
  }
});

// Get scheduler status
app.get('/status', async (_req: Request, res: Response) => {
  try {
    const status = await jobManager.getSchedulerStatus();
    const activeJobsList = Array.from(activeJobs.values());
    
    res.json({
      scheduler: status,
      activeJobs: activeJobsList,
      config: schedulerConfig,
      uptime: process.uptime(),
      memory: process.memoryUsage()
    });
  } catch (error) {
    logger.error('Failed to get status:', error);
    res.status(500).json({ error: 'Failed to get scheduler status' });
  }
});

// Get job history
app.get('/jobs/history', async (req: Request, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string) || 50;
    const offset = parseInt(req.query.offset as string) || 0;
    
    const history = await jobManager.getJobHistory(limit, offset);
    res.json(history);
  } catch (error) {
    logger.error('Failed to get job history:', error);
    res.status(500).json({ error: 'Failed to get job history' });
  }
});

// Manually trigger processing
app.post('/trigger', async (req: Request, res: Response) => {
  try {
    const { mode = 'full', force = false } = req.body;
    
    // Check if there's already an active job
    if (!force && activeJobs.size > 0) {
      res.status(409).json({ 
        error: 'Processing already in progress',
        activeJobs: Array.from(activeJobs.keys())
      });
      return;
    }
    
    const jobId = await startProcessing(mode as ProcessingMode, 'manual');
    res.json({ 
      message: 'Processing triggered successfully',
      jobId,
      mode
    });
  } catch (error) {
    logger.error('Failed to trigger processing:', error);
    res.status(500).json({ error: 'Failed to trigger processing' });
  }
});

// Cancel active job
app.post('/jobs/:jobId/cancel', async (req: Request, res: Response) => {
  try {
    const { jobId } = req.params;
    const job = activeJobs.get(jobId);
    
    if (!job) {
      res.status(404).json({ error: 'Job not found' });
      return;
    }
    
    await jobManager.cancelJob(jobId);
    activeJobs.delete(jobId);
    
    res.json({ message: 'Job cancelled successfully', jobId });
  } catch (error) {
    logger.error('Failed to cancel job:', error);
    res.status(500).json({ error: 'Failed to cancel job' });
  }
});

// Update schedule configuration
app.put('/config/schedules/:schedule', async (req: Request, res: Response) => {
  try {
    const { schedule } = req.params;
    const { pattern, enabled } = req.body;
    
    if (!schedulerConfig.schedules[schedule as keyof typeof schedulerConfig.schedules]) {
      res.status(404).json({ error: 'Schedule not found' });
      return;
    }
    
    // Update configuration
    schedulerConfig.schedules[schedule as keyof typeof schedulerConfig.schedules] = {
      ...schedulerConfig.schedules[schedule as keyof typeof schedulerConfig.schedules],
      pattern: pattern || schedulerConfig.schedules[schedule as keyof typeof schedulerConfig.schedules].pattern,
      enabled: enabled !== undefined ? enabled : schedulerConfig.schedules[schedule as keyof typeof schedulerConfig.schedules].enabled
    };
    
    // Restart cron jobs with new configuration
    setupCronJobs();
    
    res.json({ 
      message: 'Schedule updated successfully',
      schedule: schedulerConfig.schedules[schedule as keyof typeof schedulerConfig.schedules]
    });
  } catch (error) {
    logger.error('Failed to update schedule:', error);
    res.status(500).json({ error: 'Failed to update schedule' });
  }
});

// Core processing function
async function startProcessing(mode: ProcessingMode, triggeredBy: string): Promise<string> {
  const jobId = `job-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  const startTime = new Date();
  
  const job: ProcessingJob = {
    id: jobId,
    mode,
    status: 'running',
    startTime,
    triggeredBy,
    progress: {
      total: 0,
      processed: 0,
      failed: 0,
      percentage: 0
    }
  };
  
  activeJobs.set(jobId, job);
  
  try {
    logger.info(`Starting ${mode} processing`, { jobId, triggeredBy });
    
    // Record job start
    await jobManager.recordJobStart(jobId, mode, triggeredBy);
    
    // Get pending domains count
    const pendingCount = await getPendingDomainsCount();
    job.progress.total = pendingCount;
    
    if (pendingCount === 0) {
      logger.info('No pending domains to process');
      job.status = 'completed';
      job.endTime = new Date();
      await jobManager.recordJobEnd(jobId, 'completed', job.progress);
      activeJobs.delete(jobId);
      return jobId;
    }
    
    // Send start notification
    await notificationService.sendProcessingStarted(mode, pendingCount);
    
    // Get processing configuration
    const config = schedulerConfig.processingModes[mode];
    const serviceUrl = getServiceUrl(config.targetService);
    
    // Process domains in batches
    let processed = 0;
    let failed = 0;
    let batchNumber = 0;
    
    while (processed < pendingCount) {
      batchNumber++;
      const batchSize = Math.min(config.batchSize, pendingCount - processed);
      
      try {
        logger.info(`Processing batch ${batchNumber}`, { 
          jobId, 
          batchSize, 
          processed, 
          total: pendingCount 
        });
        
        // Call the appropriate endpoint
        const endpoint = config.endpoints[0]; // Use primary endpoint
        const response = await axios.post(`${serviceUrl}${endpoint}`, {
          batchSize,
          mode,
          jobId,
          headers: {
            'X-Scheduler-Job': jobId,
            'X-Processing-Mode': mode
          }
        }, {
          timeout: 300000, // 5 minute timeout per batch
          validateStatus: (status) => status < 500
        });
        
        if (response.status === 200) {
          const batchProcessed = response.data.processed || batchSize;
          processed += batchProcessed;
          
          // Update progress
          job.progress.processed = processed;
          job.progress.percentage = Math.round((processed / pendingCount) * 100);
          
          await jobManager.updateJobProgress(jobId, job.progress);
          
          logger.info(`Batch ${batchNumber} completed`, { 
            jobId, 
            batchProcessed,
            totalProcessed: processed,
            percentage: job.progress.percentage
          });
        } else {
          failed += batchSize;
          job.progress.failed = failed;
          logger.warn(`Batch ${batchNumber} failed`, { 
            jobId, 
            status: response.status,
            error: response.data
          });
        }
        
        // Small delay between batches to avoid overwhelming the service
        await new Promise(resolve => setTimeout(resolve, 2000));
        
      } catch (batchError) {
        logger.error(`Batch ${batchNumber} error`, { jobId, error: batchError });
        failed += batchSize;
        job.progress.failed = failed;
        
        // If too many failures, abort the job
        if (failed > pendingCount * 0.5) {
          throw new Error('Too many batch failures, aborting job');
        }
      }
      
      // Check if job was cancelled
      if (!activeJobs.has(jobId)) {
        logger.info('Job cancelled', { jobId });
        break;
      }
    }
    
    // Job completed
    job.status = 'completed';
    job.endTime = new Date();
    job.progress.processed = processed;
    job.progress.failed = failed;
    
    await jobManager.recordJobEnd(jobId, 'completed', job.progress);
    await notificationService.sendProcessingCompleted(mode, processed, failed, job.endTime.getTime() - job.startTime.getTime());
    
    logger.info('Processing completed', { 
      jobId, 
      processed, 
      failed, 
      duration: job.endTime.getTime() - job.startTime.getTime()
    });
    
  } catch (error) {
    logger.error('Processing failed', { jobId, error });
    
    job.status = 'failed';
    job.endTime = new Date();
    job.error = error instanceof Error ? error.message : 'Unknown error';
    
    await jobManager.recordJobEnd(jobId, 'failed', job.progress, job.error);
    await notificationService.sendProcessingFailed(mode, job.error);
    
  } finally {
    activeJobs.delete(jobId);
  }
  
  return jobId;
}

// Get pending domains count
async function getPendingDomainsCount(): Promise<number> {
  try {
    const result = await pool.query(
      "SELECT COUNT(*) as count FROM domains WHERE status = 'pending'"
    );
    return parseInt(result.rows[0].count);
  } catch (error) {
    logger.error('Failed to get pending domains count:', error);
    return 0;
  }
}

// Get service URL based on environment
function getServiceUrl(serviceName: string): string {
  if (process.env.NODE_ENV === 'production') {
    return `https://${serviceName}.onrender.com`;
  }
  return process.env[`${serviceName.toUpperCase().replace('-', '_')}_URL`] || `http://localhost:3001`;
}

// Setup cron jobs
function setupCronJobs() {
  // Clear existing cron jobs
  cron.getTasks().forEach(task => task.stop());
  
  // Setup weekly schedule
  if (schedulerConfig.schedules.weekly.enabled) {
    cron.schedule(schedulerConfig.schedules.weekly.pattern, async () => {
      logger.info('Weekly schedule triggered');
      try {
        await startProcessing('full', 'weekly-schedule');
      } catch (error) {
        logger.error('Weekly processing failed:', error);
      }
    });
    logger.info('Weekly schedule configured', { pattern: schedulerConfig.schedules.weekly.pattern });
  }
  
  // Setup daily schedule
  if (schedulerConfig.schedules.daily.enabled) {
    cron.schedule(schedulerConfig.schedules.daily.pattern, async () => {
      logger.info('Daily schedule triggered');
      try {
        await startProcessing('incremental', 'daily-schedule');
      } catch (error) {
        logger.error('Daily processing failed:', error);
      }
    });
    logger.info('Daily schedule configured', { pattern: schedulerConfig.schedules.daily.pattern });
  }
  
  // Setup hourly schedule
  if (schedulerConfig.schedules.hourly.enabled) {
    cron.schedule(schedulerConfig.schedules.hourly.pattern, async () => {
      logger.info('Hourly schedule triggered');
      try {
        await startProcessing('priority', 'hourly-schedule');
      } catch (error) {
        logger.error('Hourly processing failed:', error);
      }
    });
    logger.info('Hourly schedule configured', { pattern: schedulerConfig.schedules.hourly.pattern });
  }
}

// Initialize database schema
async function initializeDatabase() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS scheduler_jobs (
        id VARCHAR(255) PRIMARY KEY,
        mode VARCHAR(50) NOT NULL,
        status VARCHAR(50) NOT NULL,
        triggered_by VARCHAR(100) NOT NULL,
        start_time TIMESTAMP NOT NULL,
        end_time TIMESTAMP,
        processed INTEGER DEFAULT 0,
        failed INTEGER DEFAULT 0,
        total INTEGER DEFAULT 0,
        error_message TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_scheduler_jobs_status ON scheduler_jobs(status);
      CREATE INDEX IF NOT EXISTS idx_scheduler_jobs_start_time ON scheduler_jobs(start_time DESC);
    `);
    
    logger.info('Database schema initialized');
  } catch (error) {
    logger.error('Failed to initialize database schema:', error);
    throw error;
  }
}

// Graceful shutdown
async function gracefulShutdown() {
  logger.info('Shutting down scheduler...');
  
  // Stop accepting new requests
  server.close(() => {
    logger.info('HTTP server closed');
  });
  
  // Cancel active jobs
  for (const [jobId, _job] of activeJobs) {
    logger.info(`Cancelling active job: ${jobId}`);
    await jobManager.cancelJob(jobId);
  }
  
  // Close database connection
  await pool.end();
  
  process.exit(0);
}

// Start server
const server = app.listen(port, async () => {
  logger.info(`Weekly scheduler service running on port ${port}`);
  
  try {
    // Initialize database
    await initializeDatabase();
    
    // Setup cron jobs
    setupCronJobs();
    
    // Log configuration
    logger.info('Scheduler configuration:', schedulerConfig);
    
  } catch (error) {
    logger.error('Failed to initialize scheduler:', error);
    process.exit(1);
  }
});

// Handle shutdown signals
process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

// Handle uncaught errors
process.on('uncaughtException', (error) => {
  logger.error('Uncaught exception:', error);
  gracefulShutdown();
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled rejection at:', promise, 'reason:', reason);
  gracefulShutdown();
});

export { app, pool };