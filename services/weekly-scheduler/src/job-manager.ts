import { Pool } from 'pg';
import { Logger } from 'winston';
import { ProcessingMode, JobStatus, SchedulerJobRecord } from './types';

export class JobManager {
  constructor(
    private pool: Pool,
    private logger: Logger
  ) {}

  async recordJobStart(jobId: string, mode: ProcessingMode, triggeredBy: string): Promise<void> {
    try {
      await this.pool.query(
        `INSERT INTO scheduler_jobs (id, mode, status, triggered_by, start_time, total)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [jobId, mode, 'running', triggeredBy, new Date(), 0]
      );
      this.logger.info('Job recorded', { jobId, mode, triggeredBy });
    } catch (error) {
      this.logger.error('Failed to record job start:', error);
      throw error;
    }
  }

  async updateJobProgress(jobId: string, progress: {
    total: number;
    processed: number;
    failed: number;
    percentage: number;
  }): Promise<void> {
    try {
      await this.pool.query(
        `UPDATE scheduler_jobs 
         SET processed = $2, failed = $3, total = $4, updated_at = CURRENT_TIMESTAMP
         WHERE id = $1`,
        [jobId, progress.processed, progress.failed, progress.total]
      );
    } catch (error) {
      this.logger.error('Failed to update job progress:', error);
    }
  }

  async recordJobEnd(
    jobId: string, 
    status: JobStatus, 
    progress: { processed: number; failed: number }, 
    errorMessage?: string
  ): Promise<void> {
    try {
      await this.pool.query(
        `UPDATE scheduler_jobs 
         SET status = $2, end_time = $3, processed = $4, failed = $5, error_message = $6, updated_at = CURRENT_TIMESTAMP
         WHERE id = $1`,
        [jobId, status, new Date(), progress.processed, progress.failed, errorMessage]
      );
      this.logger.info('Job ended', { jobId, status, progress });
    } catch (error) {
      this.logger.error('Failed to record job end:', error);
      throw error;
    }
  }

  async cancelJob(jobId: string): Promise<void> {
    try {
      await this.pool.query(
        `UPDATE scheduler_jobs 
         SET status = 'cancelled', end_time = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
         WHERE id = $1 AND status = 'running'`,
        [jobId]
      );
      this.logger.info('Job cancelled', { jobId });
    } catch (error) {
      this.logger.error('Failed to cancel job:', error);
      throw error;
    }
  }

  async getJobHistory(limit: number = 50, offset: number = 0): Promise<SchedulerJobRecord[]> {
    try {
      const result = await this.pool.query(
        `SELECT * FROM scheduler_jobs 
         ORDER BY start_time DESC 
         LIMIT $1 OFFSET $2`,
        [limit, offset]
      );
      return result.rows;
    } catch (error) {
      this.logger.error('Failed to get job history:', error);
      throw error;
    }
  }

  async getSchedulerStatus(): Promise<{
    totalJobs: number;
    completedJobs: number;
    failedJobs: number;
    averageDuration: number;
    lastJob?: SchedulerJobRecord;
    successRate: number;
  }> {
    try {
      // Get overall statistics
      const statsResult = await this.pool.query(`
        SELECT 
          COUNT(*) as total_jobs,
          COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_jobs,
          COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed_jobs,
          AVG(EXTRACT(EPOCH FROM (end_time - start_time))) as avg_duration_seconds
        FROM scheduler_jobs
        WHERE start_time > NOW() - INTERVAL '30 days'
      `);

      const stats = statsResult.rows[0];
      
      // Get last job
      const lastJobResult = await this.pool.query(
        `SELECT * FROM scheduler_jobs 
         ORDER BY start_time DESC 
         LIMIT 1`
      );

      const totalJobs = parseInt(stats.total_jobs) || 0;
      const completedJobs = parseInt(stats.completed_jobs) || 0;
      const failedJobs = parseInt(stats.failed_jobs) || 0;

      return {
        totalJobs,
        completedJobs,
        failedJobs,
        averageDuration: parseFloat(stats.avg_duration_seconds) || 0,
        lastJob: lastJobResult.rows[0],
        successRate: totalJobs > 0 ? (completedJobs / totalJobs) * 100 : 0
      };
    } catch (error) {
      this.logger.error('Failed to get scheduler status:', error);
      throw error;
    }
  }

  async getActiveJobs(): Promise<SchedulerJobRecord[]> {
    try {
      const result = await this.pool.query(
        `SELECT * FROM scheduler_jobs 
         WHERE status = 'running' 
         ORDER BY start_time DESC`
      );
      return result.rows;
    } catch (error) {
      this.logger.error('Failed to get active jobs:', error);
      throw error;
    }
  }

  async cleanupOldJobs(daysToKeep: number = 30): Promise<number> {
    try {
      const result = await this.pool.query(
        `DELETE FROM scheduler_jobs 
         WHERE created_at < NOW() - INTERVAL '${daysToKeep} days'
         AND status IN ('completed', 'failed', 'cancelled')`
      );
      const deleted = result.rowCount || 0;
      this.logger.info(`Cleaned up ${deleted} old jobs`);
      return deleted;
    } catch (error) {
      this.logger.error('Failed to cleanup old jobs:', error);
      throw error;
    }
  }

  async getJobsByMode(mode: ProcessingMode, limit: number = 10): Promise<SchedulerJobRecord[]> {
    try {
      const result = await this.pool.query(
        `SELECT * FROM scheduler_jobs 
         WHERE mode = $1 
         ORDER BY start_time DESC 
         LIMIT $2`,
        [mode, limit]
      );
      return result.rows;
    } catch (error) {
      this.logger.error('Failed to get jobs by mode:', error);
      throw error;
    }
  }

  async getJobMetrics(days: number = 7): Promise<{
    date: string;
    total: number;
    completed: number;
    failed: number;
    averageProcessed: number;
  }[]> {
    try {
      const result = await this.pool.query(`
        SELECT 
          DATE(start_time) as date,
          COUNT(*) as total,
          COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed,
          COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed,
          AVG(processed) as average_processed
        FROM scheduler_jobs
        WHERE start_time > NOW() - INTERVAL '${days} days'
        GROUP BY DATE(start_time)
        ORDER BY date DESC
      `);
      
      return result.rows.map(row => ({
        date: row.date.toISOString().split('T')[0],
        total: parseInt(row.total),
        completed: parseInt(row.completed),
        failed: parseInt(row.failed),
        averageProcessed: parseFloat(row.average_processed) || 0
      }));
    } catch (error) {
      this.logger.error('Failed to get job metrics:', error);
      throw error;
    }
  }
}