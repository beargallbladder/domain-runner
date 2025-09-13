import { Pool, PoolClient } from 'pg';
import { IDatabaseService, ITransactionManager } from './interfaces';
import { Domain, DomainStatus, DomainResponse } from '../../types';
import { DatabaseConfig } from '../../types';
import { Logger } from '../../utils/logger';

export class PostgresService implements IDatabaseService, ITransactionManager {
  private pool: Pool;
  private logger: Logger;
  private client?: PoolClient;

  constructor(config: DatabaseConfig, logger: Logger) {
    this.logger = logger;
    this.pool = new Pool({
      connectionString: config.connectionString,
      max: config.poolSize,
      idleTimeoutMillis: config.idleTimeout,
      connectionTimeoutMillis: config.connectionTimeout,
      ssl: process.env.NODE_ENV === 'production' ? {
        rejectUnauthorized: false
      } : false
    });

    this.pool.on('error', (err) => {
      this.logger.error('Unexpected database error', err);
    });
  }

  async getPendingDomains(limit: number): Promise<Domain[]> {
    try {
      const result = await this.pool.query(
        'SELECT id, domain, status, created_at, updated_at FROM domains WHERE status = $1 ORDER BY updated_at ASC LIMIT $2',
        [DomainStatus.PENDING, limit]
      );

      return result.rows.map(row => ({
        id: row.id,
        domain: row.domain,
        status: row.status,
        createdAt: row.created_at,
        updatedAt: row.updated_at
      }));
    } catch (error) {
      this.logger.error('Failed to get pending domains', error);
      throw error;
    }
  }

  async updateDomainStatus(domainId: number, status: DomainStatus): Promise<void> {
    try {
      await this.pool.query(
        'UPDATE domains SET status = $1, updated_at = NOW() WHERE id = $2',
        [status, domainId]
      );
    } catch (error) {
      this.logger.error(`Failed to update domain ${domainId} status`, error);
      throw error;
    }
  }

  async getDomainById(domainId: number): Promise<Domain | null> {
    try {
      const result = await this.pool.query(
        'SELECT id, domain, status, created_at, updated_at FROM domains WHERE id = $1',
        [domainId]
      );

      if (result.rows.length === 0) {
        return null;
      }

      const row = result.rows[0];
      return {
        id: row.id,
        domain: row.domain,
        status: row.status,
        createdAt: row.created_at,
        updatedAt: row.updated_at
      };
    } catch (error) {
      this.logger.error(`Failed to get domain ${domainId}`, error);
      throw error;
    }
  }

  async saveDomainResponse(response: DomainResponse): Promise<void> {
    try {
      await this.pool.query(
        `INSERT INTO domain_responses (domain_id, model, prompt_type, response, created_at) 
         VALUES ($1, $2, $3, $4, $5)`,
        [
          response.domainId,
          response.model,
          response.promptType,
          response.response,
          response.createdAt || new Date()
        ]
      );
    } catch (error) {
      this.logger.error('Failed to save domain response', error);
      throw error;
    }
  }

  async saveDomainResponses(responses: DomainResponse[]): Promise<void> {
    if (responses.length === 0) return;

    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      // Prepare bulk insert
      const values: any[] = [];
      const placeholders: string[] = [];
      let paramIndex = 1;

      responses.forEach((response, index) => {
        const placeholder = `($${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++})`;
        placeholders.push(placeholder);
        values.push(
          response.domainId,
          response.model,
          response.promptType,
          response.response,
          response.createdAt || new Date()
        );
      });

      const query = `
        INSERT INTO domain_responses (domain_id, model, prompt_type, response, created_at) 
        VALUES ${placeholders.join(', ')}
      `;

      await client.query(query, values);
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      this.logger.error('Failed to save domain responses', error);
      throw error;
    } finally {
      client.release();
    }
  }

  async getDomainResponses(domainId: number): Promise<DomainResponse[]> {
    try {
      const result = await this.pool.query(
        'SELECT * FROM domain_responses WHERE domain_id = $1 ORDER BY created_at DESC',
        [domainId]
      );

      return result.rows.map(row => ({
        domainId: row.domain_id,
        model: row.model,
        promptType: row.prompt_type,
        response: row.response,
        success: true,
        processingTime: 0,
        createdAt: row.created_at
      }));
    } catch (error) {
      this.logger.error(`Failed to get responses for domain ${domainId}`, error);
      throw error;
    }
  }

  async getDomainStats(): Promise<{
    total: number;
    pending: number;
    processing: number;
    completed: number;
    failed: number;
  }> {
    try {
      const result = await this.pool.query(`
        SELECT 
          COUNT(*) as total,
          COUNT(*) FILTER (WHERE status = 'pending') as pending,
          COUNT(*) FILTER (WHERE status = 'processing') as processing,
          COUNT(*) FILTER (WHERE status = 'completed') as completed,
          COUNT(*) FILTER (WHERE status = 'failed') as failed
        FROM domains
      `);

      const row = result.rows[0];
      return {
        total: parseInt(row.total),
        pending: parseInt(row.pending),
        processing: parseInt(row.processing),
        completed: parseInt(row.completed),
        failed: parseInt(row.failed)
      };
    } catch (error) {
      this.logger.error('Failed to get domain stats', error);
      throw error;
    }
  }

  async isHealthy(): Promise<boolean> {
    try {
      const result = await this.pool.query('SELECT 1');
      return result.rows.length > 0;
    } catch (error) {
      this.logger.error('Database health check failed', error);
      return false;
    }
  }

  async close(): Promise<void> {
    await this.pool.end();
  }

  // Transaction management
  async beginTransaction(): Promise<void> {
    this.client = await this.pool.connect();
    await this.client.query('BEGIN');
  }

  async commitTransaction(): Promise<void> {
    if (!this.client) throw new Error('No transaction in progress');
    await this.client.query('COMMIT');
    this.client.release();
    this.client = undefined;
  }

  async rollbackTransaction(): Promise<void> {
    if (!this.client) throw new Error('No transaction in progress');
    await this.client.query('ROLLBACK');
    this.client.release();
    this.client = undefined;
  }

  async runInTransaction<T>(operation: () => Promise<T>): Promise<T> {
    await this.beginTransaction();
    try {
      const result = await operation();
      await this.commitTransaction();
      return result;
    } catch (error) {
      await this.rollbackTransaction();
      throw error;
    }
  }
}