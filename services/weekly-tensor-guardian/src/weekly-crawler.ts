#!/usr/bin/env ts-node

/*
🗓️ WEEKLY TENSOR CRAWLER
Performs scheduled full crawl of all domains with all AI models
This is the core mission-critical component for temporal decay analysis
*/

import { Pool } from 'pg';
import axios from 'axios';
import { createLogger, format, transports } from 'winston';
import { TensorHealthChecker } from './health-checker';

const logger = createLogger({
  level: 'info',
  format: format.combine(
    format.timestamp(),
    format.json()
  ),
  transports: [
    new transports.File({ filename: 'logs/weekly-crawl.log' }),
    new transports.Console()
  ]
});

interface CrawlProgress {
  totalDomains: number;
  processedDomains: number;
  successfulResponses: number;
  failedResponses: number;
  activeModels: Set<string>;
  startTime: Date;
  estimatedCompletion?: Date;
}

interface CrawlResult {
  success: boolean;
  completionRate: number;
  totalResponses: number;
  modelCoverage: number;
  duration: number;
  issues: string[];
}

class WeeklyTensorCrawler {
  private pool: Pool;
  private healthChecker: TensorHealthChecker;
  private progress: CrawlProgress;

  constructor() {
    this.pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false }
    });
    this.healthChecker = new TensorHealthChecker();
    this.progress = {
      totalDomains: 0,
      processedDomains: 0,
      successfulResponses: 0,
      failedResponses: 0,
      activeModels: new Set(),
      startTime: new Date()
    };
  }

  async executeWeeklyCrawl(): Promise<CrawlResult> {
    logger.info('🚀 Starting weekly tensor crawl - MISSION CRITICAL');
    
    const issues: string[] = [];
    
    try {
      // 1. Pre-flight health check
      logger.info('🔍 Running pre-flight health check...');
      const healthResult = await this.healthChecker.runFullHealthCheck();
      
      if (!healthResult.passed) {
        throw new Error(`Pre-flight health check FAILED: ${healthResult.issues.join(', ')}`);
      }
      
      logger.info('✅ Pre-flight health check PASSED - Proceeding with crawl');

      // 2. Initialize crawl session
      await this.initializeCrawlSession();
      
      // 3. Reset all domains to pending for fresh weekly crawl
      await this.resetDomainsForWeeklyCrawl();
      
      // 4. Execute crawl in batches
      const crawlResult = await this.executeBatchedCrawl();
      
      // 5. Validate crawl completion
      const validationResult = await this.validateCrawlCompletion();
      
      // 6. Generate completion report
      const completionReport = await this.generateCompletionReport();
      
      logger.info('🎉 Weekly tensor crawl COMPLETED', completionReport);
      
      return {
        success: true,
        completionRate: validationResult.completionRate,
        totalResponses: validationResult.totalResponses,
        modelCoverage: validationResult.modelCoverage,
        duration: Date.now() - this.progress.startTime.getTime(),
        issues: []
      };
      
    } catch (error) {
      logger.error('💥 Weekly tensor crawl FAILED', { error: (error instanceof Error ? error.message : String(error)) });
      issues.push(error instanceof Error ? error.message : String(error));
      
      return {
        success: false,
        completionRate: 0,
        totalResponses: 0,
        modelCoverage: 0,
        duration: Date.now() - this.progress.startTime.getTime(),
        issues
      };
    }
  }

  private async initializeCrawlSession(): Promise<void> {
    // Get total domain count
    const domainCountResult = await this.pool.query('SELECT COUNT(*) as total FROM domains');
    this.progress.totalDomains = parseInt(domainCountResult.rows[0].total);
    
    logger.info(`📊 Initialized crawl session: ${this.progress.totalDomains} domains to process`);
    
    // Log crawl start in database
    await this.pool.query(`
      INSERT INTO crawl_sessions (session_type, start_time, total_domains, status)
      VALUES ('weekly_tensor_crawl', NOW(), $1, 'running')
    `, [this.progress.totalDomains]);
  }

  private async resetDomainsForWeeklyCrawl(): Promise<void> {
    logger.info('🔄 Resetting all domains to pending for fresh weekly crawl');
    
    // Reset all domains to pending status
    const resetResult = await this.pool.query(`
      UPDATE domains 
      SET status = 'pending', updated_at = NOW()
      WHERE status IN ('completed', 'error', 'processing')
    `);
    
    logger.info(`✅ Reset ${resetResult.rowCount} domains to pending status`);
  }

  private async executeBatchedCrawl(): Promise<void> {
    const batchSize = 100; // Process 100 domains at a time
    const maxRetries = 3;
    
    logger.info(`🎯 Starting batched crawl: ${batchSize} domains per batch`);
    
    while (this.progress.processedDomains < this.progress.totalDomains) {
      const batch = await this.getNextBatch(batchSize);
      
      if (batch.length === 0) {
        logger.info('📋 No more domains to process');
        break;
      }
      
      logger.info(`🔄 Processing batch: ${batch.length} domains`);
      
      // Process batch with retry logic
      let retryCount = 0;
      let batchSuccess = false;
      
      while (retryCount < maxRetries && !batchSuccess) {
        try {
          await this.processBatch(batch);
          batchSuccess = true;
          logger.info(`✅ Batch completed successfully`);
        } catch (error) {
          retryCount++;
          logger.warn(`⚠️ Batch failed (attempt ${retryCount}/${maxRetries}): ${(error instanceof Error ? error.message : String(error))}`);
          
          if (retryCount < maxRetries) {
            await this.sleep(5000 * retryCount); // Exponential backoff
          }
        }
      }
      
      if (!batchSuccess) {
        throw new Error(`Batch processing failed after ${maxRetries} attempts`);
      }
      
      // Update progress
      this.progress.processedDomains += batch.length;
      
      // Log progress every 10 batches
      if (Math.floor(this.progress.processedDomains / batchSize) % 10 === 0) {
        await this.logProgress();
      }
      
      // Brief pause between batches to avoid overwhelming the system
      await this.sleep(2000);
    }
  }

  private async getNextBatch(batchSize: number): Promise<string[]> {
    const result = await this.pool.query(`
      SELECT domain 
      FROM domains 
      WHERE status = 'pending'
      ORDER BY created_at ASC
      LIMIT $1
    `, [batchSize]);
    
    return result.rows.map(row => row.domain);
  }

  private async processBatch(domains: string[]): Promise<void> {
    // Trigger processing via the sophisticated-runner
    const payload = {
      domains: domains,
      require_all_models: true,
      batch_id: `weekly_${Date.now()}`
    };
    
    const response = await axios.post(
      'https://sophisticated-runner.onrender.com/process-pending-domains',
      payload,
      {
        timeout: 300000, // 5 minute timeout for batch processing
        headers: { 'Content-Type': 'application/json' }
      }
    );
    
    if (response.status !== 200) {
      throw new Error(`Batch processing failed with status ${response.status}`);
    }
    
    // Wait for batch completion with polling
    await this.waitForBatchCompletion(domains);
  }

  private async waitForBatchCompletion(domains: string[]): Promise<void> {
    const maxWaitTime = 600000; // 10 minutes max wait
    const pollInterval = 10000; // Check every 10 seconds
    const startTime = Date.now();
    
    while (Date.now() - startTime < maxWaitTime) {
      const pendingCount = await this.pool.query(`
        SELECT COUNT(*) as pending
        FROM domains
        WHERE domain = ANY($1) AND status = 'pending'
      `, [domains]);
      
      if (parseInt(pendingCount.rows[0].pending) === 0) {
        // All domains in batch are no longer pending
        return;
      }
      
      await this.sleep(pollInterval);
    }
    
    throw new Error('Batch completion timeout - domains still pending after 10 minutes');
  }

  private async validateCrawlCompletion(): Promise<{
    completionRate: number;
    totalResponses: number;
    modelCoverage: number;
  }> {
    // Check completion rate
    const completionResult = await this.pool.query(`
      SELECT 
        COUNT(*) as total_domains,
        COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_domains
      FROM domains
    `);
    
    const { total_domains, completed_domains } = completionResult.rows[0];
    const completionRate = (completed_domains / total_domains) * 100;
    
    // Check total responses from this crawl session
    const responseResult = await this.pool.query(`
      SELECT COUNT(*) as total_responses
      FROM domain_responses
      WHERE created_at > $1
    `, [this.progress.startTime]);
    
    const totalResponses = parseInt(responseResult.rows[0].total_responses);
    
    // Check model coverage
    const modelResult = await this.pool.query(`
      SELECT COUNT(DISTINCT model) as unique_models
      FROM domain_responses
      WHERE created_at > $1
    `, [this.progress.startTime]);
    
    const modelCoverage = parseInt(modelResult.rows[0].unique_models);
    
    logger.info(`📊 Crawl validation: ${completionRate.toFixed(1)}% completion, ${totalResponses} responses, ${modelCoverage} models`);
    
    return { completionRate, totalResponses, modelCoverage };
  }

  private async generateCompletionReport(): Promise<any> {
    // Generate comprehensive completion report
    const report = await this.pool.query(`
      SELECT 
        COUNT(*) as total_responses,
        COUNT(DISTINCT domain_id) as unique_domains,
        COUNT(DISTINCT model) as unique_models,
        ROUND(AVG(LENGTH(response)), 0) as avg_response_length,
        MIN(created_at) as first_response,
        MAX(created_at) as last_response
      FROM domain_responses
      WHERE created_at > $1
    `, [this.progress.startTime]);
    
    return report.rows[0];
  }

  private async logProgress(): Promise<void> {
    const progressPercent = (this.progress.processedDomains / this.progress.totalDomains) * 100;
    const elapsed = Date.now() - this.progress.startTime.getTime();
    const rate = this.progress.processedDomains / (elapsed / 1000 / 60); // domains per minute
    
    logger.info(`📈 Progress: ${this.progress.processedDomains}/${this.progress.totalDomains} domains (${progressPercent.toFixed(1)}%) - ${rate.toFixed(1)} domains/min`);
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async close(): Promise<void> {
    await this.pool.end();
    await this.healthChecker.close();
  }
}

// CLI execution
async function main() {
  const crawler = new WeeklyTensorCrawler();
  
  try {
    const result = await crawler.executeWeeklyCrawl();
    
    if (result.success && result.completionRate >= 95) {
      logger.info('🎉 Weekly tensor crawl COMPLETED SUCCESSFULLY');
      process.exit(0);
    } else {
      logger.error('🚨 Weekly tensor crawl FAILED or INCOMPLETE', result);
      process.exit(1);
    }
  } catch (error) {
    logger.error('💥 Weekly tensor crawl crashed', { error: (error instanceof Error ? error.message : String(error)) });
    process.exit(1);
  } finally {
    await crawler.close();
  }
}

if (require.main === module) {
  main();
}

export { WeeklyTensorCrawler, CrawlResult }; 