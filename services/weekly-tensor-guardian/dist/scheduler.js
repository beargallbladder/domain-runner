#!/usr/bin/env ts-node
"use strict";
/*
⏰ TENSOR GUARDIAN SCHEDULER
Orchestrates weekly crawls, health checks, and anomaly detection
The central nervous system of your AI memory data collection
*/
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.TensorGuardianScheduler = void 0;
const cron = __importStar(require("node-cron"));
const winston_1 = require("winston");
const health_checker_1 = require("./health-checker");
const weekly_crawler_1 = require("./weekly-crawler");
const anomaly_detector_1 = require("./anomaly-detector");
const logger = (0, winston_1.createLogger)({
    level: 'info',
    format: winston_1.format.combine(winston_1.format.timestamp(), winston_1.format.json()),
    transports: [
        new winston_1.transports.File({ filename: 'logs/scheduler.log' }),
        new winston_1.transports.Console()
    ]
});
class TensorGuardianScheduler {
    constructor() {
        this.healthChecker = new health_checker_1.TensorHealthChecker();
        this.weeklyCrawler = new weekly_crawler_1.WeeklyTensorCrawler();
        this.anomalyDetector = new anomaly_detector_1.TensorAnomalyDetector();
    }
    start() {
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
    async executeWeeklyCrawl() {
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
            }
            else {
                logger.error('🚨 Weekly crawl FAILED or INCOMPLETE', result);
                // Send failure notification
                await this.sendNotification('error', 'Weekly tensor crawl failed', result);
            }
        }
        catch (error) {
            logger.error('💥 Weekly crawl execution crashed', { error: (error instanceof Error ? error.message : String(error)) });
            await this.sendNotification('critical', 'Weekly tensor crawl crashed', { error: (error instanceof Error ? error.message : String(error)) });
        }
    }
    async executeDailyHealthCheck() {
        try {
            logger.info('🔍 Executing daily health check');
            const result = await this.healthChecker.runFullHealthCheck();
            if (result.passed) {
                logger.info('✅ Daily health check PASSED', result.metrics);
            }
            else {
                logger.warn('⚠️ Daily health check FAILED', {
                    issues: result.issues,
                    metrics: result.metrics
                });
                // Send warning notification for health issues
                await this.sendNotification('warning', 'Daily health check failed', result);
            }
        }
        catch (error) {
            logger.error('💥 Daily health check crashed', { error: (error instanceof Error ? error.message : String(error)) });
            await this.sendNotification('error', 'Daily health check crashed', { error: (error instanceof Error ? error.message : String(error)) });
        }
    }
    async executeAnomalyDetection() {
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
                }
                else {
                    logger.warn('⚠️ Anomalies detected', {
                        anomalyCount: result.anomalies.length,
                        systemHealth: result.systemHealth
                    });
                    await this.sendNotification('warning', 'Tensor anomalies detected', result);
                }
            }
            else {
                logger.info('✅ No anomalies detected - system healthy');
            }
        }
        catch (error) {
            logger.error('💥 Anomaly detection crashed', { error: (error instanceof Error ? error.message : String(error)) });
        }
    }
    async executeEmergencyHealthCheck() {
        try {
            // Quick emergency check - just basic connectivity and recent activity
            const result = await this.healthChecker.runFullHealthCheck();
            if (!result.passed) {
                const criticalIssues = result.issues.filter(issue => issue.includes('SYSTEM_ERROR') ||
                    issue.includes('LOW_RESPONSE_VOLUME') ||
                    issue.includes('INSUFFICIENT_MODEL_COVERAGE'));
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
        }
        catch (error) {
            logger.error('💥 Emergency health check failed', { error: (error instanceof Error ? error.message : String(error)) });
        }
    }
    async sendNotification(level, message, data) {
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
    async stop() {
        logger.info('🛑 Stopping Tensor Guardian Scheduler');
        await this.healthChecker.close();
        await this.weeklyCrawler.close();
        await this.anomalyDetector.close();
        logger.info('✅ Tensor Guardian Scheduler stopped');
    }
}
exports.TensorGuardianScheduler = TensorGuardianScheduler;
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
    }
    catch (error) {
        logger.error('💥 Tensor Guardian failed to start', { error: (error instanceof Error ? error.message : String(error)) });
        process.exit(1);
    }
}
if (require.main === module) {
    main();
}
//# sourceMappingURL=scheduler.js.map