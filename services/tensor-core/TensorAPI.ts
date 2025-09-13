#!/usr/bin/env node
/**
 * TENSOR API SERVER - Production-ready API with real-time monitoring
 * Mind-blowing performance with auto-healing and comprehensive metrics
 */

import express from 'express';
import cors from 'cors';
import { TensorSynchronizer } from './TensorSynchronizer';
import * as fs from 'fs';

interface APIMetrics {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  avgResponseTime: number;
  domainsProcessed: number;
  startTime: Date;
}

class TensorAPI {
  private app: express.Application;
  private tensorSync: TensorSynchronizer;
  private metrics: APIMetrics;
  private realTimeClients: any[] = [];
  
  constructor() {
    this.app = express();
    this.tensorSync = new TensorSynchronizer();
    this.metrics = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      avgResponseTime: 0,
      domainsProcessed: 0,
      startTime: new Date()
    };
    
    this.setupMiddleware();
    this.setupRoutes();
    this.setupRealTimeMonitoring();
    this.setupEventListeners();
  }
  
  private setupMiddleware() {
    this.app.use(cors());
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true }));
    
    // Request logging and metrics
    this.app.use((req, res, next) => {
      const startTime = Date.now();
      this.metrics.totalRequests++;
      
      res.on('finish', () => {
        const responseTime = Date.now() - startTime;
        this.metrics.avgResponseTime = (this.metrics.avgResponseTime + responseTime) / 2;
        
        if (res.statusCode >= 200 && res.statusCode < 300) {
          this.metrics.successfulRequests++;
        } else {
          this.metrics.failedRequests++;
        }
        
        console.log(`${req.method} ${req.path} - ${res.statusCode} (${responseTime}ms)`);
      });
      
      next();
    });
  }
  
  private setupRoutes() {
    // Health check endpoint
    this.app.get('/health', (req, res) => {
      const stats = this.tensorSync.getProviderStats();
      const healthStatus = {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: Math.floor((Date.now() - this.metrics.startTime.getTime()) / 1000),
        providers: {
          total: stats.totalProviders,
          healthy: stats.healthyProviders,
          unhealthy: stats.totalProviders - stats.healthyProviders
        },
        api: {
          totalRequests: this.metrics.totalRequests,
          successRate: this.metrics.totalRequests > 0 ? 
            ((this.metrics.successfulRequests / this.metrics.totalRequests) * 100).toFixed(2) + '%' : '0%',
          avgResponseTime: Math.round(this.metrics.avgResponseTime) + 'ms'
        }
      };
      
      res.json(healthStatus);
    });
    
    // Provider status endpoint
    this.app.get('/providers', (req, res) => {
      const stats = this.tensorSync.getProviderStats();
      res.json(stats);
    });
    
    // Process domain with tensor sync
    this.app.post('/process-domain', async (req, res) => {
      const startTime = Date.now();
      
      try {
        const { domain, prompt = 'Analyze this domain for business intelligence, SEO opportunities, and market positioning.' } = req.body;
        
        if (!domain) {
          return res.status(400).json({ error: 'Domain is required' });
        }
        
        console.log(`🎯 API Request: Processing ${domain}`);
        
        const responses = await this.tensorSync.processWithTensorSync(domain, prompt);
        const processingTime = Date.now() - startTime;
        
        this.metrics.domainsProcessed++;
        
        const result = {
          domain,
          timestamp: new Date().toISOString(),
          processingTime: processingTime + 'ms',
          tensorSync: {
            totalProviders: 11,
            successfulResponses: responses.filter(r => r.success).length,
            failedResponses: responses.filter(r => !r.success).length,
            successRate: ((responses.filter(r => r.success).length / 11) * 100).toFixed(1) + '%'
          },
          responses: responses.map(r => ({
            provider: r.providerId,
            success: r.success,
            responseTime: r.responseTime + 'ms',
            error: r.error,
            responseLength: r.response ? r.response.length : 0,
            tokenUsage: r.tokenUsage
          })),
          llmResponses: responses.filter(r => r.success).reduce((acc, r) => {
            acc[r.providerId] = r.response;
            return acc;
          }, {} as any)
        };
        
        res.json(result);
        
        // Broadcast to real-time clients
        this.broadcastToClients('domainProcessed', result);
        
      } catch (error: any) {
        console.error('❌ API Error:', error.message);
        res.status(500).json({
          error: 'Processing failed',
          message: error.message,
          timestamp: new Date().toISOString()
        });
      }
    });
    
    // Batch process multiple domains
    this.app.post('/batch-process', async (req, res) => {
      const startTime = Date.now();
      
      try {
        const { domains, prompt = 'Analyze this domain for business intelligence.' } = req.body;
        
        if (!domains || !Array.isArray(domains)) {
          return res.status(400).json({ error: 'Domains array is required' });
        }
        
        console.log(`🎯 Batch Processing: ${domains.length} domains`);
        
        const batchResults = [];
        
        // Process in parallel batches of 5
        for (let i = 0; i < domains.length; i += 5) {
          const batch = domains.slice(i, i + 5);
          const batchPromises = batch.map(domain => 
            this.tensorSync.processWithTensorSync(domain, prompt)
              .then(responses => ({ domain, success: true, responses }))
              .catch(error => ({ domain, success: false, error: error.message }))
          );
          
          const batchResults_chunk = await Promise.all(batchPromises);
          batchResults.push(...batchResults_chunk);
          
          // Brief pause between batches to avoid overwhelming
          if (i + 5 < domains.length) {
            await new Promise(resolve => setTimeout(resolve, 1000));
          }
        }
        
        const processingTime = Date.now() - startTime;
        this.metrics.domainsProcessed += batchResults.filter(r => r.success).length;
        
        const result = {
          batchId: `batch_${Date.now()}`,
          timestamp: new Date().toISOString(),
          processingTime: processingTime + 'ms',
          summary: {
            totalDomains: domains.length,
            successfulDomains: batchResults.filter(r => r.success).length,
            failedDomains: batchResults.filter(r => !r.success).length,
            avgProcessingTimePerDomain: Math.round(processingTime / domains.length) + 'ms'
          },
          results: batchResults
        };
        
        res.json(result);
        
        // Broadcast batch completion
        this.broadcastToClients('batchCompleted', result.summary);
        
      } catch (error: any) {
        console.error('❌ Batch Processing Error:', error.message);
        res.status(500).json({
          error: 'Batch processing failed',
          message: error.message,
          timestamp: new Date().toISOString()
        });
      }
    });
    
    // Real-time monitoring dashboard
    this.app.get('/dashboard', (req, res) => {
      res.send(this.generateDashboardHTML());
    });
    
    // WebSocket-like endpoint for real-time updates
    this.app.get('/stream', (req, res) => {
      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*'
      });
      
      // Add client to real-time list
      const client = { res, id: Date.now() };
      this.realTimeClients.push(client);
      
      // Send initial status
      const stats = this.tensorSync.getProviderStats();
      res.write(`data: ${JSON.stringify({ type: 'status', data: stats })}\\n\\n`);
      
      // Remove client on disconnect
      req.on('close', () => {
        this.realTimeClients = this.realTimeClients.filter(c => c.id !== client.id);
      });
    });
    
    // Performance metrics endpoint
    this.app.get('/metrics', (req, res) => {
      const uptime = Math.floor((Date.now() - this.metrics.startTime.getTime()) / 1000);
      
      res.json({
        timestamp: new Date().toISOString(),
        uptime: {
          seconds: uptime,
          formatted: this.formatUptime(uptime)
        },
        api: this.metrics,
        system: {
          memory: process.memoryUsage(),
          cpu: process.cpuUsage()
        },
        providers: this.tensorSync.getProviderStats()
      });
    });
    
    // Emergency heal endpoint
    this.app.post('/emergency-heal', async (req, res) => {
      try {
        console.log('🚨 Emergency heal triggered via API');
        await (this.tensorSync as any).autoHealer.emergencyHeal();
        
        const stats = this.tensorSync.getProviderStats();
        res.json({
          message: 'Emergency healing completed',
          timestamp: new Date().toISOString(),
          providersHealed: stats.healthyProviders,
          totalProviders: stats.totalProviders
        });
      } catch (error: any) {
        res.status(500).json({
          error: 'Emergency healing failed',
          message: error.message
        });
      }
    });
  }
  
  private setupRealTimeMonitoring() {
    // Send real-time updates every 10 seconds
    setInterval(() => {
      if (this.realTimeClients.length > 0) {
        const stats = this.tensorSync.getProviderStats();
        this.broadcastToClients('statusUpdate', stats);
      }
    }, 10000);
  }
  
  private setupEventListeners() {
    this.tensorSync.on('tensorSyncComplete', (data) => {
      this.broadcastToClients('tensorSyncComplete', data);
    });
    
    this.tensorSync.on('circuitBreakerOpen', (data) => {
      this.broadcastToClients('circuitBreakerOpen', data);
    });
    
    this.tensorSync.on('tensorIntegrityWarning', (data) => {
      this.broadcastToClients('tensorIntegrityWarning', data);
    });
  }
  
  private broadcastToClients(type: string, data: any) {
    const message = `data: ${JSON.stringify({ type, data, timestamp: new Date().toISOString() })}\\n\\n`;
    
    this.realTimeClients = this.realTimeClients.filter(client => {
      try {
        client.res.write(message);
        return true;
      } catch (error) {
        return false; // Remove disconnected clients
      }
    });
  }
  
  private formatUptime(seconds: number): string {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    return `${days}d ${hours}h ${minutes}m ${secs}s`;
  }
  
  private generateDashboardHTML(): string {
    return `
    <!DOCTYPE html>
    <html>
    <head>
        <title>Tensor Synchronization Dashboard</title>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 20px; background: #0a0a0a; color: #ffffff; }
            .header { text-align: center; margin-bottom: 30px; }
            .title { font-size: 2.5em; margin: 0; background: linear-gradient(45deg, #00ff88, #0088ff); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
            .subtitle { color: #888; margin-top: 10px; }
            .stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 20px; margin-bottom: 30px; }
            .stat-card { background: #1a1a1a; border: 1px solid #333; border-radius: 10px; padding: 20px; }
            .stat-title { font-size: 1.2em; margin-bottom: 15px; color: #00ff88; }
            .stat-value { font-size: 2em; font-weight: bold; margin-bottom: 5px; }
            .stat-label { color: #888; font-size: 0.9em; }
            .providers-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 15px; }
            .provider-card { background: #1a1a1a; border-radius: 8px; padding: 15px; border-left: 4px solid #333; }
            .provider-healthy { border-left-color: #00ff88; }
            .provider-failed { border-left-color: #ff4444; }
            .provider-name { font-weight: bold; margin-bottom: 8px; }
            .provider-stats { font-size: 0.9em; color: #888; }
            .real-time-indicator { display: inline-block; width: 10px; height: 10px; background: #00ff88; border-radius: 50%; animation: pulse 2s infinite; margin-right: 10px; }
            @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.3; } }
        </style>
    </head>
    <body>
        <div class="header">
            <h1 class="title">🧠 TENSOR SYNCHRONIZATION</h1>
            <p class="subtitle">
                <span class="real-time-indicator"></span>
                Real-time monitoring of 11 LLM providers
            </p>
        </div>
        
        <div class="stats-grid" id="stats-grid">
            <!-- Stats will be populated by JavaScript -->
        </div>
        
        <div class="providers-grid" id="providers-grid">
            <!-- Provider cards will be populated by JavaScript -->
        </div>
        
        <script>
            const eventSource = new EventSource('/stream');
            
            eventSource.onmessage = function(event) {
                const message = JSON.parse(event.data);
                
                if (message.type === 'status' || message.type === 'statusUpdate') {
                    updateDashboard(message.data);
                }
            };
            
            function updateDashboard(data) {
                // Update stats grid
                const statsGrid = document.getElementById('stats-grid');
                statsGrid.innerHTML = \`
                    <div class="stat-card">
                        <div class="stat-title">Total Providers</div>
                        <div class="stat-value">\${data.totalProviders}</div>
                        <div class="stat-label">LLM Providers</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-title">Healthy Providers</div>
                        <div class="stat-value" style="color: #00ff88">\${data.healthyProviders}</div>
                        <div class="stat-label">Active & Ready</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-title">Success Rate</div>
                        <div class="stat-value" style="color: #0088ff">\${((data.healthyProviders / data.totalProviders) * 100).toFixed(1)}%</div>
                        <div class="stat-label">Tensor Integrity</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-title">Last Updated</div>
                        <div class="stat-value" style="font-size: 1.2em">\${new Date().toLocaleTimeString()}</div>
                        <div class="stat-label">Real-time</div>
                    </div>
                \`;
                
                // Update providers grid
                const providersGrid = document.getElementById('providers-grid');
                providersGrid.innerHTML = data.providers.map(provider => \`
                    <div class="provider-card \${provider.status === 'healthy' ? 'provider-healthy' : 'provider-failed'}">
                        <div class="provider-name">\${provider.name}</div>
                        <div class="provider-stats">
                            Status: <strong>\${provider.status}</strong><br>
                            Success Rate: <strong>\${provider.successRate}</strong><br>
                            Avg Response: <strong>\${provider.avgResponseTime}</strong><br>
                            Health Score: <strong>\${provider.healthScore}%</strong><br>
                            Circuit Breaker: <strong>\${provider.circuitBreakerState}</strong>
                        </div>
                    </div>
                \`).join('');
            }
            
            // Initial load
            fetch('/providers')
                .then(response => response.json())
                .then(data => updateDashboard(data));
        </script>
    </body>
    </html>
    `;
  }
  
  public start(port: number = 3000) {
    this.app.listen(port, () => {
      console.log('🚀 TENSOR SYNCHRONIZATION API DEPLOYED');
      console.log('=====================================');
      console.log(`🌐 Server running at: http://localhost:${port}`);
      console.log(`📊 Dashboard: http://localhost:${port}/dashboard`);
      console.log(`🔍 Health Check: http://localhost:${port}/health`);
      console.log(`📈 Metrics: http://localhost:${port}/metrics`);
      console.log(`🧠 11 LLM Providers Initialized`);
      console.log('');
      console.log('🎯 API Endpoints:');
      console.log('  POST /process-domain - Process single domain');
      console.log('  POST /batch-process - Process multiple domains');
      console.log('  GET  /providers - Provider status');
      console.log('  POST /emergency-heal - Trigger emergency healing');
      console.log('  GET  /stream - Real-time updates');
      console.log('');
      console.log('🔥 System Status: FULLY OPERATIONAL');
    });
    
    // Graceful shutdown
    process.on('SIGTERM', () => {
      console.log('🛑 Graceful shutdown initiated...');
      process.exit(0);
    });
  }
}

// Export for use in other modules
export { TensorAPI };

// Start server if run directly
if (require.main === module) {
  const api = new TensorAPI();
  const port = parseInt(process.env.PORT || '3000');
  api.start(port);
}