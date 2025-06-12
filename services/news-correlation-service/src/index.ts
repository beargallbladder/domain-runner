const express = require('express');
const cors = require('cors');
import { db } from './database';
import { newsScanner } from './news-scanner';
import { correlationEngine } from './correlation-engine';

const app = express();
const PORT = process.env.PORT || 3002;

app.use(cors());
app.use(express.json());

// ============================================================================
// 📰 NEWS CORRELATION SERVICE - MAIN API
// ============================================================================

// Health check
app.get('/health', (req, res) => {
  res.json({
    service: 'news-correlation-service',
    status: 'running',
    timestamp: new Date().toISOString()
  });
});

// Status endpoint
app.get('/status', async (req, res) => {
  try {
    const domains = await db.getMonitoredDomains();
    
    res.json({
      service: 'News Correlation Service',
      status: 'active',
      monitored_domains: domains.length,
      version: '1.0.0',
      capabilities: [
        'Google News RSS scanning',
        'Event-perception correlation',
        'Crisis event detection',
        'Sentiment analysis'
      ]
    });
  } catch (error) {
    res.status(500).json({ 
      error: 'Status check failed', 
      details: (error as Error).message 
    });
  }
});

// Manual news scan trigger
app.post('/scan/news', async (req, res) => {
  try {
    console.log('📰 Manual news scan triggered...');
    
    const domains = await db.getMonitoredDomains();
    const scanResult = await newsScanner.scanAllSources(domains);
    
    // Store detected events
    let eventsStored = 0;
    for (const event of scanResult.events) {
      try {
        await db.storeNewsEvent(event);
        eventsStored++;
      } catch (error) {
        console.warn('⚠️  Failed to store event:', error);
      }
    }
    
    res.json({
      success: true,
      action: 'News Scan Completed',
      results: {
        domains_scanned: domains.length,
        events_detected: scanResult.events.length,
        events_stored: eventsStored,
        sources_scanned: scanResult.sources_scanned
      },
      scan_details: scanResult
    });
    
  } catch (error) {
    console.error('❌ News scan failed:', error);
    res.status(500).json({ 
      error: 'News scan failed', 
      details: (error as Error).message 
    });
  }
});

// Manual correlation processing trigger
app.post('/process/correlations', async (req, res) => {
  try {
    console.log('🔗 Manual correlation processing triggered...');
    
    const result = await correlationEngine.processCorrelations();
    
    res.json({
      success: true,
      action: 'Correlation Processing Completed',
      results: result
    });
    
  } catch (error) {
    console.error('❌ Correlation processing failed:', error);
    res.status(500).json({ 
      error: 'Correlation processing failed', 
      details: (error as Error).message 
    });
  }
});

// Combined scan + correlate endpoint
app.post('/scan-and-correlate', async (req, res) => {
  try {
    console.log('🔄 Full scan and correlation cycle triggered...');
    
    // Step 1: Scan for news
    const domains = await db.getMonitoredDomains();
    const scanResult = await newsScanner.scanAllSources(domains);
    
    // Step 2: Store events
    let eventsStored = 0;
    for (const event of scanResult.events) {
      try {
        await db.storeNewsEvent(event);
        eventsStored++;
      } catch (error) {
        console.warn('⚠️  Failed to store event:', error);
      }
    }
    
    // Step 3: Process correlations
    const correlationResult = await correlationEngine.processCorrelations();
    
    res.json({
      success: true,
      action: 'Full Scan and Correlation Cycle',
      scan_results: {
        domains_scanned: domains.length,
        events_detected: scanResult.events.length,
        events_stored: eventsStored
      },
      correlation_results: correlationResult,
      total_processing_time: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ Full cycle failed:', error);
    res.status(500).json({ 
      error: 'Full cycle failed', 
      details: (error as Error).message 
    });
  }
});

// Get recent events for a domain
app.get('/events/:domain', async (req, res) => {
  try {
    const { domain } = req.params;
    const { limit = 10 } = req.query;
    
    const pool = require('./database').default;
    const events = await pool.query(`
      SELECT * FROM news_events 
      WHERE domain = $1 
      ORDER BY event_date DESC, detected_at DESC
      LIMIT $2
    `, [domain, limit]);
    
    res.json({
      domain,
      events: events.rows,
      count: events.rows.length
    });
    
  } catch (error) {
    res.status(500).json({ 
      error: 'Failed to fetch events', 
      details: (error as Error).message 
    });
  }
});

// ============================================================================
// 📊 SCHEDULED PROCESSING (Background)
// ============================================================================

// Automatic processing every 6 hours
const PROCESSING_INTERVAL = 6 * 60 * 60 * 1000; // 6 hours

async function scheduledProcessing() {
  try {
    console.log('⏰ Scheduled news scan and correlation processing...');
    
    const domains = await db.getMonitoredDomains();
    
    // Only process if we have domains to monitor
    if (domains.length > 0) {
      // Scan for news
      const scanResult = await newsScanner.scanAllSources(domains);
      
      // Store events
      let eventsStored = 0;
      for (const event of scanResult.events) {
        try {
          await db.storeNewsEvent(event);
          eventsStored++;
        } catch (error) {
          // Likely duplicate event, ignore
        }
      }
      
      // Process correlations
      const correlationResult = await correlationEngine.processCorrelations();
      
      console.log(`✅ Scheduled processing complete: ${eventsStored} events, ${correlationResult.correlations_created} correlations`);
    }
    
  } catch (error) {
    console.error('❌ Scheduled processing failed:', error);
  }
}

// Start scheduled processing
setInterval(scheduledProcessing, PROCESSING_INTERVAL);

// ============================================================================
// 🚀 SERVER STARTUP
// ============================================================================

app.listen(PORT, () => {
  console.log(`📰 News Correlation Service running on port ${PORT}`);
  console.log(`⏰ Scheduled processing every ${PROCESSING_INTERVAL / (60 * 60 * 1000)} hours`);
  
  // Run initial processing after 30 seconds
  setTimeout(() => {
    scheduledProcessing();
  }, 30000);
});

export default app; 