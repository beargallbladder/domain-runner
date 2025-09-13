import { Logger } from 'winston';
import { ServiceRegistry } from './service-registry';
import { HealthChecker, ServiceHealth } from './health-checker';
import { MetricsCollector, SystemMetrics } from './metrics-collector';
import { AlertManager, Alert } from './alert-manager';

export interface DashboardData {
  timestamp: Date;
  summary: {
    totalServices: number;
    healthyServices: number;
    unhealthyServices: number;
    degradedServices: number;
    activeAlerts: number;
    criticalAlerts: number;
    processingRate: number;
    pendingDomains: number;
  };
  health: ServiceHealth;
  metrics: SystemMetrics;
  alerts: Alert[];
  services: ServiceStatusDetail[];
}

export interface ServiceStatusDetail {
  name: string;
  type: string;
  criticality: string;
  status: string;
  health: {
    status: string;
    responseTime: number;
    lastCheck: Date;
    error?: string;
  };
  metrics: {
    requestCount?: number;
    errorCount?: number;
    avgResponseTime?: number;
    activeConnections?: number;
    memoryUsage?: number;
    cpuUsage?: number;
  };
  alerts: Alert[];
}

export class DashboardAggregator {
  constructor(
    private serviceRegistry: ServiceRegistry,
    private healthChecker: HealthChecker,
    private metricsCollector: MetricsCollector,
    private alertManager: AlertManager,
    private logger: Logger
  ) {}

  async getFullDashboard(): Promise<DashboardData> {
    try {
      // Collect all data in parallel
      const [health, metrics, alerts] = await Promise.all([
        this.healthChecker.checkAllServices(),
        this.metricsCollector.collectAllMetrics(),
        Promise.resolve(this.alertManager.getActiveAlerts())
      ]);

      // Generate service details
      const services = this.generateServiceDetails(health, metrics, alerts);

      // Calculate summary
      const summary = this.calculateSummary(health, metrics, alerts);

      return {
        timestamp: new Date(),
        summary,
        health,
        metrics,
        alerts,
        services
      };
    } catch (error) {
      this.logger.error('Error generating dashboard data:', error);
      throw error;
    }
  }

  async getSummary(): Promise<DashboardData['summary']> {
    const health = await this.healthChecker.checkAllServices();
    const metrics = await this.metricsCollector.collectAllMetrics();
    const alerts = this.alertManager.getActiveAlerts();

    return this.calculateSummary(health, metrics, alerts);
  }

  async getServiceDetails(): Promise<ServiceStatusDetail[]> {
    const health = await this.healthChecker.checkAllServices();
    const metrics = await this.metricsCollector.collectAllMetrics();
    const alerts = this.alertManager.getActiveAlerts();

    return this.generateServiceDetails(health, metrics, alerts);
  }

  async getProcessingStatus(): Promise<{
    database: SystemMetrics['database'];
    topPerformers: Array<{ service: string; processingRate: number }>;
    bottlenecks: Array<{ service: string; issue: string }>;
  }> {
    const metrics = await this.metricsCollector.collectAllMetrics();
    const health = await this.healthChecker.checkAllServices();

    // Identify top performers (placeholder logic)
    const topPerformers = Object.entries(health)
      .filter(([_, h]) => h.status === 'healthy' && h.responseTime < 500)
      .map(([service, _h]) => ({
        service,
        processingRate: Math.floor(Math.random() * 100) // Placeholder
      }))
      .sort((a, b) => b.processingRate - a.processingRate)
      .slice(0, 5);

    // Identify bottlenecks
    const bottlenecks = Object.entries(health)
      .filter(([_, h]) => h.status !== 'healthy' || h.responseTime > 2000)
      .map(([service, h]) => ({
        service,
        issue: h.status === 'unhealthy' ? 'Service down' : 
               h.responseTime > 2000 ? 'Slow response time' : 'Unknown issue'
      }));

    return {
      database: metrics.database,
      topPerformers,
      bottlenecks
    };
  }

  private calculateSummary(
    health: ServiceHealth,
    metrics: SystemMetrics,
    alerts: Alert[]
  ): DashboardData['summary'] {
    const healthStatuses = Object.values(health);
    
    return {
      totalServices: healthStatuses.length,
      healthyServices: healthStatuses.filter(h => h.status === 'healthy').length,
      unhealthyServices: healthStatuses.filter(h => h.status === 'unhealthy').length,
      degradedServices: healthStatuses.filter(h => h.status === 'degraded').length,
      activeAlerts: alerts.length,
      criticalAlerts: alerts.filter(a => a.severity === 'critical').length,
      processingRate: metrics.database.processingRate,
      pendingDomains: metrics.database.pendingDomains
    };
  }

  private generateServiceDetails(
    health: ServiceHealth,
    metrics: SystemMetrics,
    alerts: Alert[]
  ): ServiceStatusDetail[] {
    const services = this.serviceRegistry.getRegisteredServices();

    return services.map(service => {
      const serviceHealth = health[service.name] || {
        status: 'unknown',
        responseTime: 0,
        lastCheck: new Date()
      };

      const serviceMetrics = metrics.services[service.name]?.metrics || {};
      const serviceAlerts = alerts.filter(a => a.service === service.name);

      return {
        name: service.name,
        type: service.type,
        criticality: service.criticality,
        status: serviceHealth.status,
        health: {
          status: serviceHealth.status,
          responseTime: serviceHealth.responseTime,
          lastCheck: serviceHealth.lastCheck,
          error: serviceHealth.error
        },
        metrics: serviceMetrics,
        alerts: serviceAlerts
      };
    });
  }

  async getServiceComparison(): Promise<{
    responseTimeRanking: Array<{ service: string; avgResponseTime: number }>;
    uptimeRanking: Array<{ service: string; uptime: number }>;
    errorRateRanking: Array<{ service: string; errorRate: number }>;
  }> {
    const health = await this.healthChecker.checkAllServices();
    const metrics = await this.metricsCollector.collectAllMetrics();

    // Response time ranking
    const responseTimeRanking = Object.entries(health)
      .map(([service, h]) => ({
        service,
        avgResponseTime: h.responseTime
      }))
      .sort((a, b) => a.avgResponseTime - b.avgResponseTime);

    // Uptime ranking (placeholder - would need historical data)
    const uptimeRanking = Object.keys(health).map(service => ({
      service,
      uptime: health[service].status === 'healthy' ? 100 : 
              health[service].status === 'degraded' ? 90 : 0
    }))
    .sort((a, b) => b.uptime - a.uptime);

    // Error rate ranking
    const errorRateRanking = Object.entries(metrics.services)
      .map(([service, m]) => {
        const total = m.metrics.requestCount || 1;
        const errors = m.metrics.errorCount || 0;
        return {
          service,
          errorRate: (errors / total) * 100
        };
      })
      .sort((a, b) => a.errorRate - b.errorRate);

    return {
      responseTimeRanking,
      uptimeRanking,
      errorRateRanking
    };
  }
}