import express from 'express';
import cors from 'cors';
import CachePopulationScheduler from './cache-population-scheduler';

const app = express();
const port = process.env.PORT || 3003;

// Enable CORS for all routes
app.use(cors());
app.use(express.json());

console.log('🚀 Starting Sophisticated Runner Service...');

// Initialize cache population scheduler
const scheduler = new CachePopulationScheduler();

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    service: 'sophisticated-runner',
    timestamp: new Date().toISOString(),
    version: '2.0-competitive-scoring'
  });
});

// Manual cache regeneration trigger - FIXES 100% SCORES
app.get('/trigger-cache-regen', async (req, res) => {
  try {
    console.log('🔥 MANUAL CACHE REGENERATION TRIGGERED...');
    console.log('📊 This will fix the 100% AI recall scores using competitive algorithms');
    
    // Run cache population with corrected scoring
    await scheduler.populateCache();
    
    res.json({ 
      success: true,
      message: 'Cache regeneration completed with corrected scoring!',
      timestamp: new Date().toISOString(),
      note: 'Microsoft and all domains should now show realistic scores (not 100%)'
    });
  } catch (error: any) {
    console.error('❌ Cache regeneration failed:', error);
    res.status(500).json({ 
      success: false,
      error: error?.message || 'Unknown error occurred',
      timestamp: new Date().toISOString()
    });
  }
});

// Start the cache population scheduler
scheduler.startScheduler();

app.listen(port, () => {
  console.log(`✅ Sophisticated Runner Service running on port ${port}`);
  console.log(`🔧 Manual cache regen available at: /trigger-cache-regen`);
  console.log(`🏥 Health check available at: /health`);
});