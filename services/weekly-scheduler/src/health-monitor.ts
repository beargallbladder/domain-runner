import { Pool } from 'pg';
import { Logger } from 'winston';
import axios from 'axios';
import { HealthStatus, HealthCheck } from './types';

export class HealthMonitor {
  private targetServices = [
    { name: 'sophisticated-runner', url: process.env.SOPHISTICATED_RUNNER_URL || 'https://sophisticated-runner.onrender.com' },
    { name: 'public-api', url: process.env.PUBLIC_API_URL || 'https://llmrank.io' }
  ];

  constructor(
    private pool: Pool,
    private logger: Logger
  ) {}

  async getHealth(): Promise<HealthStatus> {
    const checks = await Promise.all([
      this.checkDatabase(),
      this.checkTargetServices(),
      this.checkCronJobs(),
      this.checkMemory()
    ]);

    const [database, targetServices, cronJobs, memory] = checks;
    
    // Determine overall status
    const hasError = Object.values({ database, targetServices, cronJobs, memory })
      .some(check => check.status === 'error');
    const hasWarning = Object.values({ database, targetServices, cronJobs, memory })
      .some(check => check.status === 'warning');

    const status = hasError ? 'unhealthy' : hasWarning ? 'degraded' : 'healthy';

    // Get active jobs count
    let activeJobs = 0;
    let lastJobStatus;
    try {
      const activeResult = await this.pool.query(
        "SELECT COUNT(*) as count FROM scheduler_jobs WHERE status = 'running'"
      );
      activeJobs = parseInt(activeResult.rows[0].count);

      const lastJobResult = await this.pool.query(
        "SELECT status FROM scheduler_jobs ORDER BY start_time DESC LIMIT 1"
      );
      if (lastJobResult.rows.length > 0) {
        lastJobStatus = lastJobResult.rows[0].status;
      }
    } catch (error) {
      this.logger.error('Failed to get job counts:', error);
    }

    return {
      status,
      timestamp: new Date(),
      checks: {
        database,
        targetServices,
        cronJobs,
        memory
      },
      activeJobs,
      lastJobStatus,
      uptime: process.uptime()
    };
  }

  private async checkDatabase(): Promise<HealthCheck> {
    try {
      const start = Date.now();
      await this.pool.query('SELECT 1');
      const latency = Date.now() - start;

      // Check connection pool stats
      const poolStats = {
        total: this.pool.totalCount,
        idle: this.pool.idleCount,
        waiting: this.pool.waitingCount
      };

      if (latency > 1000) {
        return {
          status: 'warning',
          message: `High database latency: ${latency}ms`,
          details: { latency, poolStats }
        };
      }

      if (poolStats.waiting > 5) {
        return {
          status: 'warning',
          message: `High number of waiting connections: ${poolStats.waiting}`,
          details: { latency, poolStats }
        };
      }

      return {
        status: 'ok',
        message: 'Database connection healthy',
        details: { latency, poolStats }
      };
    } catch (error) {
      return {
        status: 'error',
        message: 'Database connection failed',
        details: { error: error instanceof Error ? error.message : 'Unknown error' }
      };
    }
  }

  private async checkTargetServices(): Promise<HealthCheck> {
    const results = await Promise.all(
      this.targetServices.map(async (service) => {
        try {
          const start = Date.now();
          const response = await axios.get(`${service.url}/health`, {
            timeout: 5000,
            validateStatus: (status) => status < 500
          });
          const latency = Date.now() - start;

          return {
            name: service.name,
            status: response.status === 200 ? 'ok' : 'warning',
            latency,
            httpStatus: response.status
          };
        } catch (error) {
          return {
            name: service.name,
            status: 'error',
            error: error instanceof Error ? error.message : 'Unknown error'
          };
        }
      })
    );

    const hasError = results.some(r => r.status === 'error');
    const hasWarning = results.some(r => r.status === 'warning');

    if (hasError) {
      return {
        status: 'error',
        message: 'One or more target services are down',
        details: { services: results }
      };
    }

    if (hasWarning) {
      return {
        status: 'warning',
        message: 'One or more target services are degraded',
        details: { services: results }
      };
    }

    return {
      status: 'ok',
      message: 'All target services are healthy',
      details: { services: results }
    };
  }

  private async checkCronJobs(): Promise<HealthCheck> {
    try {
      // Check if any jobs are stuck (running for more than 6 hours)
      const stuckJobsResult = await this.pool.query(`
        SELECT id, mode, start_time 
        FROM scheduler_jobs 
        WHERE status = 'running' 
        AND start_time < NOW() - INTERVAL '6 hours'
      `);

      if (stuckJobsResult.rows.length > 0) {
        return {
          status: 'warning',
          message: `${stuckJobsResult.rows.length} jobs appear to be stuck`,
          details: { stuckJobs: stuckJobsResult.rows }
        };
      }

      // Check if scheduled jobs are running as expected
      const missedJobsResult = await this.pool.query(`
        SELECT 
          mode,
          MAX(start_time) as last_run,
          EXTRACT(EPOCH FROM (NOW() - MAX(start_time))) / 3600 as hours_since_last
        FROM scheduler_jobs
        WHERE triggered_by LIKE '%-schedule'
        GROUP BY mode
      `);

      const missedJobs = missedJobsResult.rows.filter(row => {
        // Check if jobs are missing based on their schedule
        if (row.mode === 'hourly' && row.hours_since_last > 2) return true;
        if (row.mode === 'daily' && row.hours_since_last > 26) return true;
        if (row.mode === 'weekly' && row.hours_since_last > 170) return true;
        return false;
      });

      if (missedJobs.length > 0) {
        return {
          status: 'warning',
          message: 'Some scheduled jobs may have been missed',
          details: { missedJobs }
        };
      }

      return {
        status: 'ok',
        message: 'Cron jobs are running normally',
        details: { lastRuns: missedJobsResult.rows }
      };
    } catch (error) {
      return {
        status: 'error',
        message: 'Failed to check cron job status',
        details: { error: error instanceof Error ? error.message : 'Unknown error' }
      };
    }
  }

  private checkMemory(): HealthCheck {
    const usage = process.memoryUsage();
    const heapUsedMB = Math.round(usage.heapUsed / 1024 / 1024);
    const heapTotalMB = Math.round(usage.heapTotal / 1024 / 1024);
    const rssMB = Math.round(usage.rss / 1024 / 1024);
    const heapPercentage = (usage.heapUsed / usage.heapTotal) * 100;

    const details = {
      heapUsedMB,
      heapTotalMB,
      rssMB,
      heapPercentage: Math.round(heapPercentage)
    };

    // Warn if heap usage is above 85%
    if (heapPercentage > 85) {
      return {
        status: 'warning',
        message: `High memory usage: ${Math.round(heapPercentage)}%`,
        details
      };
    }

    // Error if RSS is above 1GB (adjust based on your container limits)
    if (rssMB > 1024) {
      return {
        status: 'error',
        message: `Very high memory usage: ${rssMB}MB RSS`,
        details
      };
    }

    return {
      status: 'ok',
      message: 'Memory usage is normal',
      details
    };
  }

  async runHealthChecks(): Promise<void> {
    const health = await this.getHealth();
    
    if (health.status === 'unhealthy') {
      this.logger.error('Health check failed', { health });
      // Could trigger alerts here
    } else if (health.status === 'degraded') {
      this.logger.warn('Health check degraded', { health });
    } else {
      this.logger.debug('Health check passed', { health });
    }
  }

  // Start periodic health checks
  startPeriodicChecks(intervalMinutes: number = 5): void {
    setInterval(async () => {
      await this.runHealthChecks();
    }, intervalMinutes * 60 * 1000);
    
    this.logger.info(`Started periodic health checks every ${intervalMinutes} minutes`);
  }
}