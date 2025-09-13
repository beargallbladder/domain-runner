import { 
  IMonitoringService, 
  HealthStatus, 
  HealthCheck, 
  Alert, 
  AlertCondition, 
  MetricsSummary 
} from './interfaces';
import { Logger } from '../../utils/logger';

interface MetricData {
  values: number[];
  timestamp: Date;
  tags?: Record<string, string>;
}

interface AlertConfig {
  metric: string;
  threshold: number;
  condition: AlertCondition;
}

export class MonitoringService implements IMonitoringService {
  private healthChecks: Map<string, () => Promise<boolean>> = new Map();
  private metrics: Map<string, MetricData[]> = new Map();
  private counters: Map<string, number> = new Map();
  private alerts: Map<string, AlertConfig> = new Map();
  private startTime: Date;
  private logger: Logger;

  constructor(logger: Logger) {
    this.logger = logger;
    this.startTime = new Date();
    
    // Clean up old metrics every hour
    setInterval(() => this.cleanupOldMetrics(), 3600000);
  }

  async getHealthStatus(): Promise<HealthStatus> {
    const checks: HealthCheck[] = [];
    let overallStatus: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';

    for (const [name, checkFn] of this.healthChecks) {
      const startTime = Date.now();
      try {
        const result = await checkFn();
        checks.push({
          name,
          status: result ? 'pass' : 'fail',
          responseTime: Date.now() - startTime
        });
        
        if (!result) {
          overallStatus = overallStatus === 'healthy' ? 'degraded' : 'unhealthy';
        }
      } catch (error: any) {
        checks.push({
          name,
          status: 'fail',
          message: error.message,
          responseTime: Date.now() - startTime
        });
        overallStatus = 'unhealthy';
      }
    }

    return {
      status: overallStatus,
      timestamp: new Date(),
      checks,
      uptime: Date.now() - this.startTime.getTime()
    };
  }

  registerHealthCheck(name: string, check: () => Promise<boolean>): void {
    this.healthChecks.set(name, check);
    this.logger.info(`Registered health check: ${name}`);
  }

  recordMetric(name: string, value: number, tags?: Record<string, string>): void {
    if (!this.metrics.has(name)) {
      this.metrics.set(name, []);
    }

    const metricData = this.metrics.get(name)!;
    metricData.push({
      values: [value],
      timestamp: new Date(),
      tags
    });
  }

  incrementCounter(name: string, tags?: Record<string, string>): void {
    const key = tags ? `${name}:${JSON.stringify(tags)}` : name;
    const current = this.counters.get(key) || 0;
    this.counters.set(key, current + 1);
  }

  recordDuration(name: string, duration: number, tags?: Record<string, string>): void {
    this.recordMetric(`${name}.duration`, duration, tags);
  }

  async checkAlerts(): Promise<Alert[]> {
    const alerts: Alert[] = [];
    const summary = await this.getMetricsSummary();

    for (const [id, config] of this.alerts) {
      const metricData = summary.metrics[config.metric];
      if (!metricData) continue;

      const currentValue = metricData.average;
      let triggered = false;

      switch (config.condition) {
        case AlertCondition.GREATER_THAN:
          triggered = currentValue > config.threshold;
          break;
        case AlertCondition.LESS_THAN:
          triggered = currentValue < config.threshold;
          break;
        case AlertCondition.EQUALS:
          triggered = currentValue === config.threshold;
          break;
      }

      if (triggered) {
        alerts.push({
          id,
          metric: config.metric,
          condition: config.condition,
          threshold: config.threshold,
          currentValue,
          severity: this.determineSeverity(config.metric, currentValue, config.threshold),
          timestamp: new Date(),
          message: `${config.metric} is ${currentValue} (threshold: ${config.condition} ${config.threshold})`
        });
      }
    }

    return alerts;
  }

  setAlertThreshold(metric: string, threshold: number, condition: AlertCondition): void {
    const id = `${metric}-${condition}-${threshold}`;
    this.alerts.set(id, { metric, threshold, condition });
    this.logger.info(`Set alert: ${metric} ${condition} ${threshold}`);
  }

  async getMetricsSummary(): Promise<MetricsSummary> {
    const summary: MetricsSummary = {
      timestamp: new Date(),
      period: '1h',
      metrics: {},
      counters: {}
    };

    // Process metrics
    for (const [name, dataPoints] of this.metrics) {
      const recentData = this.getRecentData(dataPoints);
      const values = recentData.flatMap(d => d.values);
      
      if (values.length === 0) continue;

      values.sort((a, b) => a - b);
      
      summary.metrics[name] = {
        count: values.length,
        sum: values.reduce((a, b) => a + b, 0),
        average: values.reduce((a, b) => a + b, 0) / values.length,
        min: values[0],
        max: values[values.length - 1],
        p50: this.percentile(values, 50),
        p95: this.percentile(values, 95),
        p99: this.percentile(values, 99)
      };
    }

    // Add counters
    for (const [name, value] of this.counters) {
      summary.counters[name] = value;
    }

    return summary;
  }

  async exportMetrics(): Promise<string> {
    const summary = await this.getMetricsSummary();
    return JSON.stringify(summary, null, 2);
  }

  private cleanupOldMetrics(): void {
    const oneHourAgo = new Date(Date.now() - 3600000);
    
    for (const [name, dataPoints] of this.metrics) {
      const recentData = dataPoints.filter(d => d.timestamp > oneHourAgo);
      this.metrics.set(name, recentData);
    }
  }

  private getRecentData(dataPoints: MetricData[], minutes: number = 60): MetricData[] {
    const cutoff = new Date(Date.now() - minutes * 60000);
    return dataPoints.filter(d => d.timestamp > cutoff);
  }

  private percentile(sortedValues: number[], p: number): number {
    const index = (p / 100) * (sortedValues.length - 1);
    const lower = Math.floor(index);
    const upper = Math.ceil(index);
    const weight = index % 1;
    
    if (lower === upper) {
      return sortedValues[lower];
    }
    
    return sortedValues[lower] * (1 - weight) + sortedValues[upper] * weight;
  }

  private determineSeverity(metric: string, value: number, threshold: number): 'info' | 'warning' | 'critical' {
    const ratio = value / threshold;
    
    if (metric.includes('error') || metric.includes('failed')) {
      if (ratio > 2) return 'critical';
      if (ratio > 1.5) return 'warning';
    } else if (metric.includes('response_time') || metric.includes('duration')) {
      if (ratio > 3) return 'critical';
      if (ratio > 2) return 'warning';
    }
    
    return 'info';
  }
}