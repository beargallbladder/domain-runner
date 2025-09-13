import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import { createServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import * as cron from 'node-cron';
import { register } from 'prom-client';
import winston from 'winston';
import dotenv from 'dotenv';

import { MetricsCollector } from './services/metrics-collector';
import { HealthChecker } from './services/health-checker';
import { AlertManager } from './services/alert-manager';
import { ServiceRegistry } from './services/service-registry';
import { DashboardAggregator } from './services/dashboard-aggregator';
import { createDashboardRoutes } from './routes/dashboard';
import { createMetricsRoutes } from './routes/metrics';
import { createAlertsRoutes } from './routes/alerts';
import { errorHandler } from './middleware/error-handler';
import { requestLogger } from './middleware/request-logger';
import { rateLimiter } from './middleware/rate-limiter';

dotenv.config();

// Initialize logger
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'monitoring-dashboard' },
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    })
  ]
});

// Initialize Express app
const app = express();
const server = createServer(app);
const wss = new WebSocketServer({ server });

// Apply middleware
app.use(helmet());
app.use(compression());
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || '*',
  credentials: true
}));
app.use(express.json());
app.use(requestLogger(logger));
app.use(rateLimiter);

// Initialize services
const serviceRegistry = new ServiceRegistry(logger);
const healthChecker = new HealthChecker(serviceRegistry, logger);
const metricsCollector = new MetricsCollector(serviceRegistry, logger);
const alertManager = new AlertManager(logger);
const dashboardAggregator = new DashboardAggregator(
  serviceRegistry,
  healthChecker,
  metricsCollector,
  alertManager,
  logger
);

// WebSocket connection handling
const wsClients = new Set<WebSocket>();

wss.on('connection', (ws: WebSocket) => {
  logger.info('New WebSocket connection established');
  wsClients.add(ws);

  ws.on('close', () => {
    wsClients.delete(ws);
    logger.info('WebSocket connection closed');
  });

  ws.on('error', (error) => {
    logger.error('WebSocket error:', error);
    wsClients.delete(ws);
  });

  // Send initial dashboard data
  dashboardAggregator.getFullDashboard()
    .then(data => {
      ws.send(JSON.stringify({
        type: 'dashboard:full',
        data,
        timestamp: new Date().toISOString()
      }));
    })
    .catch(error => {
      logger.error('Error sending initial dashboard data:', error);
    });
});

// Broadcast updates to all WebSocket clients
function broadcastUpdate(type: string, data: any) {
  const message = JSON.stringify({
    type,
    data,
    timestamp: new Date().toISOString()
  });

  wsClients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message);
    }
  });
}

// Set up routes
app.use('/dashboard', createDashboardRoutes(dashboardAggregator));
app.use('/metrics', createMetricsRoutes(metricsCollector, register));
app.use('/alerts', createAlertsRoutes(alertManager));

// Health check endpoint
app.get('/health', (_req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    connections: {
      websocket: wsClients.size,
      services: serviceRegistry.getRegisteredServices().length
    }
  });
});

// Root endpoint
app.get('/', (_req, res) => {
  res.json({
    service: 'monitoring-dashboard',
    version: '1.0.0',
    endpoints: [
      '/health',
      '/dashboard',
      '/dashboard/summary',
      '/dashboard/services',
      '/dashboard/processing',
      '/metrics',
      '/metrics/prometheus',
      '/alerts',
      '/alerts/active',
      '/alerts/history'
    ],
    websocket: 'ws://[host]:[port]'
  });
});

// Error handling
app.use(errorHandler(logger));

// Schedule periodic tasks
cron.schedule('*/30 * * * * *', async () => {
  try {
    // Collect health data every 30 seconds
    const healthData = await healthChecker.checkAllServices();
    broadcastUpdate('health:update', healthData);

    // Check for alerts
    const alerts = await alertManager.checkAlerts(healthData);
    if (alerts.length > 0) {
      broadcastUpdate('alerts:new', alerts);
    }
  } catch (error) {
    logger.error('Error in health check cron:', error);
  }
});

cron.schedule('*/1 * * * *', async () => {
  try {
    // Collect metrics every minute
    const metrics = await metricsCollector.collectAllMetrics();
    broadcastUpdate('metrics:update', metrics);
  } catch (error) {
    logger.error('Error in metrics collection cron:', error);
  }
});

cron.schedule('*/5 * * * *', async () => {
  try {
    // Update full dashboard every 5 minutes
    const dashboard = await dashboardAggregator.getFullDashboard();
    broadcastUpdate('dashboard:full', dashboard);
  } catch (error) {
    logger.error('Error in dashboard update cron:', error);
  }
});

// Start server
const PORT = process.env.PORT || 3020;

server.listen(PORT, () => {
  logger.info(`Monitoring Dashboard running on port ${PORT}`);
  logger.info(`WebSocket server available on ws://localhost:${PORT}`);
  
  // Initialize service registry with known services
  serviceRegistry.initialize();
});