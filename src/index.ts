import * as dotenv from 'dotenv';
import { MonitoringService } from './services/monitoring';
import express, { Request, Response } from 'express';
import path from 'path';
import { query } from './config/database';

// Load environment variables
dotenv.config();

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

// Start the server
app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});

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
    }
  } catch (error: unknown) {
    const err = error as Error;
    console.error('Processing error:', err);
    await monitoring.logError(err, { context: 'batch_processing' });
  }

  // Schedule next batch
  setTimeout(processNextBatch, 60000); // 1 minute delay
}

// Start processing
processNextBatch().catch((error: unknown) => {
  const err = error as Error;
  console.error('Failed to start processing:', err);
  process.exit(1);
}); 