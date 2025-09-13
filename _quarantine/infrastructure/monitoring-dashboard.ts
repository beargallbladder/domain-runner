/**
 * Real-time Monitoring Dashboard
 * Provides comprehensive system observability
 */

import express from 'express';
import { Pool } from 'pg';
import { HealthCheckSystem } from './health-check-system';
import { ErrorRecoverySystem } from './error-recovery-system';
import { PRODUCTION_CONFIG } from './production-config';

export interface SystemMetrics {
  timestamp: Date;
  services: {
    [serviceName: string]: ServiceMetrics;
  };
  database: DatabaseMetrics;
  llmProviders: {
    [provider: string]: LLMProviderMetrics;
  };
  system: SystemResourceMetrics;
  alerts: Alert[];
}

export interface ServiceMetrics {
  status: 'healthy' | 'degraded' | 'unhealthy';
  uptime: number;
  requestCount: number;
  errorRate: number;
  avgLatency: number;
  p99Latency: number;
  activeConnections: number;
}

export interface DatabaseMetrics {
  connectionPool: {
    total: number;
    active: number;
    idle: number;
    waiting: number;
  };
  queryPerformance: {
    avgQueryTime: number;
    slowQueries: number;
    deadlocks: number;
  };
  storage: {
    sizeMB: number;
    growthRate: number;
  };
}

export interface LLMProviderMetrics {
  status: 'available' | 'degraded' | 'unavailable';
  requestCount: number;
  tokenUsage: number;
  avgLatency: number;
  errorRate: number;
  remainingQuota: number;
}

export interface SystemResourceMetrics {
  cpu: {
    usage: number;
    loadAverage: number[];
  };
  memory: {
    used: number;
    total: number;
    percentage: number;
  };
  disk: {
    used: number;
    total: number;
    percentage: number;
  };
}

export interface Alert {
  id: string;
  severity: 'info' | 'warning' | 'error' | 'critical';
  component: string;
  message: string;
  timestamp: Date;
  acknowledged: boolean;
}

export class MonitoringDashboard {
  private app: express.Application;
  private pool: Pool;
  private healthSystem: HealthCheckSystem;
  private errorSystem: ErrorRecoverySystem;
  private metricsCache: Map<string, any> = new Map();
  private alerts: Alert[] = [];
  private metricsHistory: SystemMetrics[] = [];

  constructor(
    pool: Pool,
    healthSystem: HealthCheckSystem,
    errorSystem: ErrorRecoverySystem
  ) {
    this.pool = pool;
    this.healthSystem = healthSystem;
    this.errorSystem = errorSystem;
    this.app = express();
    this.setupRoutes();
    this.startMetricsCollection();
  }

  /**
   * Setup Express routes
   */
  private setupRoutes(): void {
    this.app.use(express.json());

    // Main dashboard
    this.app.get('/dashboard', (req, res) => {
      res.json({
        metrics: this.getCurrentMetrics(),
        alerts: this.getActiveAlerts(),
        summary: this.getSystemSummary(),
      });
    });

    // Real-time metrics stream
    this.app.get('/metrics/stream', (req, res) => {
      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      });

      const interval = setInterval(() => {
        res.write(`data: ${JSON.stringify(this.getCurrentMetrics())}\n\n`);
      }, 5000);

      req.on('close', () => {
        clearInterval(interval);
      });
    });

    // Service-specific metrics
    this.app.get('/metrics/service/:serviceName', (req, res) => {
      const metrics = this.getServiceMetrics(req.params.serviceName);
      if (metrics) {
        res.json(metrics);
      } else {
        res.status(404).json({ error: 'Service not found' });
      }
    });

    // LLM provider metrics
    this.app.get('/metrics/llm/:provider', (req, res) => {
      const metrics = this.getLLMProviderMetrics(req.params.provider);
      if (metrics) {
        res.json(metrics);
      } else {
        res.status(404).json({ error: 'Provider not found' });
      }
    });

    // Alerts management
    this.app.get('/alerts', (req, res) => {
      res.json(this.alerts);
    });

    this.app.post('/alerts/:id/acknowledge', (req, res) => {
      const alert = this.alerts.find(a => a.id === req.params.id);
      if (alert) {
        alert.acknowledged = true;
        res.json({ success: true });
      } else {
        res.status(404).json({ error: 'Alert not found' });
      }
    });

    // Historical data
    this.app.get('/metrics/history', (req, res) => {
      const hours = parseInt(req.query.hours as string) || 24;
      const cutoff = new Date(Date.now() - hours * 60 * 60 * 1000);
      
      const history = this.metricsHistory.filter(m => m.timestamp > cutoff);
      res.json(history);
    });

    // Health endpoint
    this.app.get('/health', (req, res) => {
      res.json({ status: 'healthy', timestamp: new Date() });
    });
  }

  /**
   * Start collecting metrics
   */
  private startMetricsCollection(): void {
    // Collect metrics every minute
    setInterval(() => {
      this.collectSystemMetrics();
    }, 60000);

    // Clean up old metrics every hour
    setInterval(() => {
      this.cleanupOldMetrics();
    }, 3600000);
  }

  /**
   * Collect all system metrics
   */
  private async collectSystemMetrics(): Promise<void> {
    try {
      const metrics: SystemMetrics = {
        timestamp: new Date(),
        services: await this.collectServiceMetrics(),
        database: await this.collectDatabaseMetrics(),
        llmProviders: await this.collectLLMProviderMetrics(),
        system: await this.collectSystemResourceMetrics(),
        alerts: this.getActiveAlerts(),
      };

      this.metricsHistory.push(metrics);
      this.checkThresholds(metrics);
    } catch (error) {
      console.error('Failed to collect metrics:', error);
    }
  }

  /**
   * Collect service metrics
   */
  private async collectServiceMetrics(): Promise<{ [key: string]: ServiceMetrics }> {
    const serviceMetrics: { [key: string]: ServiceMetrics } = {};
    const healthStatus = this.healthSystem.getHealthStatus();

    for (const [serviceName, config] of Object.entries(PRODUCTION_CONFIG.services)) {
      const health = healthStatus.get(serviceName);
      const cached = this.metricsCache.get(`service-${serviceName}`) || {};

      serviceMetrics[serviceName] = {
        status: health?.status || 'unhealthy',
        uptime: cached.uptime || 0,
        requestCount: cached.requestCount || 0,
        errorRate: cached.errorRate || 0,
        avgLatency: health?.latencyMs || 0,
        p99Latency: cached.p99Latency || 0,
        activeConnections: cached.activeConnections || 0,
      };
    }

    return serviceMetrics;
  }

  /**
   * Collect database metrics
   */
  private async collectDatabaseMetrics(): Promise<DatabaseMetrics> {
    try {
      const poolStats = {
        total: this.pool.totalCount,
        active: this.pool.totalCount - this.pool.idleCount,
        idle: this.pool.idleCount,
        waiting: this.pool.waitingCount,
      };

      const perfResult = await this.pool.query(`
        SELECT 
          AVG(mean_exec_time) as avg_query_time,
          COUNT(CASE WHEN mean_exec_time > 1000 THEN 1 END) as slow_queries
        FROM pg_stat_statements
        WHERE query NOT LIKE '%pg_stat%'
      `);

      const sizeResult = await this.pool.query(`
        SELECT pg_database_size(current_database()) as size
      `);

      return {
        connectionPool: poolStats,
        queryPerformance: {
          avgQueryTime: perfResult.rows[0]?.avg_query_time || 0,
          slowQueries: perfResult.rows[0]?.slow_queries || 0,
          deadlocks: 0, // Would need pg_stat_database
        },
        storage: {
          sizeMB: Math.round(sizeResult.rows[0].size / 1024 / 1024),
          growthRate: 0, // Calculate from history
        },
      };
    } catch (error) {
      console.error('Failed to collect database metrics:', error);
      return this.getDefaultDatabaseMetrics();
    }
  }

  /**
   * Collect LLM provider metrics
   */
  private async collectLLMProviderMetrics(): Promise<{ [key: string]: LLMProviderMetrics }> {
    const providerMetrics: { [key: string]: LLMProviderMetrics } = {};

    for (const [provider, config] of Object.entries(PRODUCTION_CONFIG.llmProviders)) {
      const cached = this.metricsCache.get(`llm-${provider}`) || {};
      const health = this.healthSystem.getHealthStatus().get(`llm-${provider}`);

      providerMetrics[provider] = {
        status: health?.status === 'healthy' ? 'available' : 'unavailable',
        requestCount: cached.requestCount || 0,
        tokenUsage: cached.tokenUsage || 0,
        avgLatency: cached.avgLatency || 0,
        errorRate: cached.errorRate || 0,
        remainingQuota: cached.remainingQuota || 100000,
      };
    }

    return providerMetrics;
  }

  /**
   * Collect system resource metrics
   */
  private async collectSystemResourceMetrics(): Promise<SystemResourceMetrics> {
    // In production, these would come from actual system monitoring
    return {
      cpu: {
        usage: Math.random() * 100,
        loadAverage: [1.2, 1.5, 1.3],
      },
      memory: {
        used: 1024,
        total: 2048,
        percentage: 50,
      },
      disk: {
        used: 10240,
        total: 51200,
        percentage: 20,
      },
    };
  }

  /**
   * Check thresholds and create alerts
   */
  private checkThresholds(metrics: SystemMetrics): void {
    const thresholds = PRODUCTION_CONFIG.monitoring.thresholds;

    // Check error rate
    Object.entries(metrics.services).forEach(([serviceName, serviceMetrics]) => {
      if (serviceMetrics.errorRate > thresholds.errorRatePercent) {
        this.createAlert(
          'error',
          serviceName,
          `Error rate ${serviceMetrics.errorRate}% exceeds threshold ${thresholds.errorRatePercent}%`
        );
      }

      if (serviceMetrics.p99Latency > thresholds.latencyP99Ms) {
        this.createAlert(
          'warning',
          serviceName,
          `P99 latency ${serviceMetrics.p99Latency}ms exceeds threshold ${thresholds.latencyP99Ms}ms`
        );
      }
    });

    // Check system resources
    if (metrics.system.cpu.usage > thresholds.cpuUsagePercent) {
      this.createAlert(
        'warning',
        'system',
        `CPU usage ${metrics.system.cpu.usage}% exceeds threshold ${thresholds.cpuUsagePercent}%`
      );
    }

    if (metrics.system.memory.percentage > thresholds.memoryUsagePercent) {
      this.createAlert(
        'warning',
        'system',
        `Memory usage ${metrics.system.memory.percentage}% exceeds threshold ${thresholds.memoryUsagePercent}%`
      );
    }
  }

  /**
   * Create alert
   */
  private createAlert(
    severity: Alert['severity'],
    component: string,
    message: string
  ): void {
    const alert: Alert = {
      id: `alert-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      severity,
      component,
      message,
      timestamp: new Date(),
      acknowledged: false,
    };

    this.alerts.push(alert);

    // Keep only recent alerts
    if (this.alerts.length > 100) {
      this.alerts = this.alerts.slice(-100);
    }

    console.log(`Alert created: [${severity}] ${component} - ${message}`);
  }

  /**
   * Get current metrics
   */
  private getCurrentMetrics(): SystemMetrics | null {
    if (this.metricsHistory.length === 0) return null;
    return this.metricsHistory[this.metricsHistory.length - 1];
  }

  /**
   * Get active alerts
   */
  private getActiveAlerts(): Alert[] {
    return this.alerts.filter(a => !a.acknowledged);
  }

  /**
   * Get system summary
   */
  private getSystemSummary(): any {
    const current = this.getCurrentMetrics();
    if (!current) return null;

    const healthyServices = Object.values(current.services)
      .filter(s => s.status === 'healthy').length;
    const totalServices = Object.keys(current.services).length;

    const availableProviders = Object.values(current.llmProviders)
      .filter(p => p.status === 'available').length;
    const totalProviders = Object.keys(current.llmProviders).length;

    return {
      overallHealth: healthyServices === totalServices ? 'healthy' : 'degraded',
      services: {
        healthy: healthyServices,
        total: totalServices,
      },
      llmProviders: {
        available: availableProviders,
        total: totalProviders,
      },
      activeAlerts: this.getActiveAlerts().length,
      systemLoad: current.system.cpu.usage,
    };
  }

  /**
   * Get service-specific metrics
   */
  private getServiceMetrics(serviceName: string): any {
    const current = this.getCurrentMetrics();
    if (!current) return null;

    const serviceMetrics = current.services[serviceName];
    if (!serviceMetrics) return null;

    // Get historical data
    const history = this.metricsHistory
      .map(m => ({
        timestamp: m.timestamp,
        metrics: m.services[serviceName],
      }))
      .filter(h => h.metrics);

    return {
      current: serviceMetrics,
      history,
      resilience: this.errorSystem.getResilienceMetrics(),
    };
  }

  /**
   * Get LLM provider metrics
   */
  private getLLMProviderMetrics(provider: string): any {
    const current = this.getCurrentMetrics();
    if (!current) return null;

    const providerMetrics = current.llmProviders[provider];
    if (!providerMetrics) return null;

    // Get historical data
    const history = this.metricsHistory
      .map(m => ({
        timestamp: m.timestamp,
        metrics: m.llmProviders[provider],
      }))
      .filter(h => h.metrics);

    return {
      current: providerMetrics,
      history,
      config: PRODUCTION_CONFIG.llmProviders[provider],
    };
  }

  /**
   * Clean up old metrics
   */
  private cleanupOldMetrics(): void {
    const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000); // 7 days
    this.metricsHistory = this.metricsHistory.filter(m => m.timestamp > cutoff);
  }

  /**
   * Get default database metrics
   */
  private getDefaultDatabaseMetrics(): DatabaseMetrics {
    return {
      connectionPool: {
        total: 0,
        active: 0,
        idle: 0,
        waiting: 0,
      },
      queryPerformance: {
        avgQueryTime: 0,
        slowQueries: 0,
        deadlocks: 0,
      },
      storage: {
        sizeMB: 0,
        growthRate: 0,
      },
    };
  }

  /**
   * Start monitoring dashboard server
   */
  public start(port: number = 3001): void {
    this.app.listen(port, () => {
      console.log(`Monitoring dashboard running on port ${port}`);
    });
  }
}

// Export factory function
export function createMonitoringDashboard(
  pool: Pool,
  healthSystem: HealthCheckSystem,
  errorSystem: ErrorRecoverySystem
): MonitoringDashboard {
  return new MonitoringDashboard(pool, healthSystem, errorSystem);
}