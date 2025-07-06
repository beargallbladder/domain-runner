import express from 'express';
import cors from 'cors';
import * as dotenv from 'dotenv';
import { testConnection, initializeSchema, getStats, getDomainsToProcess } from './database';
import { processAllProviders, getConfiguredProviders } from './providers';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 10000;

// Middleware
app.use(cors());
app.use(express.json());

// Global state
let isProcessing = false;
let startTime = Date.now();
let totalProcessed = 0;

// BULLETPROOF HEALTH CHECK
app.get('/health', async (req, res) => {
  try {
    const dbConnected = await testConnection();
    const configuredProviders = getConfiguredProviders();
    const uptime = Math.floor((Date.now() - startTime) / 1000);
    
    res.json({
      status: 'OK',
      service: 'LLM Memory Runner',
      version: '1.0.0',
      uptime_seconds: uptime,
      database_connected: dbConnected,
      providers_configured: configuredProviders.length,
      providers: configuredProviders,
      currently_processing: isProcessing,
      total_processed: totalProcessed,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      status: 'ERROR',
      error: 'Health check failed',
      timestamp: new Date().toISOString()
    });
  }
});

// REAL STATS ENDPOINT
app.get('/stats', async (req, res) => {
  try {
    const stats = await getStats();
    const configuredProviders = getConfiguredProviders();
    
    res.json({
      service: 'LLM Memory Runner',
      total_requests: stats.totalResponses,
      successful_requests: stats.totalResponses - stats.recentErrors,
      failed_requests: stats.recentErrors,
      providers_configured: configuredProviders.length,
      responses_by_provider: stats.responsesByProvider,
      currently_processing: isProcessing,
      total_processed: totalProcessed,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to get stats',
      timestamp: new Date().toISOString()
    });
  }
});

// PROCESS DOMAINS ENDPOINT
app.post('/process-domains', async (req, res) => {
  if (isProcessing) {
    return res.status(429).json({
      error: 'Already processing domains',
      message: 'Wait for current batch to complete'
    });
  }

  try {
    isProcessing = true;
    const limit = req.body.limit || 5;
    
    console.log(`🚀 Starting domain processing batch (limit: ${limit})`);
    
    const domains = await getDomainsToProcess(limit);
    if (domains.length === 0) {
      isProcessing = false;
      return res.json({
        message: 'No domains to process',
        processed: 0
      });
    }

    // Process domains asynchronously
    processDomainsAsync(domains);

    res.json({
      message: `Started processing ${domains.length} domains`,
      domains: domains,
      estimated_time_minutes: domains.length * 2
    });

  } catch (error) {
    isProcessing = false;
    console.error('❌ Process domains error:', error);
    res.status(500).json({
      error: 'Failed to start processing',
      message: 'Check server logs for details'
    });
  }
});

// TEST SINGLE DOMAIN
app.post('/test-domain', async (req, res) => {
  const { domain } = req.body;
  
  if (!domain) {
    return res.status(400).json({
      error: 'Domain required',
      message: 'Provide domain in request body'
    });
  }

  try {
    console.log(`🧪 Testing single domain: ${domain}`);
    await processAllProviders(domain);
    
    res.json({
      message: `Successfully processed ${domain}`,
      domain: domain,
      providers: getConfiguredProviders().length
    });

  } catch (error) {
    console.error(`❌ Test domain error for ${domain}:`, error);
    res.status(500).json({
      error: 'Failed to process domain',
      domain: domain
    });
  }
});

// Async domain processing function
async function processDomainsAsync(domains: string[]): Promise<void> {
  try {
    console.log(`🔄 Processing ${domains.length} domains with all providers`);
    
    for (const domain of domains) {
      try {
        await processAllProviders(domain);
        totalProcessed++;
        console.log(`✅ Completed ${domain} (${totalProcessed} total)`);
        
        await new Promise(resolve => setTimeout(resolve, 2000));
      } catch (error) {
        console.error(`❌ Failed to process ${domain}:`, error);
      }
    }
    
    console.log(`🎉 Batch complete! Processed ${domains.length} domains`);
  } catch (error) {
    console.error('❌ Batch processing error:', error);
  } finally {
    isProcessing = false;
  }
}

// Initialize and start server
async function startServer(): Promise<void> {
  try {
    console.log('🔧 Initializing LLM Memory Runner...');
    
    const dbConnected = await testConnection();
    if (!dbConnected) {
      throw new Error('Database connection failed');
    }
    
    await initializeSchema();
    
    const configuredProviders = getConfiguredProviders();
    console.log(`✅ Configured providers: ${configuredProviders.join(', ')}`);
    
    if (configuredProviders.length === 0) {
      console.warn('⚠️ No AI providers configured! Set API keys in environment variables.');
    }
    
    app.listen(PORT, () => {
      console.log(`🚀 LLM Memory Runner running on port ${PORT}`);
      console.log(`📊 Health check: http://localhost:${PORT}/health`);
      console.log(`📈 Stats: http://localhost:${PORT}/stats`);
      console.log(`✅ Ready to process domains with ${configuredProviders.length} providers!`);
    });
    
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

process.on('SIGTERM', () => {
  console.log('🛑 Received SIGTERM, shutting down gracefully...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('🛑 Received SIGINT, shutting down gracefully...');
  process.exit(0);
});

startServer();