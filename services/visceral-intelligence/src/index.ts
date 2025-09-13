import express, { Request, Response } from 'express';
import cors from 'cors';
import { Pool } from 'pg';
import winston from 'winston';
import * as cron from 'node-cron';
import { WebSocketServer, WebSocket } from 'ws';
import { createServer } from 'http';

import { CompetitiveIntelligenceEngine } from './CompetitiveIntelligenceEngine';
import { VisceralLanguageEngine } from './VisceralLanguageEngine';
import { 
  VisceralAlert, 
  EnterpriseReport, 
  VisceralMetrics, 
  RealTimeEvent,
  ShareableContent,
  PremiumTrigger 
} from './types';

// Production logging configuration
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { 
    service: 'visceral-intelligence',
    version: '1.0.0',
    environment: process.env.NODE_ENV || 'development'
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

const app = express();
const server = createServer(app);
const wss = new WebSocketServer({ server });
const port = process.env.PORT || 3004;

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? {
    rejectUnauthorized: true,
  } : false,
  max: 20,
  min: 5,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 30000
});

// Initialize engines
const intelligenceEngine = new CompetitiveIntelligenceEngine(pool);
const languageEngine = new VisceralLanguageEngine();

// Real-time alert storage
let activeAlerts: VisceralAlert[] = [];
let connectedClients: Set<WebSocket> = new Set();
let visceralMetrics: VisceralMetrics = {
  total_domains_tracked: 0,
  categories_monitored: 0,
  active_bloodbaths: 0,
  domination_events: 0,
  uprising_alerts: 0,
  market_volatility_index: 0,
  competitive_intensity_score: 0,
  disruption_probability: 0
};

// CORS Configuration
const allowedOrigins = [
  'https://llmrank.io',
  'https://www.llmrank.io',
  'https://llm-pagerank-frontend.onrender.com',
  'http://localhost:3000',
  'https://localhost:3000'
];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

app.use(express.json());

// Authentication middleware
const authenticateApiKey = (req: Request, res: Response, next: any) => {
  const apiKey = req.headers['x-api-key'] || req.headers['authorization']?.replace('Bearer ', '');
  
  if (!apiKey) {
    return res.status(401).json({ error: 'API key required' });
  }
  
  const validApiKeys = [
    process.env.INTERNAL_API_KEY,
    process.env.ADMIN_API_KEY
  ].filter(Boolean);
  
  if (!validApiKeys.includes(apiKey as string)) {
    return res.status(403).json({ error: 'Invalid API key' });
  }
  
  next();
};

// WebSocket connection handling
wss.on('connection', (ws: WebSocket, req) => {
  logger.info('New WebSocket connection established', { 
    clientIP: req.socket.remoteAddress,
    userAgent: req.headers['user-agent']
  });
  
  connectedClients.add(ws);
  
  // Send current alerts immediately
  ws.send(JSON.stringify({
    type: 'initial_alerts',
    data: activeAlerts.slice(0, 10), // Send top 10 alerts
    metrics: visceralMetrics,
    timestamp: new Date().toISOString()
  }));
  
  ws.on('close', () => {
    connectedClients.delete(ws);
    logger.info('WebSocket connection closed');
  });
  
  ws.on('error', (error) => {
    logger.error('WebSocket error', { error: error.message });
    connectedClients.delete(ws);
  });
});

// Broadcast alerts to all connected clients
function broadcastAlert(alert: VisceralAlert) {
  const message = JSON.stringify({
    type: 'visceral_alert',
    data: alert,
    timestamp: new Date().toISOString()
  });
  
  connectedClients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message);
    }
  });
  
  logger.info('Broadcasted visceral alert', { 
    alertId: alert.id,
    intensity: alert.intensity,
    category: alert.category,
    clientCount: connectedClients.size
  });
}

// Health check endpoint
app.get('/health', async (req: Request, res: Response) => {
  try {
    const dbResult = await pool.query('SELECT NOW()');
    
    res.json({
      status: 'healthy',
      service: 'visceral-intelligence',
      version: '1.0.0',
      timestamp: new Date().toISOString(),
      database: 'connected',
      websocket_clients: connectedClients.size,
      active_alerts: activeAlerts.length,
      metrics: visceralMetrics
    });
  } catch (error: any) {
    logger.error('Health check failed', { error: error.message });
    res.status(503).json({
      status: 'unhealthy',
      service: 'visceral-intelligence',
      timestamp: new Date().toISOString(),
      error: error.message
    });
  }
});

// Get current visceral alerts
app.get('/alerts', (req: Request, res: Response) => {
  const limit = parseInt(req.query.limit as string) || 20;
  const intensity = req.query.intensity as string;
  const category = req.query.category as string;
  
  let filteredAlerts = activeAlerts;
  
  if (intensity) {
    filteredAlerts = filteredAlerts.filter(alert => alert.intensity === intensity);
  }
  
  if (category) {
    filteredAlerts = filteredAlerts.filter(alert => alert.category === category);
  }
  
  res.json({
    alerts: filteredAlerts.slice(0, limit),
    total: filteredAlerts.length,
    metrics: visceralMetrics,
    timestamp: new Date().toISOString()
  });
});

// Get premium triggers for a specific domain
app.get('/premium-triggers', async (req: Request, res: Response) => {
  try {
    const domain = req.query.domain as string;
    const triggers = await intelligenceEngine.generatePremiumTriggers(domain);
    
    res.json({
      triggers,
      domain,
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    logger.error('Error generating premium triggers', { error: error.message });
    res.status(500).json({ error: 'Failed to generate premium triggers' });
  }
});

// Generate shareable content
app.post('/share', (req: Request, res: Response) => {
  try {
    const { alertId, type } = req.body;
    
    const alert = activeAlerts.find(a => a.id === alertId);
    if (!alert) {
      return res.status(404).json({ error: 'Alert not found' });
    }
    
    const shareableContent = languageEngine.generateShareableContent(alert, type);
    
    res.json({
      content: shareableContent,
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    logger.error('Error generating shareable content', { error: error.message });
    res.status(500).json({ error: 'Failed to generate shareable content' });
  }
});

// Generate enterprise report
app.get('/enterprise-report', authenticateApiKey, async (req: Request, res: Response) => {
  try {
    const domain = req.query.domain as string;
    const timeframe = req.query.timeframe as string || '24h';
    
    // Get domination data
    const marketDomination = await intelligenceEngine.getMarketDomination();
    
    // Filter alerts by timeframe and relevance
    const relevantAlerts = activeAlerts.filter(alert => {
      const hoursDiff = (Date.now() - alert.timestamp.getTime()) / (1000 * 60 * 60);
      const maxHours = timeframe === '7d' ? 168 : timeframe === '48h' ? 48 : 24;
      
      return hoursDiff <= maxHours && (
        !domain || 
        alert.aggressor === domain || 
        alert.victim.includes(domain)
      );
    });
    
    // Generate executive summary
    const bloodbaths = relevantAlerts.filter(a => a.intensity === 'bloodbath' || a.intensity === 'collapse');
    const dominations = relevantAlerts.filter(a => a.intensity === 'domination' || a.intensity === 'obliteration');
    const uprisings = relevantAlerts.filter(a => a.intensity === 'uprising' || a.intensity === 'rampage');
    
    const executiveSummary = `EXECUTIVE INTELLIGENCE BRIEF - ${new Date().toLocaleDateString()}\n\n` +
      `Market Activity: ${relevantAlerts.length} significant events detected\n` +
      `Domination Events: ${dominations.length} (${dominations.filter(a => a.executive_urgency === 'critical').length} critical)\n` +
      `Market Carnage: ${bloodbaths.length} brands under pressure\n` +
      `Emerging Threats: ${uprisings.length} newcomers gaining ground\n\n` +
      `Overall Market Stability: ${visceralMetrics.market_volatility_index > 0.7 ? 'VOLATILE' : 
                                 visceralMetrics.market_volatility_index > 0.4 ? 'UNSTABLE' : 'STABLE'}\n` +
      `Disruption Risk Level: ${visceralMetrics.disruption_probability > 0.7 ? 'CRITICAL' : 
                               visceralMetrics.disruption_probability > 0.4 ? 'ELEVATED' : 'MODERATE'}`;
    
    const report: EnterpriseReport = {
      executive_summary: executiveSummary,
      competitive_threats: relevantAlerts.filter(a => 
        a.executive_urgency === 'critical' || a.executive_urgency === 'high'
      ).slice(0, 10),
      market_opportunities: uprisings.filter(a => a.confidence_score > 0.7).slice(0, 5),
      immediate_actions: generateImmediateActions(relevantAlerts, domain),
      strategic_recommendations: generateStrategicRecommendations(marketDomination, domain),
      risk_assessment: {
        existential_threats: bloodbaths.filter(a => a.executive_urgency === 'critical').length,
        market_disruption_risk: Math.round(visceralMetrics.disruption_probability * 100),
        competitive_pressure: Math.round(visceralMetrics.competitive_intensity_score * 100)
      }
    };
    
    res.json({
      report,
      timeframe,
      domain,
      generated_at: new Date().toISOString(),
      data_freshness: 'real-time'
    });
    
  } catch (error: any) {
    logger.error('Error generating enterprise report', { error: error.message });
    res.status(500).json({ error: 'Failed to generate enterprise report' });
  }
});

// Bloomberg-style market summary
app.get('/market-summary', (req: Request, res: Response) => {
  try {
    const summary = languageEngine.generateBloombergStyleSummary(activeAlerts);
    
    res.json({
      summary,
      alerts_analyzed: activeAlerts.length,
      market_volatility: visceralMetrics.market_volatility_index,
      generated_at: new Date().toISOString()
    });
  } catch (error: any) {
    logger.error('Error generating market summary', { error: error.message });
    res.status(500).json({ error: 'Failed to generate market summary' });
  }
});

// Trigger immediate carnage detection
app.post('/scan-market', authenticateApiKey, async (req: Request, res: Response) => {
  try {
    logger.info('Manual market carnage scan triggered');
    await performVisceralScan();
    
    res.json({
      message: 'Market scan completed',
      alerts_generated: activeAlerts.length,
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    logger.error('Error during manual market scan', { error: error.message });
    res.status(500).json({ error: 'Market scan failed' });
  }
});

// Helper functions
function generateImmediateActions(alerts: VisceralAlert[], domain?: string): string[] {
  const actions: string[] = [];
  
  const criticalThreats = alerts.filter(a => a.executive_urgency === 'critical');
  if (criticalThreats.length > 0) {
    actions.push(`URGENT: Address ${criticalThreats.length} critical competitive threats immediately`);
  }
  
  const domainSpecific = domain ? alerts.filter(a => a.victim.includes(domain)) : [];
  if (domainSpecific.length > 0) {
    actions.push(`Review competitive positioning in ${[...new Set(domainSpecific.map(a => a.category))].join(', ')}`);
  }
  
  const opportunities = alerts.filter(a => a.intensity === 'uprising' && a.confidence_score > 0.8);
  if (opportunities.length > 0) {
    actions.push(`Investigate ${opportunities.length} emerging market opportunities`);
  }
  
  return actions.length > 0 ? actions : ['Monitor market developments', 'Maintain competitive positioning'];
}

function generateStrategicRecommendations(domination: any[], domain?: string): string[] {
  const recommendations: string[] = [];
  
  const volatileMarkets = domination.filter(d => d.market_volatility > 0.6);
  if (volatileMarkets.length > 0) {
    recommendations.push(`Focus defensive strategies in volatile markets: ${volatileMarkets.map(m => m.category).join(', ')}`);
  }
  
  const disruptionRisk = domination.filter(d => d.disruption_probability > 0.7);
  if (disruptionRisk.length > 0) {
    recommendations.push(`Prepare for potential disruption in: ${disruptionRisk.map(d => d.category).join(', ')}`);
  }
  
  recommendations.push('Maintain continuous competitive intelligence monitoring');
  recommendations.push('Develop rapid response capabilities for market shifts');
  
  return recommendations;
}

// Core visceral scanning function
async function performVisceralScan() {
  try {
    logger.info('🔥 VISCERAL SCAN: Detecting market carnage...');
    
    // Detect new carnage
    const newAlerts = await intelligenceEngine.detectMarketCarnage();
    
    // Update metrics
    await updateVisceralMetrics();
    
    // Process new alerts
    for (const alert of newAlerts) {
      // Check for duplicates
      const isDuplicate = activeAlerts.some(existing => 
        existing.aggressor === alert.aggressor && 
        existing.category === alert.category &&
        existing.intensity === alert.intensity &&
        (Date.now() - existing.timestamp.getTime()) < 3600000 // 1 hour
      );
      
      if (!isDuplicate) {
        activeAlerts.unshift(alert); // Add to beginning
        broadcastAlert(alert); // Broadcast immediately
        
        logger.info('🚨 NEW VISCERAL ALERT', {
          intensity: alert.intensity,
          headline: alert.headline,
          category: alert.category,
          confidence: alert.confidence_score
        });
      }
    }
    
    // Trim old alerts (keep last 100)
    activeAlerts = activeAlerts.slice(0, 100);
    
    logger.info(`✅ Visceral scan complete: ${newAlerts.length} new alerts, ${activeAlerts.length} total active`);
    
  } catch (error: any) {
    logger.error('🚨 VISCERAL SCAN ERROR:', { error: error.message });
  }
}

async function updateVisceralMetrics() {
  try {
    // Get basic metrics from database
    const domainsResult = await pool.query('SELECT COUNT(DISTINCT domain) as count FROM domains WHERE status = $1', ['completed']);
    const categoriesResult = await pool.query('SELECT COUNT(DISTINCT category) as count FROM domains WHERE category IS NOT NULL');
    
    // Calculate derived metrics
    const bloodbaths = activeAlerts.filter(a => a.intensity === 'bloodbath' || a.intensity === 'collapse').length;
    const dominations = activeAlerts.filter(a => a.intensity === 'domination' || a.intensity === 'obliteration').length;
    const uprisings = activeAlerts.filter(a => a.intensity === 'uprising' || a.intensity === 'rampage').length;
    
    const totalIntensity = activeAlerts.reduce((sum, alert) => {
      const intensityWeight = {
        'obliteration': 10, 'domination': 8, 'bloodbath': 7, 
        'rampage': 6, 'uprising': 5, 'collapse': 4, 'annihilation': 6
      };
      return sum + (intensityWeight[alert.intensity] || 3);
    }, 0);
    
    visceralMetrics = {
      total_domains_tracked: domainsResult.rows[0]?.count || 0,
      categories_monitored: categoriesResult.rows[0]?.count || 0,
      active_bloodbaths: bloodbaths,
      domination_events: dominations,
      uprising_alerts: uprisings,
      market_volatility_index: Math.min(activeAlerts.length / 50, 1.0),
      competitive_intensity_score: Math.min(totalIntensity / (activeAlerts.length * 10 || 1), 1.0),
      disruption_probability: Math.min(uprisings / (activeAlerts.length || 1), 1.0)
    };
    
  } catch (error: any) {
    logger.error('Error updating visceral metrics', { error: error.message });
  }
}

// Schedule visceral scans every 15 minutes
cron.schedule('*/15 * * * *', () => {
  logger.info('🕐 Scheduled visceral scan starting...');
  performVisceralScan();
});

// Initial scan on startup
setTimeout(() => {
  performVisceralScan();
}, 5000);

// Graceful shutdown
let isShuttingDown = false;

const gracefulShutdown = async (signal: string) => {
  if (isShuttingDown) {
    logger.warn('Shutdown already in progress, forcing exit');
    process.exit(1);
  }
  
  isShuttingDown = true;
  logger.info(`${signal} received, starting graceful shutdown`);

  server.close(async () => {
    logger.info('HTTP server closed');
    
    try {
      // Close WebSocket connections
      connectedClients.forEach(client => {
        client.close();
      });
      
      // Close database connections
      await pool.end();
      logger.info('Database connections closed');
      
      logger.info('Graceful shutdown completed');
      process.exit(0);
    } catch (error: any) {
      logger.error('Error during shutdown', { error: error.message });
      process.exit(1);
    }
  });
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Start server
server.listen(port, () => {
  logger.info(`🔥 Visceral Intelligence Orchestrator running on port ${port}`, {
    port,
    environment: process.env.NODE_ENV,
    websocket_enabled: true,
    endpoints: {
      alerts: 'GET /alerts',
      premiumTriggers: 'GET /premium-triggers',
      enterpriseReport: 'GET /enterprise-report',
      marketSummary: 'GET /market-summary',
      share: 'POST /share',
      scanMarket: 'POST /scan-market',
      health: 'GET /health'
    }
  });
});