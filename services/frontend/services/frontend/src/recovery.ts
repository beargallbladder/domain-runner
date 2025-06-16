import { Pool } from 'pg';
import axios from 'axios';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
    require: true
  },
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000
});

class ProcessingRecovery {
  private static instance: ProcessingRecovery;
  private isMonitoring: boolean = false;
  private healthCheckInterval: NodeJS.Timeout | null = null;
  
  private constructor() {}
  
  static getInstance(): ProcessingRecovery {
    if (!ProcessingRecovery.instance) {
      ProcessingRecovery.instance = new ProcessingRecovery();
    }
    return ProcessingRecovery.instance;
  }

  async start() {
    console.log('🚀 Starting Processing Recovery System...');
    
    // Initial recovery
    await this.performRecovery();
    
    // Start continuous monitoring
    this.startHealthCheck();
  }

  private async performRecovery() {
    console.log('🔄 Performing system recovery...');
    
    try {
      // 1. Reset stuck domains
      await this.resetStuckDomains();
      
      // 2. Check domain buffer
      await this.ensureDomainBuffer();
      
      // 3. Restart processing if needed
      await this.restartProcessing();
      
      console.log('✅ Recovery completed successfully');
    } catch (error) {
      console.error('❌ Recovery failed:', error);
      // Schedule retry
      setTimeout(() => this.performRecovery(), 60000);
    }
  }

  private async resetStuckDomains() {
    const TWO_HOURS = 2;
    
    const result = await pool.query(`
      UPDATE domains 
      SET status = 'pending',
          error_count = error_count + 1,
          last_processed_at = NULL
      WHERE (
        (status = 'processing' AND last_processed_at < NOW() - INTERVAL '${TWO_HOURS} hours')
        OR
        (status = 'error' AND error_count < 3)
      )
      RETURNING id, domain;
    `);

    if (result.rows.length > 0) {
      console.log(`🔄 Reset ${result.rows.length} stuck domains to pending status`);
    }
  }

  private async ensureDomainBuffer() {
    // Check current pending count
    const { rows: [{ count }] } = await pool.query(`
      SELECT COUNT(*) as count FROM domains WHERE status = 'pending'
    `);

    if (parseInt(count) < 100) {
      console.log('📊 Domain buffer low, discovering new domains...');
      
      // Discover competitors of successful domains
      await pool.query(`
        WITH successful_domains AS (
          SELECT DISTINCT domain 
          FROM domains 
          WHERE status = 'completed'
          AND error_count = 0
          ORDER BY last_processed_at DESC
          LIMIT 10
        )
        INSERT INTO domains (domain, status, created_at)
        SELECT DISTINCT 
          competitor_domain,
          'pending',
          NOW()
        FROM successful_domains
        CROSS JOIN LATERAL (
          SELECT unnest(array[
            -- Add common variations and competitors
            'www.' || domain,
            domain || '.ai',
            'api.' || domain,
            'dev.' || domain,
            -- Add more patterns here
            CASE 
              WHEN domain LIKE '%.com' THEN regexp_replace(domain, '.com$', '.ai')
              WHEN domain LIKE '%.ai' THEN regexp_replace(domain, '.ai$', '.com')
              ELSE domain
            END
          ]) as competitor_domain
        ) competitors
        WHERE NOT EXISTS (
          SELECT 1 FROM domains d2 WHERE d2.domain = competitor_domain
        )
        LIMIT 100;
      `);
    }
  }

  private async restartProcessing() {
    const { rows: [{ count }] } = await pool.query(`
      SELECT COUNT(*) as count 
      FROM domains 
      WHERE status = 'completed' 
      AND last_processed_at > NOW() - INTERVAL '1 hour'
    `);

    if (parseInt(count) < 5) { // Less than 5 domains processed in last hour
      console.log('🔄 Processing appears stuck, attempting restart...');
      
      // Your process restart logic here
      // This could be an API call to your process manager
      // or direct process manipulation
    }
  }

  private startHealthCheck() {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }

    this.healthCheckInterval = setInterval(async () => {
      try {
        const health = await this.checkHealth();
        
        if (!health.isHealthy) {
          console.log('❌ Health check failed:', health.issues);
          await this.performRecovery();
        }
      } catch (error) {
        console.error('❌ Health check failed:', error);
      }
    }, 5 * 60 * 1000); // Every 5 minutes
  }

  private async checkHealth() {
    const stats = await pool.query(`
      SELECT 
        COUNT(*) FILTER (WHERE status = 'pending') as pending_count,
        COUNT(*) FILTER (WHERE status = 'processing') as processing_count,
        COUNT(*) FILTER (WHERE status = 'completed') as completed_count,
        COUNT(*) FILTER (WHERE status = 'error') as error_count,
        COUNT(*) FILTER (
          WHERE status = 'completed' 
          AND last_processed_at > NOW() - INTERVAL '1 hour'
        ) as hourly_completion_rate
      FROM domains;
    `);

    const issues = [];
    const metrics = stats.rows[0];

    if (metrics.pending_count < 100) {
      issues.push('LOW_PENDING_BUFFER');
    }
    if (metrics.processing_count > 50) {
      issues.push('TOO_MANY_PROCESSING');
    }
    if (metrics.hourly_completion_rate < 5) {
      issues.push('LOW_COMPLETION_RATE');
    }
    if (metrics.error_count / (metrics.completed_count || 1) > 0.1) {
      issues.push('HIGH_ERROR_RATE');
    }

    return {
      isHealthy: issues.length === 0,
      issues,
      metrics
    };
  }
}

// Start recovery system
const recovery = ProcessingRecovery.getInstance();
recovery.start().catch(console.error); 