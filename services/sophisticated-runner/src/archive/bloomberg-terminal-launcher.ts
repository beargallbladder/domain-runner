#!/usr/bin/env node

/**
 * 🎯 BLOOMBERG TERMINAL LAUNCHER
 * ==============================
 * 
 * Launch the complete Bloomberg Intelligence ecosystem
 * 
 * Purpose: Single entry point to start the entire Bloomberg Terminal for AI Brand Intelligence
 * 
 * Components Launched:
 * 1. Neural Swarm Orchestrator - Master coordinator
 * 2. Bloomberg Intelligence Coordinator - Multi-LLM neural swarm
 * 3. Visceral Alert System - Professional brutality alerts
 * 4. Pattern Detection Engine - Market dynamics analysis
 * 
 * Integration: Complete Bloomberg-style competitive intelligence platform
 */

import { NeuralSwarmOrchestrator } from './neural-swarm-orchestrator';
import winston from 'winston';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// ============================================================================
// 🎯 BLOOMBERG TERMINAL LAUNCHER
// ============================================================================

class BloombergTerminalLauncher {
  private logger: winston.Logger;
  private orchestrator: NeuralSwarmOrchestrator;

  constructor() {
    this.initializeLogger();
    this.validateEnvironment();
  }

  /**
   * 📊 INITIALIZE LOGGER
   */
  private initializeLogger(): void {
    this.logger = winston.createLogger({
      level: 'info',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        winston.format.json()
      ),
      defaultMeta: { 
        service: 'bloomberg-terminal-launcher',
        version: '1.0.0'
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
  }

  /**
   * ✅ VALIDATE ENVIRONMENT
   */
  private validateEnvironment(): void {
    const requiredVars = [
      'DATABASE_URL',
      'OPENAI_API_KEY',
      'ANTHROPIC_API_KEY'
    ];

    const missingVars = requiredVars.filter(varName => !process.env[varName]);

    if (missingVars.length > 0) {
      this.logger.error('🚨 CRITICAL: Missing required environment variables', { 
        missing: missingVars 
      });
      process.exit(1);
    }

    // Log available API keys for neural swarm
    const availableKeys = [
      'OPENAI_API_KEY',
      'ANTHROPIC_API_KEY', 
      'DEEPSEEK_API_KEY',
      'TOGETHER_API_KEY',
      'XAI_API_KEY',
      'PERPLEXITY_API_KEY',
      'GOOGLE_API_KEY',
      'MISTRAL_API_KEY'
    ].filter(key => process.env[key]);

    this.logger.info('🔑 Neural Swarm API Keys Available', { 
      count: availableKeys.length,
      providers: availableKeys.map(key => key.replace('_API_KEY', '').toLowerCase())
    });

    if (availableKeys.length < 3) {
      this.logger.warn('⚠️  WARNING: Limited API keys may reduce neural swarm effectiveness');
    }
  }

  /**
   * 🚀 LAUNCH BLOOMBERG TERMINAL
   */
  async launch(): Promise<void> {
    this.logger.info('🎯 Launching Bloomberg Terminal for AI Brand Intelligence...');
    
    try {
      // ASCII Art Header
      console.log(`
╔══════════════════════════════════════════════════════════════╗
║                                                              ║
║    🎯 BLOOMBERG TERMINAL FOR AI BRAND INTELLIGENCE 🎯        ║
║                                                              ║
║    The professional standard for competitive intelligence    ║
║    Neural swarm processing • Visceral alerts • Patterns     ║
║                                                              ║
╚══════════════════════════════════════════════════════════════╝
      `);

      // Initialize Neural Swarm Orchestrator
      this.logger.info('🧠 Initializing Neural Swarm Orchestrator...');
      this.orchestrator = new NeuralSwarmOrchestrator(
        process.env.DATABASE_URL!,
        parseInt(process.env.BLOOMBERG_TERMINAL_PORT || '8080')
      );

      // Start the orchestrator (which starts all components)
      await this.orchestrator.start();

      // Success banner
      console.log(`
╔══════════════════════════════════════════════════════════════╗
║                                                              ║
║                   🎉 BLOOMBERG TERMINAL ACTIVE 🎉           ║
║                                                              ║
║  Dashboard: ws://localhost:${process.env.BLOOMBERG_TERMINAL_PORT || '8080'}                             ║
║  Neural Swarm: Multi-LLM intelligence coordination          ║
║  Alert System: Professional brutality alerts               ║
║  Pattern Engine: Market dynamics analysis                  ║
║                                                              ║
║  Ready for competitive intelligence at Bloomberg scale      ║
║                                                              ║
╚══════════════════════════════════════════════════════════════╝
      `);

      this.logger.info('✅ Bloomberg Terminal for AI Brand Intelligence is operational');

      // Setup graceful shutdown
      this.setupGracefulShutdown();

    } catch (error) {
      this.logger.error('❌ Failed to launch Bloomberg Terminal', { 
        error: error.message,
        stack: error.stack 
      });
      process.exit(1);
    }
  }

  /**
   * 🛑 SETUP GRACEFUL SHUTDOWN
   */
  private setupGracefulShutdown(): void {
    const shutdown = async (signal: string) => {
      this.logger.info(`🛑 Received ${signal}, shutting down Bloomberg Terminal...`);
      
      try {
        if (this.orchestrator) {
          await this.orchestrator.stop();
        }
        
        this.logger.info('✅ Bloomberg Terminal shutdown complete');
        process.exit(0);
      } catch (error) {
        this.logger.error('❌ Error during shutdown', { error: error.message });
        process.exit(1);
      }
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
    process.on('SIGUSR2', () => shutdown('SIGUSR2')); // For nodemon

    // Handle uncaught exceptions
    process.on('uncaughtException', (error) => {
      this.logger.error('💥 Uncaught Exception', { 
        error: error.message, 
        stack: error.stack 
      });
      shutdown('UNCAUGHT_EXCEPTION');
    });

    process.on('unhandledRejection', (reason, promise) => {
      this.logger.error('💥 Unhandled Rejection', { 
        reason, 
        promise 
      });
      shutdown('UNHANDLED_REJECTION');
    });
  }
}

// ============================================================================
// 🚀 MAIN EXECUTION
// ============================================================================

async function main() {
  const launcher = new BloombergTerminalLauncher();
  await launcher.launch();
}

// Only run if this is the main module
if (require.main === module) {
  main().catch((error) => {
    console.error('💥 Fatal error launching Bloomberg Terminal:', error);
    process.exit(1);
  });
}

export { BloombergTerminalLauncher };