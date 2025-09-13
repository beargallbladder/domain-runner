import axios from 'axios';
import { Logger } from 'winston';
import { ServiceRegistry, ServiceInfo } from './service-registry';

export interface HealthStatus {
  service: string;
  status: 'healthy' | 'unhealthy' | 'degraded' | 'unknown';
  responseTime: number;
  lastCheck: Date;
  error?: string;
  details?: any;
}

export interface ServiceHealth {
  [serviceName: string]: HealthStatus;
}

export class HealthChecker {
  private healthCache: Map<string, HealthStatus> = new Map();
  private readonly timeout = 5000; // 5 second timeout

  constructor(
    private serviceRegistry: ServiceRegistry,
    private logger: Logger
  ) {}

  async checkServiceHealth(service: ServiceInfo): Promise<HealthStatus> {
    const startTime = Date.now();
    const healthUrl = `${service.url}${service.healthPath}`;

    try {
      const response = await axios.get(healthUrl, {
        timeout: this.timeout,
        validateStatus: () => true // Accept any status code
      });

      const responseTime = Date.now() - startTime;
      const status = this.determineHealthStatus(response.status, responseTime);

      const healthStatus: HealthStatus = {
        service: service.name,
        status,
        responseTime,
        lastCheck: new Date(),
        details: response.data
      };

      this.healthCache.set(service.name, healthStatus);
      return healthStatus;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      const healthStatus: HealthStatus = {
        service: service.name,
        status: 'unhealthy',
        responseTime: Date.now() - startTime,
        lastCheck: new Date(),
        error: errorMessage
      };

      this.healthCache.set(service.name, healthStatus);
      this.logger.error(`Health check failed for ${service.name}:`, error);
      return healthStatus;
    }
  }

  async checkAllServices(): Promise<ServiceHealth> {
    const services = this.serviceRegistry.getRegisteredServices();
    const healthChecks = await Promise.allSettled(
      services.map(service => this.checkServiceHealth(service))
    );

    const results: ServiceHealth = {};

    healthChecks.forEach((result, index) => {
      const serviceName = services[index].name;
      if (result.status === 'fulfilled') {
        results[serviceName] = result.value;
      } else {
        results[serviceName] = {
          service: serviceName,
          status: 'unknown',
          responseTime: 0,
          lastCheck: new Date(),
          error: result.reason?.message || 'Health check failed'
        };
      }
    });

    return results;
  }

  async checkCriticalServices(): Promise<ServiceHealth> {
    const criticalServices = this.serviceRegistry.getCriticalServices();
    const healthChecks = await Promise.allSettled(
      criticalServices.map(service => this.checkServiceHealth(service))
    );

    const results: ServiceHealth = {};

    healthChecks.forEach((result, index) => {
      const serviceName = criticalServices[index].name;
      if (result.status === 'fulfilled') {
        results[serviceName] = result.value;
      } else {
        results[serviceName] = {
          service: serviceName,
          status: 'unknown',
          responseTime: 0,
          lastCheck: new Date(),
          error: result.reason?.message || 'Health check failed'
        };
      }
    });

    return results;
  }

  private determineHealthStatus(
    statusCode: number,
    responseTime: number
  ): HealthStatus['status'] {
    if (statusCode >= 200 && statusCode < 300) {
      // Healthy if response is fast
      if (responseTime < 1000) return 'healthy';
      // Degraded if response is slow
      if (responseTime < 3000) return 'degraded';
      // Unhealthy if very slow
      return 'unhealthy';
    }

    // Service errors
    if (statusCode >= 500) return 'unhealthy';
    
    // Client errors might indicate degraded service
    if (statusCode >= 400) return 'degraded';
    
    // Other status codes
    return 'unknown';
  }

  getLastHealthStatus(serviceName: string): HealthStatus | undefined {
    return this.healthCache.get(serviceName);
  }

  getAllHealthStatuses(): ServiceHealth {
    const results: ServiceHealth = {};
    this.healthCache.forEach((status, serviceName) => {
      results[serviceName] = status;
    });
    return results;
  }

  getHealthSummary(): {
    total: number;
    healthy: number;
    unhealthy: number;
    degraded: number;
    unknown: number;
  } {
    const statuses = Array.from(this.healthCache.values());
    
    return {
      total: statuses.length,
      healthy: statuses.filter(s => s.status === 'healthy').length,
      unhealthy: statuses.filter(s => s.status === 'unhealthy').length,
      degraded: statuses.filter(s => s.status === 'degraded').length,
      unknown: statuses.filter(s => s.status === 'unknown').length
    };
  }
}