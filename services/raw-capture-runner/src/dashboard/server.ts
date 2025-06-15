import express, { Request, Response } from 'express';
import { MonitoringService } from '../services/monitoring';
import { query } from '../config/database';
import path from 'path';

const app = express();
const port = process.env.PORT || 3000;
const monitoring = MonitoringService.getInstance();

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));

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

// Serve the dashboard HTML
app.get('/', (req: Request, res: Response) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start server
app.listen(port, () => {
  console.log(`Dashboard running at http://localhost:${port}`);
}); 