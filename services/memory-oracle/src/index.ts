import { MemoryOracleService, MemoryOracleConfig } from './MemoryOracleService';

// Memory Oracle Service Configuration
const config: MemoryOracleConfig = {
  databaseUrl: process.env.DATABASE_URL || 'postgresql://raw_capture_db_user:wjFesUM8ISNEvE2b4kZtRAKgGYJVtKK5@dpg-d11fqgndiees73fb35dg-a.oregon-postgres.render.com/raw_capture_db',
  port: parseInt(process.env.PORT || '3006'),
  logLevel: process.env.LOG_LEVEL || 'info',
  tensorComputeInterval: parseInt(process.env.TENSOR_COMPUTE_INTERVAL || '60'), // minutes
  driftDetectionInterval: parseInt(process.env.DRIFT_DETECTION_INTERVAL || '120'), // minutes
  consensusComputeInterval: parseInt(process.env.CONSENSUS_COMPUTE_INTERVAL || '90') // minutes
};

// Start Memory Oracle Service
async function startMemoryOracle() {
  try {
    console.log('🧠 Starting Memory Oracle Service with Advanced Tensors...');
    console.log('📊 Configuration:', {
      port: config.port,
      tensorComputeInterval: config.tensorComputeInterval,
      driftDetectionInterval: config.driftDetectionInterval,
      consensusComputeInterval: config.consensusComputeInterval
    });
    
    const memoryOracleService = new MemoryOracleService(config);
    await memoryOracleService.start();
    
    console.log('✅ Memory Oracle Service with Tensors started successfully');
    console.log('🌐 Service endpoints available at http://localhost:' + config.port);
    
  } catch (error) {
    console.error('❌ Failed to start Memory Oracle Service:', error);
    process.exit(1);
  }
}

// Handle uncaught exceptions and rejections
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT signal received: closing HTTP server');
  process.exit(0);
});

// Start the service
startMemoryOracle();