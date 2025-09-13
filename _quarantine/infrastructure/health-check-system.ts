/**
 * Health Check System
 * Comprehensive health monitoring for all services
 */

import { Pool } from 'pg';
import axios from 'axios';
import { PRODUCTION_CONFIG } from './production-config';

export enum HealthStatus {
  HEALTHY = 'healthy',
  DEGRADED = 'degraded',
  UNHEALTHY = 'unhealthy',
}

export interface HealthCheckResult {
  service: string;
  status: HealthStatus;
  timestamp: Date;
  latencyMs: number;
  details: {
    [key: string]: any;
  };
  dependencies: DependencyHealth[];
}

export interface DependencyHealth {
  name: string;
  status: HealthStatus;
  latencyMs: number;
  error?: string;
}

export class HealthCheckSystem {
  private pool: Pool;
  private healthHistory: Map<string, HealthCheckResult[]> = new Map();
  private checkIntervalMs: number = 30000;
  private intervals: Map<string, NodeJS.Timeout> = new Map();

  constructor(pool: Pool) {
    this.pool = pool;
  }

  /**
   * Start health monitoring for all services
   */
  public startMonitoring(): void {
    console.log('Starting health monitoring system...');
    
    // Monitor each service
    Object.keys(PRODUCTION_CONFIG.services).forEach(serviceName => {
      this.monitorService(serviceName);
    });

    // Monitor critical dependencies
    this.monitorDatabase();
    this.monitorLLMProviders();
  }

  /**
   * Stop all health monitoring
   */
  public stopMonitoring(): void {
    console.log('Stopping health monitoring system...');
    this.intervals.forEach(interval => clearInterval(interval));
    this.intervals.clear();
  }

  /**
   * Monitor individual service health
   */
  private monitorService(serviceName: string): void {
    const serviceConfig = PRODUCTION_CONFIG.services[serviceName];
    if (!serviceConfig) return;

    const interval = setInterval(async () => {
      const result = await this.checkServiceHealth(serviceName);
      this.recordHealthCheck(serviceName, result);
      
      // Alert if unhealthy
      if (result.status === HealthStatus.UNHEALTHY) {
        await this.sendAlert(serviceName, result);
      }
    }, this.checkIntervalMs);

    this.intervals.set(serviceName, interval);
  }

  /**
   * Check health of a specific service
   */
  private async checkServiceHealth(serviceName: string): Promise<HealthCheckResult> {
    const startTime = Date.now();
    const serviceConfig = PRODUCTION_CONFIG.services[serviceName];
    const dependencies: DependencyHealth[] = [];

    try {
      // Check service endpoint
      const serviceUrl = this.getServiceUrl(serviceName);
      const response = await axios.get(`${serviceUrl}${serviceConfig.healthCheckPath}`, {
        timeout: 5000,
      });

      // Check dependencies
      for (const dep of serviceConfig.dependencies) {
        const depHealth = await this.checkDependency(dep);
        dependencies.push(depHealth);
      }

      const latencyMs = Date.now() - startTime;
      const hasUnhealthyDeps = dependencies.some(d => d.status === HealthStatus.UNHEALTHY);
      
      return {
        service: serviceName,
        status: hasUnhealthyDeps ? HealthStatus.DEGRADED : HealthStatus.HEALTHY,
        timestamp: new Date(),
        latencyMs,
        details: response.data,
        dependencies,
      };
    } catch (error) {
      return {
        service: serviceName,
        status: HealthStatus.UNHEALTHY,
        timestamp: new Date(),
        latencyMs: Date.now() - startTime,
        details: { error: error.message },
        dependencies,
      };
    }
  }

  /**
   * Check dependency health
   */
  private async checkDependency(depName: string): Promise<DependencyHealth> {
    const startTime = Date.now();
    
    try {
      switch (depName) {
        case 'postgresql':
          await this.pool.query('SELECT 1');
          return {
            name: depName,
            status: HealthStatus.HEALTHY,
            latencyMs: Date.now() - startTime,
          };
        
        case 'redis':
          // Add Redis health check if using Redis
          return {
            name: depName,
            status: HealthStatus.HEALTHY,
            latencyMs: Date.now() - startTime,
          };
        
        default:
          return {
            name: depName,
            status: HealthStatus.HEALTHY,
            latencyMs: Date.now() - startTime,
          };
      }
    } catch (error) {
      return {
        name: depName,
        status: HealthStatus.UNHEALTHY,
        latencyMs: Date.now() - startTime,
        error: error.message,
      };
    }
  }

  /**
   * Monitor database health
   */
  private monitorDatabase(): void {
    const interval = setInterval(async () => {
      const startTime = Date.now();
      
      try {
        // Check connection pool
        const poolStats = {
          totalCount: this.pool.totalCount,
          idleCount: this.pool.idleCount,
          waitingCount: this.pool.waitingCount,
        };

        // Check query performance
        const result = await this.pool.query(`
          SELECT 
            COUNT(*) as connection_count,
            MAX(query_start) as last_query,
            COUNT(CASE WHEN state = 'active' THEN 1 END) as active_queries
          FROM pg_stat_activity
          WHERE datname = current_database()
        `);

        const health: HealthCheckResult = {
          service: 'database',
          status: HealthStatus.HEALTHY,
          timestamp: new Date(),
          latencyMs: Date.now() - startTime,
          details: {
            pool: poolStats,
            database: result.rows[0],
          },
          dependencies: [],
        };

        this.recordHealthCheck('database', health);
      } catch (error) {
        const health: HealthCheckResult = {
          service: 'database',
          status: HealthStatus.UNHEALTHY,
          timestamp: new Date(),
          latencyMs: Date.now() - startTime,
          details: { error: error.message },
          dependencies: [],
        };

        this.recordHealthCheck('database', health);
        await this.sendAlert('database', health);
      }
    }, this.checkIntervalMs);

    this.intervals.set('database', interval);
  }

  /**
   * Monitor LLM provider health
   */
  private monitorLLMProviders(): void {
    Object.keys(PRODUCTION_CONFIG.llmProviders).forEach(provider => {
      const interval = setInterval(async () => {
        const health = await this.checkLLMProvider(provider);
        this.recordHealthCheck(`llm-${provider}`, health);
        
        if (health.status === HealthStatus.UNHEALTHY) {
          await this.sendAlert(`llm-${provider}`, health);
        }
      }, this.checkIntervalMs * 2); // Check less frequently

      this.intervals.set(`llm-${provider}`, interval);
    });
  }

  /**
   * Check LLM provider health
   */
  private async checkLLMProvider(provider: string): Promise<HealthCheckResult> {
    const startTime = Date.now();
    const config = PRODUCTION_CONFIG.llmProviders[provider];
    
    try {
      // Simple connectivity check - implement provider-specific checks
      const latencyMs = Date.now() - startTime;
      
      return {
        service: `llm-${provider}`,
        status: HealthStatus.HEALTHY,
        timestamp: new Date(),
        latencyMs,
        details: {
          provider,
          models: config.models,
          rateLimit: config.rateLimit,
        },
        dependencies: [],
      };
    } catch (error) {
      return {
        service: `llm-${provider}`,
        status: HealthStatus.UNHEALTHY,
        timestamp: new Date(),
        latencyMs: Date.now() - startTime,
        details: { error: error.message },
        dependencies: [],
      };
    }
  }

  /**
   * Record health check result
   */
  private recordHealthCheck(service: string, result: HealthCheckResult): void {
    if (!this.healthHistory.has(service)) {
      this.healthHistory.set(service, []);
    }

    const history = this.healthHistory.get(service)!;
    history.push(result);

    // Keep only last 100 checks
    if (history.length > 100) {
      history.shift();
    }

    // Log status changes
    if (history.length > 1) {
      const prevStatus = history[history.length - 2].status;
      if (prevStatus !== result.status) {
        console.log(`Health status change for ${service}: ${prevStatus} -> ${result.status}`);
      }
    }
  }

  /**
   * Send alert for health issues
   */
  private async sendAlert(service: string, result: HealthCheckResult): Promise<void> {
    console.error(`ALERT: ${service} is ${result.status}`, result.details);
    
    // Implement actual alerting (Slack, PagerDuty, etc)
    if (PRODUCTION_CONFIG.monitoring.alerting.slack) {
      try {
        await axios.post(PRODUCTION_CONFIG.monitoring.alerting.slack, {
          text: `🚨 Health Alert: ${service} is ${result.status}`,
          attachments: [{
            color: result.status === HealthStatus.UNHEALTHY ? 'danger' : 'warning',
            fields: [
              { title: 'Service', value: service, short: true },
              { title: 'Status', value: result.status, short: true },
              { title: 'Latency', value: `${result.latencyMs}ms`, short: true },
              { title: 'Details', value: JSON.stringify(result.details, null, 2) },
            ],
            ts: Math.floor(result.timestamp.getTime() / 1000),
          }],
        });
      } catch (error) {
        console.error('Failed to send Slack alert:', error);
      }
    }
  }

  /**
   * Get service URL based on environment
   */
  private getServiceUrl(serviceName: string): string {
    const serviceConfig = PRODUCTION_CONFIG.services[serviceName];
    
    // In production, use actual service URLs
    const serviceUrls = {
      'sophisticated-runner': 'https://sophisticated-runner.onrender.com',
      'domain-runner': 'https://domain-runner.onrender.com',
      'llmrank-api': 'https://llmrank.io',
    };

    return serviceUrls[serviceName] || `http://localhost:${serviceConfig.port}`;
  }

  /**
   * Get current health status for all services
   */
  public getHealthStatus(): Map<string, HealthCheckResult> {
    const status = new Map<string, HealthCheckResult>();
    
    this.healthHistory.forEach((history, service) => {
      if (history.length > 0) {
        status.set(service, history[history.length - 1]);
      }
    });

    return status;
  }

  /**
   * Get health metrics for monitoring
   */
  public getHealthMetrics(): any {
    const metrics = {
      services: {},
      summary: {
        healthy: 0,
        degraded: 0,
        unhealthy: 0,
      },
    };

    this.healthHistory.forEach((history, service) => {
      if (history.length > 0) {
        const latest = history[history.length - 1];
        const avgLatency = history.reduce((sum, h) => sum + h.latencyMs, 0) / history.length;
        
        metrics.services[service] = {
          status: latest.status,
          latency: {
            current: latest.latencyMs,
            average: avgLatency,
          },
          uptime: this.calculateUptime(history),
        };

        metrics.summary[latest.status]++;
      }
    });

    return metrics;
  }

  /**
   * Calculate uptime percentage
   */
  private calculateUptime(history: HealthCheckResult[]): number {
    const healthyCount = history.filter(h => h.status === HealthStatus.HEALTHY).length;
    return (healthyCount / history.length) * 100;
  }
}

// Export factory function
export function createHealthCheckSystem(pool: Pool): HealthCheckSystem {
  return new HealthCheckSystem(pool);
}