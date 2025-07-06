#!/usr/bin/env ts-node

/*
🛡️ WEEKLY TENSOR GUARDIAN - MAIN ENTRY POINT
Your AI memory data protection system starts here
*/

import { TensorGuardianScheduler } from './scheduler';
import { createLogger, format, transports } from 'winston';

const logger = createLogger({
  level: 'info',
  format: format.combine(
    format.timestamp(),
    format.json()
  ),
  transports: [
    new transports.File({ filename: 'logs/main.log' }),
    new transports.Console({
      format: format.combine(
        format.colorize(),
        format.simple()
      )
    })
  ]
});

async function main() {
  logger.info('🚀 Starting Weekly Tensor Guardian');
  logger.info('🎯 Mission: Protect AI memory data at all costs');
  
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
  
  // Handle uncaught exceptions
  process.on('uncaughtException', (error) => {
    logger.error('💥 Uncaught exception - system may be unstable', { error: (error instanceof Error ? error.message : String(error)) });
    process.exit(1);
  });
  
  process.on('unhandledRejection', (reason, promise) => {
    logger.error('💥 Unhandled rejection - system may be unstable', { reason, promise });
    process.exit(1);
  });
  
  try {
    scheduler.start();
    
    logger.info('✅ Weekly Tensor Guardian is now ACTIVE');
    logger.info('📅 Weekly crawls: Sundays at 2 AM UTC');
    logger.info('🔍 Daily health checks: 6 AM UTC');
    logger.info('🚨 Hourly anomaly detection');
    logger.info('⚡ Emergency monitoring: Every 15 minutes');
    logger.info('');
    logger.info('🛡️ Your AI memory data is now protected');
    
    // Keep the process running
    process.stdin.resume();
    
  } catch (error) {
    logger.error('💥 Weekly Tensor Guardian failed to start', { error: (error instanceof Error ? error.message : String(error)) });
    process.exit(1);
  }
}

// Start the guardian
main().catch(error => {
  console.error('💥 Fatal error starting Weekly Tensor Guardian:', error);
  process.exit(1);
}); 