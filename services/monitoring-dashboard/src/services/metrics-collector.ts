import axios from 'axios';
import { Logger } from 'winston';
import { ServiceRegistry, ServiceInfo } from './service-registry';
import { Pool } from 'pg';
import { Counter, Gauge, Histogram, Registry } from 'prom-client';

export interface ServiceMetrics {
  service: string;
  timestamp: Date;
  metrics: {
    requestCount?: number;
    errorCount?: number;
    avgResponseTime?: number;
    activeConnections?: number;
    memoryUsage?: number;
    cpuUsage?: number;
    custom?: Record<string, any>;
  };
}

export interface SystemMetrics {
  timestamp: Date;
  database: {
    totalDomains: number;
    pendingDomains: number;
    completedDomains: number;
    failedDomains: number;
    processingRate: number;
  };
  services: {
    [serviceName: string]: ServiceMetrics;
  };
}

export class MetricsCollector {
  private pool: Pool;
  private metricsCache: Map<string, ServiceMetrics> = new Map();
  
  // Prometheus metrics
  private domainProcessedCounter: Counter;
  private pendingDomainsGauge: Gauge;
  private serviceResponseTime: Histogram;
  private serviceHealthGauge: Gauge;

  constructor(
    private serviceRegistry: ServiceRegistry,
    private logger: Logger
  ) {
    // Initialize database connection
    this.pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      max: 5,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    });

    // Initialize Prometheus metrics
    const register = new Registry();

    this.domainProcessedCounter = new Counter({
      name: 'domains_processed_total',
      help: 'Total number of domains processed',
      labelNames: ['status', 'model', 'prompt_type'],
      registers: [register]
    });

    this.pendingDomainsGauge = new Gauge({
      name: 'domains_pending',
      help: 'Number of domains pending processing',
      registers: [register]
    });

    this.serviceResponseTime = new Histogram({
      name: 'service_response_time_seconds',
      help: 'Service response time in seconds',
      labelNames: ['service', 'endpoint'],
      buckets: [0.1, 0.5, 1, 2, 5],
      registers: [register]
    });

    this.serviceHealthGauge = new Gauge({
      name: 'service_health_status',
      help: 'Service health status (1=healthy, 0=unhealthy)',
      labelNames: ['service'],
      registers: [register]
    });
  }

  async collectDatabaseMetrics(): Promise<SystemMetrics['database']> {
    try {
      const queries = {
        total: `SELECT COUNT(*) as count FROM domains`,
        pending: `SELECT COUNT(*) as count FROM domains WHERE status = 'pending'`,
        completed: `SELECT COUNT(*) as count FROM domains WHERE status = 'completed'`,
        failed: `SELECT COUNT(*) as count FROM domains WHERE status = 'failed'`,
        processingRate: `
          SELECT COUNT(*) as count 
          FROM domains 
          WHERE status = 'completed' 
          AND updated_at > NOW() - INTERVAL '1 hour'
        `
      };

      const [total, pending, completed, failed, rate] = await Promise.all([
        this.pool.query(queries.total),
        this.pool.query(queries.pending),
        this.pool.query(queries.completed),
        this.pool.query(queries.failed),
        this.pool.query(queries.processingRate)
      ]);

      const metrics = {
        totalDomains: parseInt(total.rows[0].count),
        pendingDomains: parseInt(pending.rows[0].count),
        completedDomains: parseInt(completed.rows[0].count),
        failedDomains: parseInt(failed.rows[0].count),
        processingRate: parseInt(rate.rows[0].count)
      };

      // Update Prometheus gauges
      this.pendingDomainsGauge.set(metrics.pendingDomains);

      return metrics;
    } catch (error) {
      this.logger.error('Error collecting database metrics:', error);
      return {
        totalDomains: 0,
        pendingDomains: 0,
        completedDomains: 0,
        failedDomains: 0,
        processingRate: 0
      };
    }
  }

  async collectServiceMetrics(service: ServiceInfo): Promise<ServiceMetrics> {
    try {
      // Try to get metrics from service endpoint if available
      const metricsUrl = `${service.url}/metrics`;
      
      try {
        const response = await axios.get(metricsUrl, {
          timeout: 3000,
          validateStatus: () => true
        });

        if (response.status === 200 && response.data) {
          const metrics: ServiceMetrics = {
            service: service.name,
            timestamp: new Date(),
            metrics: this.parseServiceMetrics(response.data)
          };

          this.metricsCache.set(service.name, metrics);
          return metrics;
        }
      } catch (error) {
        // Service might not have metrics endpoint
        this.logger.debug(`No metrics endpoint for ${service.name}`);
      }

      // Return basic metrics if specific endpoint not available
      const basicMetrics: ServiceMetrics = {
        service: service.name,
        timestamp: new Date(),
        metrics: {}
      };

      this.metricsCache.set(service.name, basicMetrics);
      return basicMetrics;

    } catch (error) {
      this.logger.error(`Error collecting metrics for ${service.name}:`, error);
      return {
        service: service.name,
        timestamp: new Date(),
        metrics: {}
      };
    }
  }

  async collectAllMetrics(): Promise<SystemMetrics> {
    const [databaseMetrics, serviceMetricsArray] = await Promise.all([
      this.collectDatabaseMetrics(),
      Promise.all(
        this.serviceRegistry.getRegisteredServices().map(
          service => this.collectServiceMetrics(service)
        )
      )
    ]);

    const serviceMetrics: SystemMetrics['services'] = {};
    serviceMetricsArray.forEach(metrics => {
      serviceMetrics[metrics.service] = metrics;
    });

    return {
      timestamp: new Date(),
      database: databaseMetrics,
      services: serviceMetrics
    };
  }

  private parseServiceMetrics(data: any): ServiceMetrics['metrics'] {
    // Parse common metrics format
    const metrics: ServiceMetrics['metrics'] = {};

    if (typeof data === 'object') {
      // Look for common metric keys
      if (data.requestCount !== undefined) metrics.requestCount = data.requestCount;
      if (data.errorCount !== undefined) metrics.errorCount = data.errorCount;
      if (data.avgResponseTime !== undefined) metrics.avgResponseTime = data.avgResponseTime;
      if (data.activeConnections !== undefined) metrics.activeConnections = data.activeConnections;
      if (data.memoryUsage !== undefined) metrics.memoryUsage = data.memoryUsage;
      if (data.cpuUsage !== undefined) metrics.cpuUsage = data.cpuUsage;
      
      // Store any additional metrics
      metrics.custom = { ...data };
    }

    return metrics;
  }

  getLastMetrics(serviceName: string): ServiceMetrics | undefined {
    return this.metricsCache.get(serviceName);
  }

  getAllMetrics(): ServiceMetrics[] {
    return Array.from(this.metricsCache.values());
  }

  updatePrometheusMetrics(health: boolean, service: string) {
    this.serviceHealthGauge.set({ service }, health ? 1 : 0);
  }

  recordResponseTime(service: string, endpoint: string, duration: number) {
    this.serviceResponseTime.observe({ service, endpoint }, duration);
  }

  incrementProcessedDomains(status: string, model: string, promptType: string) {
    this.domainProcessedCounter.inc({ status, model, prompt_type: promptType });
  }

  async cleanup() {
    await this.pool.end();
  }
}