export interface IMonitoringService {
  // Health checks
  getHealthStatus(): Promise<HealthStatus>;
  registerHealthCheck(name: string, check: () => Promise<boolean>): void;
  
  // Metrics
  recordMetric(name: string, value: number, tags?: Record<string, string>): void;
  incrementCounter(name: string, tags?: Record<string, string>): void;
  recordDuration(name: string, duration: number, tags?: Record<string, string>): void;
  
  // Alerts
  checkAlerts(): Promise<Alert[]>;
  setAlertThreshold(metric: string, threshold: number, condition: AlertCondition): void;
  
  // Reporting
  getMetricsSummary(): Promise<MetricsSummary>;
  exportMetrics(): Promise<string>;
}

export interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: Date;
  checks: HealthCheck[];
  uptime: number;
}

export interface HealthCheck {
  name: string;
  status: 'pass' | 'fail';
  message?: string;
  responseTime: number;
}

export interface Alert {
  id: string;
  metric: string;
  condition: AlertCondition;
  threshold: number;
  currentValue: number;
  severity: 'info' | 'warning' | 'critical';
  timestamp: Date;
  message: string;
}

export enum AlertCondition {
  GREATER_THAN = 'gt',
  LESS_THAN = 'lt',
  EQUALS = 'eq'
}

export interface MetricsSummary {
  timestamp: Date;
  period: string;
  metrics: {
    [key: string]: {
      count: number;
      sum: number;
      average: number;
      min: number;
      max: number;
      p50: number;
      p95: number;
      p99: number;
    };
  };
  counters: {
    [key: string]: number;
  };
}