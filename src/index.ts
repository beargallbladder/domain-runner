import * as dotenv from 'dotenv';
import { MonitoringService } from './services/monitoring';
import express, { Request, Response } from 'express';
import path from 'path';
import { query, testConnection } from './config/database';
import { Pool } from 'pg';
import * as fs from 'fs';

// Load environment variables
dotenv.config();

// Schema initialization with proper column verification
async function ensureSchemaExists(): Promise<void> {
  try {
    console.log('🔍 Checking if database schema exists...');
    
    // Check if domains table has the correct structure
    try {
      await query(`SELECT status, last_processed_at, process_count FROM domains LIMIT 1`);
      // Check if processing_logs table exists
      await query(`SELECT event_type FROM processing_logs LIMIT 1`);
      console.log('✅ Database schema already exists with correct structure');
      return;
      
    } catch (error: any) {
      console.log(`📦 Schema issue detected (${error.code}): ${error.message}`);
      console.log('🔨 Initializing/fixing database schema...');
      
      // Force schema recreation
      const schemaPath = path.join(__dirname, '..', 'schemas', 'schema.sql');
      
      if (!fs.existsSync(schemaPath)) {
        throw new Error(`Schema file not found at: ${schemaPath}`);
      }
      
      const schema = fs.readFileSync(schemaPath, 'utf8');
      
      // Drop existing tables if they exist with wrong structure
      console.log('🗑️ Dropping existing incompatible tables...');
      await query(`DROP TABLE IF EXISTS processing_logs CASCADE`);
      await query(`DROP TABLE IF EXISTS responses CASCADE`); 
      await query(`DROP TABLE IF EXISTS rate_limits CASCADE`);
      await query(`DROP TABLE IF EXISTS prompt_templates CASCADE`);
      await query(`DROP TABLE IF EXISTS domains CASCADE`);
      
      console.log('🔨 Creating fresh schema...');
      await query(schema);
      
      // Verify schema was created correctly
      await query(`SELECT status, last_processed_at, process_count FROM domains LIMIT 1`);
      await query(`SELECT event_type FROM processing_logs LIMIT 1`);
      
      console.log('✅ Database schema initialized successfully!');
    }
    
  } catch (error) {
    console.error('❌ Schema initialization failed:', error);
    throw error;
  }
}

// Initialize monitoring
const monitoring = MonitoringService.getInstance();

// Create Express app
const app = express();
const port = process.env.PORT || 3000;

// Serve static files
app.use(express.static(path.join(__dirname, 'dashboard/public')));

// API endpoints for metrics
app.get('/api/stats', async (req: Request, res: Response) => {
  try {
    const timeframe = (req.query.timeframe as '1h' | '24h' | '7d') || '24h';
    const stats = await monitoring.getStats(timeframe);
    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

// Get recent alerts
app.get('/api/alerts', async (req: Request, res: Response) => {
  try {
    const alerts = await query(`
      SELECT details
      FROM processing_logs
      WHERE event_type = 'alert'
      ORDER BY created_at DESC
      LIMIT 100
    `);
    res.json(alerts.rows);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch alerts' });
  }
});

// Get recent errors
app.get('/api/errors', async (req: Request, res: Response) => {
  try {
    const errors = await query(`
      SELECT details
      FROM processing_logs
      WHERE event_type = 'error'
      ORDER BY created_at DESC
      LIMIT 50
    `);
    res.json(errors.rows);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch errors' });
  }
});

// Health check endpoint
app.get('/health', (req: Request, res: Response) => {
  res.json({ status: 'ok' });
});

// Initialize application
async function initializeApp(): Promise<void> {
  try {
    // Test database connection first
    console.log('🔍 Testing database connection...');
    const connected = await testConnection();
    if (!connected) {
      throw new Error('Database connection failed');
    }
    
    // Ensure schema exists with proper structure
    await ensureSchemaExists();
    
    // Start the server
    app.listen(port, () => {
      console.log(`Server running at http://localhost:${port}`);
    });
    
    // Start processing
    console.log('🚀 Starting domain processing...');
    processNextBatch().catch((error: unknown) => {
      const err = error as Error;
      console.error('Failed to start processing:', err);
      process.exit(1);
    });
    
  } catch (error) {
    console.error('❌ Application initialization failed:', error);
    process.exit(1);
  }
}

// Initialize the processing loop
async function processNextBatch(): Promise<void> {
  try {
    const pendingDomains = await query(`
      SELECT id, domain
      FROM domains
      WHERE status = 'pending'
      ORDER BY last_processed_at ASC NULLS FIRST
      LIMIT 1
    `);

    if (pendingDomains.rows.length > 0) {
      const domain = pendingDomains.rows[0];
      await monitoring.logDomainProcessing(domain.id, 'processing');
      
      // Process domain here
      // ... your existing processing logic ...

      await monitoring.logDomainProcessing(domain.id, 'completed');
    } else {
      console.log('📊 No pending domains found');
    }
  } catch (error: unknown) {
    const err = error as Error;
    console.error('Processing error:', err);
    await monitoring.logError(err, { context: 'batch_processing' });
  }

  // Schedule next batch
  setTimeout(processNextBatch, 60000); // 1 minute delay
}

// Start the application
initializeApp(); 