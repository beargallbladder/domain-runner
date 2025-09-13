import { describe, test, expect, beforeAll, afterAll } from '@jest/globals';
import { Pool } from 'pg';
import winston from 'winston';
import { QuantumService } from '../src/QuantumService';

// Integration test with real database connection
describe('Quantum Module Integration Tests', () => {
  let pool: Pool;
  let logger: winston.Logger;
  let quantumService: QuantumService;
  
  // Use test database URL or mock
  const TEST_DATABASE_URL = process.env.TEST_DATABASE_URL || 
    'postgresql://test_user:test_pass@localhost:5432/llmrank_test';

  beforeAll(async () => {
    // Set up test environment
    process.env.QUANTUM_ENABLED = 'true';
    process.env.QUANTUM_SHADOW_MODE = 'true';
    process.env.QUANTUM_API_EXPOSED = 'false';
    
    // Create test pool
    pool = new Pool({
      connectionString: TEST_DATABASE_URL,
      max: 5
    });

    // Create test logger
    logger = winston.createLogger({
      level: 'info',
      transports: [new winston.transports.Console({ silent: true })]
    });

    // Initialize service
    quantumService = new QuantumService(pool, logger);
    
    // Create test schema if using real database
    if (process.env.RUN_INTEGRATION_TESTS === 'true') {
      await setupTestDatabase(pool);
    }
  });

  afterAll(async () => {
    if (quantumService) {
      await quantumService.shutdown();
    }
    if (pool) {
      await pool.end();
    }
  });

  describe('Safe Data Access', () => {
    test('should only read from existing tables', async () => {
      // Mock pool to track queries
      const queryLog: string[] = [];
      pool.query = jest.fn().mockImplementation((query: string) => {
        queryLog.push(query);
        return Promise.resolve({ rows: [] });
      });

      await quantumService.analyzeQuantumState('test-domain-id');

      // Check no writes to core tables
      const writesToCoreTables = queryLog.filter(q => 
        (q.includes('UPDATE') || q.includes('INSERT') || q.includes('DELETE')) &&
        (q.includes('domains') || q.includes('domain_responses')) &&
        !q.includes('quantum_')
      );

      expect(writesToCoreTables).toHaveLength(0);
    });

    test('should handle missing data gracefully', async () => {
      pool.query = jest.fn().mockResolvedValue({ rows: [] });

      const result = await quantumService.analyzeQuantumState('nonexistent-domain');
      
      expect(result).toBeNull();
      expect(logger.error).toHaveBeenCalled();
    });
  });

  describe('Quantum Calculations', () => {
    test('should calculate valid quantum states', async () => {
      // Mock LLM responses
      pool.query = jest.fn().mockResolvedValueOnce({
        rows: [
          {
            model: 'gpt-4',
            response_content: 'Tesla shows strong innovation and growth potential',
            confidence_score: 0.85,
            prompt_type: 'analysis',
            created_at: new Date()
          },
          {
            model: 'claude-3',
            response_content: 'Tesla facing production challenges but maintaining market leadership',
            confidence_score: 0.75,
            prompt_type: 'analysis',
            created_at: new Date()
          }
        ]
      });

      const result = await quantumService.analyzeQuantumState('tesla-domain-id');
      
      expect(result).toBeTruthy();
      expect(result.quantumState).toBeDefined();
      expect(result.quantumState.probabilities).toBeDefined();
      
      // Verify probabilities sum to 1
      const probSum = Object.values(result.quantumState.probabilities)
        .reduce((sum: number, p: any) => sum + p, 0);
      expect(probSum).toBeCloseTo(1.0, 5);
      
      // Verify uncertainty is bounded
      expect(result.quantumState.uncertainty).toBeGreaterThanOrEqual(0);
      expect(result.quantumState.uncertainty).toBeLessThanOrEqual(1);
    });

    test('should detect quantum anomalies correctly', async () => {
      // Mock responses showing strong consensus
      pool.query = jest.fn().mockResolvedValueOnce({
        rows: Array(10).fill({
          model: 'gpt-4',
          response_content: 'Extremely positive outlook with breakthrough innovation',
          confidence_score: 0.95,
          prompt_type: 'analysis',
          created_at: new Date()
        })
      });

      const result = await quantumService.analyzeQuantumState('viral-domain-id');
      
      expect(result).toBeTruthy();
      expect(result.anomalies).toBeDefined();
      expect(result.anomalies.length).toBeGreaterThan(0);
      
      // Should detect strong collapse
      const strongCollapse = result.anomalies.find((a: any) => a.type === 'strong_collapse');
      expect(strongCollapse).toBeDefined();
      expect(strongCollapse.strength).toBeGreaterThan(0.8);
    });
  });

  describe('Performance and Limits', () => {
    test('should respect calculation timeout', async () => {
      // Set very short timeout
      process.env.QUANTUM_MAX_CALC_TIME_MS = '50';
      const fastService = new QuantumService(pool, logger);

      // Mock slow query
      pool.query = jest.fn().mockImplementation(() => 
        new Promise(resolve => setTimeout(resolve, 100))
      );

      const start = Date.now();
      const result = await fastService.analyzeQuantumState('timeout-test');
      const duration = Date.now() - start;

      expect(result).toBeNull();
      expect(duration).toBeLessThan(100);
    });

    test('should handle concurrent requests', async () => {
      pool.query = jest.fn().mockResolvedValue({ rows: [] });

      const domains = Array.from({ length: 10 }, (_, i) => `domain-${i}`);
      const promises = domains.map(d => quantumService.analyzeQuantumState(d));
      
      const results = await Promise.all(promises);
      
      expect(results).toHaveLength(10);
      expect(results.every(r => r === null || r.domainId)).toBe(true);
    });
  });

  describe('Shadow Mode Operation', () => {
    test('should not expose data in shadow mode', async () => {
      process.env.QUANTUM_SHADOW_MODE = 'true';
      const shadowService = new QuantumService(pool, logger);

      // Mock successful calculation
      pool.query = jest.fn().mockResolvedValueOnce({
        rows: [{
          model: 'gpt-4',
          response_content: 'Test content',
          confidence_score: 0.8,
          prompt_type: 'analysis',
          created_at: new Date()
        }]
      });

      const result = await shadowService.analyzeQuantumState('shadow-test');
      
      expect(result).toBeTruthy();
      expect(result.mode).toBe('shadow');
      
      // Should not write to database in shadow mode
      const writeQueries = (pool.query as jest.Mock).mock.calls.filter(
        call => call[0].includes('INSERT INTO quantum_')
      );
      expect(writeQueries).toHaveLength(0);
    });
  });

  describe('Health Monitoring', () => {
    test('should report health status', async () => {
      pool.query = jest.fn().mockResolvedValue({ rows: [{ count: '42' }] });

      const health = await quantumService.healthCheck();
      
      expect(health.status).toBe('healthy');
      expect(health.quantumStatesCount).toBe(42);
      expect(health.metrics).toBeDefined();
    });

    test('should handle health check errors', async () => {
      pool.query = jest.fn().mockRejectedValue(new Error('Connection failed'));

      const health = await quantumService.healthCheck();
      
      expect(health.status).toBe('unhealthy');
      expect(health.error).toBe('Connection failed');
    });
  });
});

// Helper to set up test database
async function setupTestDatabase(pool: Pool): Promise<void> {
  try {
    // Create test schema
    await pool.query('CREATE SCHEMA IF NOT EXISTS quantum_test');
    await pool.query('SET search_path TO quantum_test');
    
    // Create minimal test tables
    await pool.query(`
      CREATE TABLE IF NOT EXISTS domains (
        id UUID PRIMARY KEY,
        domain VARCHAR(255),
        industry_category VARCHAR(100)
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS domain_responses (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        domain_id UUID REFERENCES domains(id),
        model VARCHAR(50),
        response_content TEXT,
        confidence_score FLOAT,
        prompt_type VARCHAR(50),
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // Run quantum migrations
    const migrationSQL = require('fs').readFileSync(
      '../migrations/001_create_quantum_tables.sql',
      'utf8'
    );
    await pool.query(migrationSQL);

  } catch (error) {
    console.error('Test database setup failed:', error);
  }
}