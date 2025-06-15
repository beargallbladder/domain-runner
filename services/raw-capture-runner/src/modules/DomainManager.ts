/**
 * DOMAIN MANAGER MODULE
 * 
 * Purpose: Manages dynamic domain addition to the raw capture pipeline
 * Architecture: Modular, testable, respects primary/replica database sanctity
 * 
 * IMPORTANT: This module ONLY handles domain injection - it does NOT interfere 
 * with existing processing logic in processNextBatch()
 * 
 * Data Flow:
 * 1. External API call → DomainManager.addDomains()
 * 2. Validation → Primary DB write
 * 3. Existing processNextBatch() picks up domains naturally
 * 4. Replica DB used for read operations (status, stats)
 */

import { Pool, PoolClient } from 'pg';

export interface Domain {
  id?: number;
  domain: string;
  source: string;
  cohort: string;
  status: 'pending' | 'processing' | 'completed' | 'error';
  priority: number;
  created_at?: Date;
  updated_at?: Date;
}

export interface DomainAddRequest {
  domains: string[];
  cohort?: string;
  source?: string;
  priority?: number;
}

export interface DomainStats {
  total_domains: number;
  by_status: Record<string, number>;
  by_cohort: Record<string, number>;
  by_source: Record<string, number>;
}

/**
 * DomainManager Class
 * 
 * Handles all domain lifecycle management while preserving existing architecture
 */
export class DomainManager {
  private primaryPool: Pool;
  private replicaPool: Pool;

  constructor(primaryPool: Pool, replicaPool?: Pool) {
    this.primaryPool = primaryPool;
    this.replicaPool = replicaPool || primaryPool; // Fallback to primary if no replica
  }

  /**
   * Add domains to the processing pipeline
   * 
   * @param request - Domain addition request
   * @returns Promise<{ inserted: number; skipped: number; errors: string[] }>
   */
  async addDomains(request: DomainAddRequest): Promise<{
    inserted: number;
    skipped: number;
    errors: string[];
    operation_id: string;
  }> {
    const {
      domains,
      cohort = 'manual',
      source = 'api_injection',
      priority = 1
    } = request;

    const operation_id = `domain_add_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const client = await this.primaryPool.connect();
    
    try {
      await client.query('BEGIN');
      
      let inserted = 0;
      let skipped = 0;
      const errors: string[] = [];

      for (const domain of domains) {
        try {
          const cleanDomain = this.validateAndCleanDomain(domain);
          
          const result = await client.query(`
            INSERT INTO domains (domain, source, cohort, status, priority, created_at, updated_at)
            VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
            ON CONFLICT (domain) DO NOTHING
            RETURNING id
          `, [cleanDomain, source, cohort, 'pending', priority]);

          if (result.rows.length > 0) {
            inserted++;
          } else {
            skipped++;
          }

        } catch (error) {
          errors.push(`${domain}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }

      // Log the operation for audit trail
      await client.query(`
        INSERT INTO processing_logs (event_type, details, created_at)
        VALUES ($1, $2, CURRENT_TIMESTAMP)
      `, ['domain_addition', {
        operation_id,
        cohort,
        source,
        domains_processed: domains.length,
        inserted,
        skipped,
        errors
      }]);

      await client.query('COMMIT');

      return {
        inserted,
        skipped,
        errors,
        operation_id
      };

    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Get domain statistics (READ from replica)
   * 
   * @param cohort - Optional cohort filter
   * @returns Promise<DomainStats>
   */
  async getDomainStats(cohort?: string): Promise<DomainStats> {
    const client = await this.replicaPool.connect();
    
    try {
      let query = `
        SELECT 
          COUNT(*) as total_domains,
          json_object_agg(status, status_count) as by_status,
          json_object_agg(cohort, cohort_count) as by_cohort,
          json_object_agg(source, source_count) as by_source
        FROM (
          SELECT 
            status,
            cohort,
            source,
            COUNT(*) OVER (PARTITION BY status) as status_count,
            COUNT(*) OVER (PARTITION BY cohort) as cohort_count,
            COUNT(*) OVER (PARTITION BY source) as source_count
          FROM domains
          ${cohort ? 'WHERE cohort = $1' : ''}
        ) t
      `;

      const result = await client.query(query, cohort ? [cohort] : []);
      
      return result.rows[0] || {
        total_domains: 0,
        by_status: {},
        by_cohort: {},
        by_source: {}
      };

    } finally {
      client.release();
    }
  }

  /**
   * List available cohorts (READ from replica)
   * 
   * @returns Promise<Array<{ cohort: string; domain_count: number; pending: number; completed: number }>>
   */
  async listCohorts(): Promise<Array<{
    cohort: string;
    domain_count: number;
    pending: number;
    completed: number;
    processing: number;
    priority_avg: number;
  }>> {
    const client = await this.replicaPool.connect();
    
    try {
      const result = await client.query(`
        SELECT 
          cohort,
          COUNT(*) as domain_count,
          COUNT(*) FILTER (WHERE status = 'pending') as pending,
          COUNT(*) FILTER (WHERE status = 'completed') as completed,
          COUNT(*) FILTER (WHERE status = 'processing') as processing,
          AVG(priority) as priority_avg
        FROM domains
        GROUP BY cohort
        ORDER BY domain_count DESC
      `);

      return result.rows.map(row => ({
        cohort: row.cohort,
        domain_count: parseInt(row.domain_count),
        pending: parseInt(row.pending),
        completed: parseInt(row.completed),
        processing: parseInt(row.processing),
        priority_avg: parseFloat(row.priority_avg)
      }));

    } finally {
      client.release();
    }
  }

  /**
   * Validate and clean domain string
   * 
   * @param domain - Raw domain string
   * @returns string - Cleaned domain
   * @throws Error if invalid
   */
  private validateAndCleanDomain(domain: string): string {
    if (!domain || typeof domain !== 'string') {
      throw new Error('Domain must be a non-empty string');
    }

    // Clean and normalize
    const cleaned = domain.toLowerCase().trim();
    
    // Remove protocol if present
    const withoutProtocol = cleaned.replace(/^https?:\/\//, '');
    
    // Remove trailing slash
    const withoutSlash = withoutProtocol.replace(/\/$/, '');
    
    // Basic domain validation
    if (!/^[a-z0-9.-]+\.[a-z]{2,}$/.test(withoutSlash)) {
      throw new Error(`Invalid domain format: ${domain}`);
    }

    return withoutSlash;
  }

  /**
   * Update domain cohort (for reorganization)
   * 
   * @param domains - Array of domain strings
   * @param newCohort - New cohort name
   * @returns Promise<{ updated: number }>
   */
  async updateDomainCohort(domains: string[], newCohort: string): Promise<{ updated: number }> {
    const client = await this.primaryPool.connect();
    
    try {
      const cleanDomains = domains.map(d => this.validateAndCleanDomain(d));
      
      const result = await client.query(`
        UPDATE domains 
        SET cohort = $1, updated_at = CURRENT_TIMESTAMP
        WHERE domain = ANY($2)
      `, [newCohort, cleanDomains]);

      return { updated: result.rowCount || 0 };

    } finally {
      client.release();
    }
  }
} 