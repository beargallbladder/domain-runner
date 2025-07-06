#!/usr/bin/env ts-node

/*
⏰ TENSOR GUARDIAN SCHEDULER
Orchestrates weekly crawls, health checks, and anomaly detection
The central nervous system of your AI memory data collection
*/

import * as cron from 'node-cron';
import { createLogger, format, transports } from 'winston';
import { TensorHealthChecker } from './health-checker';
import { WeeklyTensorCrawler } from './weekly-crawler';
import { TensorAnomalyDetector } from './anomaly-detector';

const logger = createLogger({
  level: 'info',
  format: format.combine(
    format.timestamp(),
    format.json()
  ),
  transports: [
    new transports.File({ filename: 'logs/scheduler.log' }),
    new transports.Console()
  ]
});

class TensorGuardianScheduler {
  private healthChecker: TensorHealthChecker;
  private weeklyCrawler: WeeklyTensorCrawler;
  private anomalyDetector: TensorAnomalyDetector;
  
  constructor() {
    this.healthChecker = new TensorHealthChecker();
    this.weeklyCrawler = new WeeklyTensorCrawler();
    this.anomalyDetector = new TensorAnomalyDetector();
  }

  start(): void {
    logger.info('🚀 Starting Tensor Guardian Scheduler');
    
    // Weekly full crawl - Sundays at 2 AM UTC
    cron.schedule('0 2 * * 0', async () => {
      logger.info('📅 Weekly tensor crawl triggered');
      await this.executeWeeklyCrawl();
    }, {
      scheduled: true,
      timezone: "UTC"
    });
    
    // Daily health check - Every day at 6 AM UTC
    cron.schedule('0 6 * * *', async () => {
      logger.info('🔍 Daily health check triggered');
      await this.executeDailyHealthCheck();
    }, {
      scheduled: true,
      timezone: "UTC"
    });
    
    // Hourly anomaly detection - Every hour
    cron.schedule('0 * * * *', async () => {
      logger.info('🚨 Hourly anomaly detection triggered');
      await this.executeAnomalyDetection();
    }, {
      scheduled: true,
      timezone: "UTC"
    });
    
    // Emergency health check - Every 15 minutes
    cron.schedule('*/15 * * * *', async () => {
      await this.executeEmergencyHealthCheck();
    }, {
      scheduled: true,
      timezone: "UTC"
    });
    
    logger.info('✅ All scheduled tasks configured');
    logger.info('📅 Weekly crawl: Sundays at 2 AM UTC');
    logger.info('🔍 Daily health check: 6 AM UTC');
    logger.info('🚨 Hourly anomaly detection');
    logger.info('⚡ Emergency checks: Every 15 minutes');
  }

  private async executeWeeklyCrawl(): Promise<void> {
    try {
      logger.info('🎯 EXECUTING WEEKLY TENSOR CRAWL - MISSION CRITICAL');
      
      const result = await this.weeklyCrawler.executeWeeklyCrawl();
      
      if (result.success && result.completionRate >= 95) {
        logger.info('🎉 Weekly crawl COMPLETED SUCCESSFULLY', {
          completionRate: result.completionRate,
          totalResponses: result.totalResponses,
          modelCoverage: result.modelCoverage,
          duration: result.duration
        });
        
        // Send success notification
        await this.sendNotification('success', 'Weekly tensor crawl completed successfully', result);
      } else {
        logger.error('🚨 Weekly crawl FAILED or INCOMPLETE', result);
        
        // Send failure notification
        await this.sendNotification('error', 'Weekly tensor crawl failed', result);
      }
      
    } catch (error) {
      logger.error('💥 Weekly crawl execution crashed', { error: (error instanceof Error ? error.message : String(error)) });
      await this.sendNotification('critical', 'Weekly tensor crawl crashed', { error: (error instanceof Error ? error.message : String(error)) });
    }
  }

  private async executeDailyHealthCheck(): Promise<void> {
    try {
      logger.info('🔍 Executing daily health check');
      
      const result = await this.healthChecker.runFullHealthCheck();
      
      if (result.passed) {
        logger.info('✅ Daily health check PASSED', result.metrics);
      } else {
        logger.warn('⚠️ Daily health check FAILED', {
          issues: result.issues,
          metrics: result.metrics
        });
        
        // Send warning notification for health issues
        await this.sendNotification('warning', 'Daily health check failed', result);
      }
      
    } catch (error) {
      logger.error('💥 Daily health check crashed', { error: (error instanceof Error ? error.message : String(error)) });
      await this.sendNotification('error', 'Daily health check crashed', { error: (error instanceof Error ? error.message : String(error)) });
    }
  }

  private async executeAnomalyDetection(): Promise<void> {
    try {
      logger.info('🚨 Executing anomaly detection');
      
      const result = await this.anomalyDetector.detectAnomalies();
      
      if (result.detected) {
        const criticalAnomalies = result.anomalies.filter(a => a.severity === 'critical');
        
        if (criticalAnomalies.length > 0) {
          logger.error('🚨 CRITICAL anomalies detected', {
            anomalyCount: result.anomalies.length,
            criticalCount: criticalAnomalies.length,
            systemHealth: result.systemHealth
          });
          
          await this.sendNotification('critical', 'Critical tensor anomalies detected', result);
        } else {
          logger.warn('⚠️ Anomalies detected', {
            anomalyCount: result.anomalies.length,
            systemHealth: result.systemHealth
          });
          
          await this.sendNotification('warning', 'Tensor anomalies detected', result);
        }
      } else {
        logger.info('✅ No anomalies detected - system healthy');
      }
      
    } catch (error) {
      logger.error('💥 Anomaly detection crashed', { error: (error instanceof Error ? error.message : String(error)) });
    }
  }

  private async executeEmergencyHealthCheck(): Promise<void> {
    try {
      // Quick emergency check - just basic connectivity and recent activity
      const result = await this.healthChecker.runFullHealthCheck();
      
      if (!result.passed) {
        const criticalIssues = result.issues.filter(issue => 
          issue.includes('SYSTEM_ERROR') || 
          issue.includes('LOW_RESPONSE_VOLUME') ||
          issue.includes('INSUFFICIENT_MODEL_COVERAGE')
        );
        
        if (criticalIssues.length > 0) {
          logger.error('🚨 EMERGENCY: Critical system issues detected', {
            issues: criticalIssues
          });
          
          await this.sendNotification('critical', 'EMERGENCY: Critical system failure', {
            issues: criticalIssues,
            timestamp: new Date()
          });
        }
      }
      
    } catch (error) {
      logger.error('💥 Emergency health check failed', { error: (error instanceof Error ? error.message : String(error)) });
    }
  }

  private async sendNotification(level: 'success' | 'warning' | 'error' | 'critical', message: string, data: any): Promise<void> {
    // Log notification
    logger.info(`📢 Notification [${level.toUpperCase()}]: ${message}`, data);
    
    // TODO: Implement actual notification system (email, Slack, etc.)
    // For now, just log to file and console
    
    if (level === 'critical') {
      console.log('\n🚨🚨🚨 CRITICAL ALERT 🚨🚨🚨');
      console.log(`${message}`);
      console.log('Immediate attention required!');
      console.log('🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨\n');
    }
  }

  async stop(): Promise<void> {
    logger.info('🛑 Stopping Tensor Guardian Scheduler');
    
    await this.healthChecker.close();
    await this.weeklyCrawler.close();
    await this.anomalyDetector.close();
    
    logger.info('✅ Tensor Guardian Scheduler stopped');
  }
}

// CLI execution
async function main() {
  const scheduler = new TensorGuardianScheduler();
  
  // Handle graceful shutdown
  process.on('SIGINT', async () => {
    logger.info('🛑 Received SIGINT - shutting down gracefully');
    await scheduler.stop();
    process.exit(0);
  });
  
  process.on('SIGTERM', async () => {
    logger.info('🛑 Received SIGTERM - shutting down gracefully');
    await scheduler.stop();
    process.exit(0);
  });
  
  try {
    scheduler.start();
    logger.info('🎯 Tensor Guardian is now ACTIVE and monitoring your AI memory data');
    
    // Keep the process running
    process.stdin.resume();
    
  } catch (error) {
    logger.error('💥 Tensor Guardian failed to start', { error: (error instanceof Error ? error.message : String(error)) });
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

export { TensorGuardianScheduler }; 