import { Logger } from 'winston';
import { ServiceHealth } from './health-checker';

export interface Alert {
  id: string;
  severity: 'critical' | 'warning' | 'info';
  service: string;
  title: string;
  message: string;
  timestamp: Date;
  resolved: boolean;
  resolvedAt?: Date;
  metadata?: Record<string, any>;
}

export interface AlertRule {
  id: string;
  name: string;
  condition: (data: any) => boolean;
  severity: Alert['severity'];
  service?: string;
  message: (data: any) => string;
}

export class AlertManager {
  private alerts: Map<string, Alert> = new Map();
  private alertHistory: Alert[] = [];
  private rules: AlertRule[] = [];

  constructor(private logger: Logger) {
    this.initializeRules();
  }

  private initializeRules() {
    // Service health rules
    this.rules.push({
      id: 'service-down',
      name: 'Service Down',
      condition: (health: ServiceHealth) => {
        return Object.values(health).some(s => s.status === 'unhealthy');
      },
      severity: 'critical',
      message: (health: ServiceHealth) => {
        const unhealthyServices = Object.values(health)
          .filter(s => s.status === 'unhealthy')
          .map(s => s.service);
        return `Services down: ${unhealthyServices.join(', ')}`;
      }
    });

    this.rules.push({
      id: 'service-degraded',
      name: 'Service Degraded',
      condition: (health: ServiceHealth) => {
        return Object.values(health).some(s => s.status === 'degraded');
      },
      severity: 'warning',
      message: (health: ServiceHealth) => {
        const degradedServices = Object.values(health)
          .filter(s => s.status === 'degraded')
          .map(s => s.service);
        return `Services degraded: ${degradedServices.join(', ')}`;
      }
    });

    this.rules.push({
      id: 'high-response-time',
      name: 'High Response Time',
      condition: (health: ServiceHealth) => {
        return Object.values(health).some(s => s.responseTime > 3000);
      },
      severity: 'warning',
      message: (health: ServiceHealth) => {
        const slowServices = Object.values(health)
          .filter(s => s.responseTime > 3000)
          .map(s => `${s.service} (${s.responseTime}ms)`);
        return `Slow response times: ${slowServices.join(', ')}`;
      }
    });

    // Database rules
    this.rules.push({
      id: 'high-pending-domains',
      name: 'High Pending Domains',
      condition: (metrics: any) => {
        return metrics.database?.pendingDomains > 5000;
      },
      severity: 'warning',
      message: (metrics: any) => {
        return `High number of pending domains: ${metrics.database.pendingDomains}`;
      }
    });

    this.rules.push({
      id: 'low-processing-rate',
      name: 'Low Processing Rate',
      condition: (metrics: any) => {
        return metrics.database?.processingRate < 10 && metrics.database?.pendingDomains > 100;
      },
      severity: 'warning',
      message: (metrics: any) => {
        return `Low processing rate: ${metrics.database.processingRate} domains/hour with ${metrics.database.pendingDomains} pending`;
      }
    });

    this.rules.push({
      id: 'high-failure-rate',
      name: 'High Failure Rate',
      condition: (metrics: any) => {
        const total = metrics.database?.totalDomains || 1;
        const failed = metrics.database?.failedDomains || 0;
        return (failed / total) > 0.1; // More than 10% failure rate
      },
      severity: 'critical',
      message: (metrics: any) => {
        const rate = ((metrics.database.failedDomains / metrics.database.totalDomains) * 100).toFixed(2);
        return `High failure rate: ${rate}% (${metrics.database.failedDomains}/${metrics.database.totalDomains})`;
      }
    });
  }

  async checkAlerts(data: any): Promise<Alert[]> {
    const newAlerts: Alert[] = [];

    for (const rule of this.rules) {
      try {
        if (rule.condition(data)) {
          const alertId = `${rule.id}-${Date.now()}`;
          
          // Check if similar alert already exists
          const existingAlert = Array.from(this.alerts.values()).find(
            a => a.title === rule.name && !a.resolved
          );

          if (!existingAlert) {
            const alert: Alert = {
              id: alertId,
              severity: rule.severity,
              service: rule.service || 'system',
              title: rule.name,
              message: rule.message(data),
              timestamp: new Date(),
              resolved: false,
              metadata: { ruleId: rule.id }
            };

            this.alerts.set(alertId, alert);
            this.alertHistory.push(alert);
            newAlerts.push(alert);

            this.logger.warn(`New alert: ${alert.title} - ${alert.message}`);
          }
        } else {
          // Check if we should resolve any existing alerts for this rule
          const activeAlerts = Array.from(this.alerts.values()).filter(
            a => a.metadata?.ruleId === rule.id && !a.resolved
          );

          activeAlerts.forEach(alert => {
            this.resolveAlert(alert.id);
          });
        }
      } catch (error) {
        this.logger.error(`Error checking alert rule ${rule.id}:`, error);
      }
    }

    return newAlerts;
  }

  resolveAlert(alertId: string) {
    const alert = this.alerts.get(alertId);
    if (alert && !alert.resolved) {
      alert.resolved = true;
      alert.resolvedAt = new Date();
      this.logger.info(`Alert resolved: ${alert.title}`);
    }
  }

  getActiveAlerts(): Alert[] {
    return Array.from(this.alerts.values()).filter(a => !a.resolved);
  }

  getAlertHistory(limit: number = 100): Alert[] {
    return this.alertHistory.slice(-limit);
  }

  getAlertsBySeverity(severity: Alert['severity']): Alert[] {
    return Array.from(this.alerts.values()).filter(
      a => a.severity === severity && !a.resolved
    );
  }

  getAlertsByService(service: string): Alert[] {
    return Array.from(this.alerts.values()).filter(
      a => a.service === service && !a.resolved
    );
  }

  acknowledgeAlert(alertId: string) {
    const alert = this.alerts.get(alertId);
    if (alert) {
      alert.metadata = { ...alert.metadata, acknowledged: true, acknowledgedAt: new Date() };
    }
  }

  clearResolvedAlerts() {
    const resolved = Array.from(this.alerts.entries())
      .filter(([_, alert]) => alert.resolved)
      .map(([id, _]) => id);

    resolved.forEach(id => this.alerts.delete(id));
  }
}