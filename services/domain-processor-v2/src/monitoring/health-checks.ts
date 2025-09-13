import { Pool } from 'pg';
import { Logger } from '../utils/logger';
import fetch from 'node-fetch';

export interface HealthCheckResult {
  service: string;
  status: 'healthy' | 'degraded' | 'unhealthy';
  message?: string;
  latency?: number;
  details?: any;
}

export interface SystemHealth {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  uptime: number;
  checks: HealthCheckResult[];
  metrics: {
    cpu: number;
    memory: {
      used: number;
      total: number;
      percentage: number;
    };
    connections: {
      database: number;
      redis: number;
    };
  };
}

export class HealthChecker {
  private startTime: number = Date.now();

  constructor(
    private logger: Logger,
    private databasePool: Pool,
    private redisClient: any
  ) {}

  async checkSystem(): Promise<SystemHealth> {
    const checks: HealthCheckResult[] = [];
    
    // Check database
    checks.push(await this.checkDatabase());
    
    // Check Redis
    checks.push(await this.checkRedis());
    
    // Check external services
    checks.push(await this.checkExternalAPIs());
    
    // Check disk space
    checks.push(await this.checkDiskSpace());
    
    // Check memory usage
    checks.push(await this.checkMemoryUsage());
    
    // Determine overall status
    const unhealthyCount = checks.filter(c => c.status === 'unhealthy').length;
    const degradedCount = checks.filter(c => c.status === 'degraded').length;
    
    let overallStatus: 'healthy' | 'degraded' | 'unhealthy';
    if (unhealthyCount > 0) {
      overallStatus = 'unhealthy';
    } else if (degradedCount > 0) {
      overallStatus = 'degraded';
    } else {
      overallStatus = 'healthy';
    }
    
    return {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      uptime: Date.now() - this.startTime,
      checks,
      metrics: await this.getSystemMetrics()
    };
  }

  private async checkDatabase(): Promise<HealthCheckResult> {
    const start = Date.now();
    try {
      const result = await this.databasePool.query('SELECT 1');
      const latency = Date.now() - start;
      
      // Check connection pool health
      const poolStats = {
        total: this.databasePool.totalCount,
        idle: this.databasePool.idleCount,
        waiting: this.databasePool.waitingCount
      };
      
      if (poolStats.waiting > 10) {
        return {
          service: 'database',
          status: 'degraded',
          message: 'High number of waiting connections',
          latency,
          details: poolStats
        };
      }
      
      return {
        service: 'database',
        status: 'healthy',
        latency,
        details: poolStats
      };
    } catch (error: any) {
      return {
        service: 'database',
        status: 'unhealthy',
        message: error.message,
        latency: Date.now() - start
      };
    }
  }

  private async checkRedis(): Promise<HealthCheckResult> {
    const start = Date.now();
    try {
      await this.redisClient.ping();
      const latency = Date.now() - start;
      
      // Check Redis memory usage
      const info = await this.redisClient.info('memory');
      const memoryUsage = this.parseRedisInfo(info);
      
      if (memoryUsage.used_memory_rss > memoryUsage.maxmemory * 0.9) {
        return {
          service: 'redis',
          status: 'degraded',
          message: 'High memory usage',
          latency,
          details: memoryUsage
        };
      }
      
      return {
        service: 'redis',
        status: 'healthy',
        latency,
        details: memoryUsage
      };
    } catch (error: any) {
      return {
        service: 'redis',
        status: 'unhealthy',
        message: error.message,
        latency: Date.now() - start
      };
    }
  }

  private async checkExternalAPIs(): Promise<HealthCheckResult> {
    const criticalAPIs = [
      { name: 'OpenAI', url: 'https://api.openai.com/v1/models', threshold: 5000 },
      { name: 'Anthropic', url: 'https://api.anthropic.com/v1/messages', threshold: 5000 }
    ];
    
    const results = await Promise.all(
      criticalAPIs.map(async (api) => {
        const start = Date.now();
        try {
          const response = await fetch(api.url, {
            method: 'GET',
            headers: {
              'User-Agent': 'DomainRunner/1.0'
            }
          });
          const latency = Date.now() - start;
          
          return {
            name: api.name,
            status: latency < api.threshold ? 'healthy' : 'degraded',
            latency,
            statusCode: response.status
          };
        } catch (error) {
          return {
            name: api.name,
            status: 'unhealthy',
            latency: Date.now() - start,
            error: error instanceof Error ? error.message : 'Unknown error'
          };
        }
      })
    );
    
    const unhealthyAPIs = results.filter(r => r.status === 'unhealthy');
    const degradedAPIs = results.filter(r => r.status === 'degraded');
    
    if (unhealthyAPIs.length > 0) {
      return {
        service: 'external_apis',
        status: 'degraded', // Not unhealthy since we have multiple providers
        message: `${unhealthyAPIs.length} APIs unavailable`,
        details: results
      };
    } else if (degradedAPIs.length > 0) {
      return {
        service: 'external_apis',
        status: 'degraded',
        message: `${degradedAPIs.length} APIs degraded`,
        details: results
      };
    }
    
    return {
      service: 'external_apis',
      status: 'healthy',
      details: results
    };
  }

  private async checkDiskSpace(): Promise<HealthCheckResult> {
    try {
      const { execSync } = require('child_process');
      const output = execSync('df -h /').toString();
      const lines = output.trim().split('\n');
      const stats = lines[1].split(/\s+/);
      const usagePercent = parseInt(stats[4].replace('%', ''));
      
      if (usagePercent > 90) {
        return {
          service: 'disk_space',
          status: 'unhealthy',
          message: `Disk usage critical: ${usagePercent}%`,
          details: { usagePercent }
        };
      } else if (usagePercent > 80) {
        return {
          service: 'disk_space',
          status: 'degraded',
          message: `Disk usage high: ${usagePercent}%`,
          details: { usagePercent }
        };
      }
      
      return {
        service: 'disk_space',
        status: 'healthy',
        details: { usagePercent }
      };
    } catch (error: any) {
      return {
        service: 'disk_space',
        status: 'unhealthy',
        message: error.message
      };
    }
  }

  private async checkMemoryUsage(): Promise<HealthCheckResult> {
    const used = process.memoryUsage();
    const limit = 512 * 1024 * 1024; // 512MB limit
    const percentage = (used.rss / limit) * 100;
    
    if (percentage > 90) {
      return {
        service: 'memory',
        status: 'unhealthy',
        message: `Memory usage critical: ${percentage.toFixed(1)}%`,
        details: {
          rss: used.rss,
          heapUsed: used.heapUsed,
          heapTotal: used.heapTotal,
          percentage
        }
      };
    } else if (percentage > 80) {
      return {
        service: 'memory',
        status: 'degraded',
        message: `Memory usage high: ${percentage.toFixed(1)}%`,
        details: {
          rss: used.rss,
          heapUsed: used.heapUsed,
          heapTotal: used.heapTotal,
          percentage
        }
      };
    }
    
    return {
      service: 'memory',
      status: 'healthy',
      details: {
        rss: used.rss,
        heapUsed: used.heapUsed,
        heapTotal: used.heapTotal,
        percentage
      }
    };
  }

  private async getSystemMetrics() {
    const memUsage = process.memoryUsage();
    const cpuUsage = process.cpuUsage();
    
    return {
      cpu: cpuUsage.user + cpuUsage.system,
      memory: {
        used: memUsage.rss,
        total: require('os').totalmem(),
        percentage: (memUsage.rss / require('os').totalmem()) * 100
      },
      connections: {
        database: this.databasePool.totalCount,
        redis: this.redisClient.status === 'ready' ? 1 : 0
      }
    };
  }

  private parseRedisInfo(info: string): any {
    const lines = info.split('\r\n');
    const result: any = {};
    
    lines.forEach(line => {
      if (line && !line.startsWith('#')) {
        const [key, value] = line.split(':');
        if (key && value) {
          result[key] = isNaN(Number(value)) ? value : Number(value);
        }
      }
    });
    
    return result;
  }

  // Readiness probe - checks if service is ready to accept traffic
  async isReady(): Promise<boolean> {
    try {
      // Check database connection
      await this.databasePool.query('SELECT 1');
      
      // Check Redis connection
      await this.redisClient.ping();
      
      return true;
    } catch (error) {
      this.logger.error('Readiness check failed', error);
      return false;
    }
  }

  // Liveness probe - checks if service is alive
  async isAlive(): Promise<boolean> {
    // Simple check - if we can respond, we're alive
    return true;
  }
}