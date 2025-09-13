import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs/promises';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(helmet());
app.use(cors());
app.use(compression());
app.use(express.json({ limit: '10mb' }));

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// Internal API for run management
app.post('/api/internal/trigger-run', async (req, res) => {
  try {
    const { run_id, service_impl = 'node', overrides = {} } = req.body;
    
    // In production, this would trigger the actual crawl
    // For now, return a mock response
    res.json({
      run_id,
      status: 'triggered',
      service_impl,
      triggered_at: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/internal/runs/:run_id/status', async (req, res) => {
  try {
    const { run_id } = req.params;
    
    // Check if run exists
    const runPath = path.join(__dirname, '../../../runs', run_id);
    
    try {
      await fs.access(runPath);
      
      // Check for envelope file
      const envelopePath = path.join(runPath, 'run.envelope.json');
      try {
        const envelope = await fs.readFile(envelopePath, 'utf-8');
        const data = JSON.parse(envelope);
        res.json({
          run_id,
          status: data.status || 'running',
          started_at: data.started_at,
          ended_at: data.ended_at
        });
      } catch {
        res.json({
          run_id,
          status: 'running',
          message: 'Run in progress'
        });
      }
    } catch {
      res.status(404).json({ error: 'Run not found' });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/internal/runs/:run_id/score', async (req, res) => {
  try {
    const { run_id } = req.params;
    const scoreData = req.body;
    
    // Store score data
    const runPath = path.join(__dirname, '../../../runs', run_id);
    await fs.mkdir(runPath, { recursive: true });
    await fs.writeFile(
      path.join(runPath, 'score.api.json'),
      JSON.stringify(scoreData, null, 2)
    );
    
    res.json({ 
      status: 'success',
      message: 'Score data stored',
      run_id 
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Public API endpoints
app.get('/api/v1/memory/:brand', async (req, res) => {
  try {
    const { brand } = req.params;
    
    // Get latest run
    const runsDir = path.join(__dirname, '../../../runs');
    const latestLink = path.join(runsDir, 'latest');
    
    try {
      const latestRun = await fs.readlink(latestLink);
      const scorePath = path.join(runsDir, latestRun, 'score.json');
      
      const scoreData = await fs.readFile(scorePath, 'utf-8');
      const scores = JSON.parse(scoreData);
      
      const brandScore = scores.brands.find(b => 
        b.name.toLowerCase() === brand.toLowerCase()
      );
      
      if (brandScore) {
        res.json({
          brand: brandScore.name,
          memory_score: brandScore.memory_score,
          consensus_score: brandScore.consensus_score,
          volatility: brandScore.volatility,
          last_updated: scores.generated_at
        });
      } else {
        res.status(404).json({ error: 'Brand not found' });
      }
    } catch (error) {
      res.status(404).json({ error: 'No data available' });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/v1/leaderboard', async (req, res) => {
  try {
    const { limit = 100, sort_by = 'memory_score' } = req.query;
    
    // Get latest run
    const runsDir = path.join(__dirname, '../../../runs');
    const latestLink = path.join(runsDir, 'latest');
    
    try {
      const latestRun = await fs.readlink(latestLink);
      const scorePath = path.join(runsDir, latestRun, 'score.json');
      
      const scoreData = await fs.readFile(scorePath, 'utf-8');
      const scores = JSON.parse(scoreData);
      
      // Sort brands
      const sorted = [...scores.brands].sort((a, b) => {
        return b[sort_by] - a[sort_by];
      });
      
      res.json({
        leaderboard: sorted.slice(0, parseInt(limit)),
        total_brands: scores.brands.length,
        generated_at: scores.generated_at,
        summary: scores.summary
      });
    } catch (error) {
      res.status(404).json({ error: 'No data available' });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Rollback endpoint
app.post('/api/internal/rollback', async (req, res) => {
  try {
    const { tag, run_id } = req.body;
    
    // In production, this would trigger rollback procedures
    res.json({
      status: 'success',
      message: `Rolled back to ${tag}`,
      run_id
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Sentinel API running on port ${PORT}`);
  console.log(`   Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`   Health check: http://localhost:${PORT}/health`);
});