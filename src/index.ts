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
      
      // Try multiple possible schema file locations
      const possiblePaths = [
        path.join(__dirname, '..', 'schemas', 'schema.sql'),
        path.join(__dirname, '..', '..', 'schemas', 'schema.sql'),
        path.join(process.cwd(), 'schemas', 'schema.sql'),
        path.join('/opt/render/project/src', 'schemas', 'schema.sql'),
        path.join('/opt/render/project', 'schemas', 'schema.sql')
      ];
      
      let schemaContent: string | null = null;
      let foundPath: string | null = null;
      
      for (const schemaPath of possiblePaths) {
        console.log(`🔍 Trying schema path: ${schemaPath}`);
        if (fs.existsSync(schemaPath)) {
          schemaContent = fs.readFileSync(schemaPath, 'utf8');
          foundPath = schemaPath;
          console.log(`✅ Found schema at: ${foundPath}`);
          break;
        }
      }
      
      if (!schemaContent) {
        console.log('⚠️ Schema file not found, using embedded schema...');
        // Embedded schema as fallback
        schemaContent = `
          -- Enable UUID extension
          CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
          
          -- Create domains table with full temporal tracking
          CREATE TABLE IF NOT EXISTS domains (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            domain TEXT NOT NULL UNIQUE,
            status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'error')),
            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            last_processed_at TIMESTAMP WITH TIME ZONE,
            process_count INTEGER DEFAULT 0,
            error_count INTEGER DEFAULT 0,
            source TEXT
          );
          
          -- Create responses table with full temporal and cost tracking
          CREATE TABLE IF NOT EXISTS responses (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            domain_id UUID REFERENCES domains(id),
            model TEXT NOT NULL,
            prompt_type TEXT NOT NULL,
            interpolated_prompt TEXT NOT NULL,
            raw_response TEXT NOT NULL,
            token_count INTEGER,
            prompt_tokens INTEGER,
            completion_tokens INTEGER,
            token_usage JSONB,
            total_cost_usd DECIMAL(10,6),
            latency_ms INTEGER,
            captured_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
          );
          
          -- Create processing_logs table for detailed temporal monitoring
          CREATE TABLE IF NOT EXISTS processing_logs (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            domain_id UUID REFERENCES domains(id),
            event_type TEXT NOT NULL,
            details JSONB,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
          );
          
          -- Create rate_limits table for temporal API usage tracking
          CREATE TABLE IF NOT EXISTS rate_limits (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            model TEXT NOT NULL,
            requests_per_minute INTEGER NOT NULL,
            requests_per_hour INTEGER NOT NULL,
            requests_per_day INTEGER NOT NULL,
            current_minute_count INTEGER DEFAULT 0,
            current_hour_count INTEGER DEFAULT 0,
            current_day_count INTEGER DEFAULT 0,
            last_reset_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            window_start TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            UNIQUE (model)
          );
          
          -- Create prompt_templates table for template management
          CREATE TABLE IF NOT EXISTS prompt_templates (
            id TEXT PRIMARY KEY,
            template TEXT NOT NULL,
            category TEXT,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
          );
        `;
      }
      
      // Drop existing tables if they exist with wrong structure
      console.log('🗑️ Dropping existing incompatible tables...');
      await query(`DROP TABLE IF EXISTS processing_logs CASCADE`);
      await query(`DROP TABLE IF EXISTS responses CASCADE`); 
      await query(`DROP TABLE IF EXISTS rate_limits CASCADE`);
      await query(`DROP TABLE IF EXISTS prompt_templates CASCADE`);
      await query(`DROP TABLE IF EXISTS domains CASCADE`);
      
      console.log('🔨 Creating fresh schema...');
      await query(schemaContent);
      
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