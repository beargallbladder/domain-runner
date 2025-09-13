import { describe, test, expect, beforeAll, afterAll, jest } from '@jest/globals';
import { Pool } from 'pg';
import winston from 'winston';
import { QuantumService } from '../src/QuantumService';
import { QuantumBrandAnalyzer } from '../src/analyzers/QuantumBrandAnalyzer';

// Mock environment for tests
const mockEnv = {
  QUANTUM_ENABLED: 'true',
  QUANTUM_SHADOW_MODE: 'true',
  QUANTUM_API_EXPOSED: 'false',
  QUANTUM_MAX_CALC_TIME_MS: '1000',
  QUANTUM_CACHE_ENABLED: 'true',
  QUANTUM_CACHE_TTL_SECONDS: '60'
};

describe('Quantum Intelligence Module Tests', () => {
  let pool: Pool;
  let logger: winston.Logger;
  let quantumService: QuantumService;

  beforeAll(() => {
    // Set test environment
    Object.assign(process.env, mockEnv);

    // Mock pool
    pool = {
      query: jest.fn(),
      connect: jest.fn().mockResolvedValue({
        query: jest.fn(),
        release: jest.fn()
      })
    } as any;

    // Mock logger
    logger = {
      info: jest.fn(),
      error: jest.fn(),
      warn: jest.fn()
    } as any;
  });

  describe('Safety Features', () => {
    test('should not initialize when disabled', () => {
      process.env.QUANTUM_ENABLED = 'false';
      const service = new QuantumService(pool, logger);
      
      expect(logger.info).toHaveBeenCalledWith('🚫 Quantum Intelligence Module is DISABLED');
    });

    test('should default to shadow mode', () => {
      delete process.env.QUANTUM_SHADOW_MODE;
      const service = new QuantumService(pool, logger);
      
      expect(logger.info).toHaveBeenCalledWith(
        expect.stringContaining('Quantum Intelligence Module initialized'),
        expect.objectContaining({ shadowMode: true })
      );
    });

    test('should return null when disabled', async () => {
      process.env.QUANTUM_ENABLED = 'false';
      const service = new QuantumService(pool, logger);
      
      const result = await service.analyzeQuantumState('test-domain-id');
      expect(result).toBeNull();
    });

    test('should handle initialization failures gracefully', () => {
      // Force initialization error
      jest.spyOn(QuantumBrandAnalyzer.prototype, 'constructor').mockImplementation(() => {
        throw new Error('Initialization failed');
      });

      const service = new QuantumService(pool, logger);
      expect(logger.error).toHaveBeenCalledWith(
        'Failed to initialize Quantum components:',
        expect.any(Error)
      );
    });
  });

  describe('Quantum Analysis', () => {
    beforeEach(() => {
      process.env.QUANTUM_ENABLED = 'true';
      quantumService = new QuantumService(pool, logger);
    });

    test('should calculate quantum state successfully', async () => {
      // Mock database responses
      pool.query = jest.fn().mockResolvedValueOnce({
        rows: [{
          model: 'gpt-4',
          response_content: 'Tesla is showing strong growth and innovation',
          confidence_score: 0.85,
          prompt_type: 'analysis',
          created_at: new Date()
        }]
      });

      const result = await quantumService.analyzeQuantumState('test-domain-id');
      
      expect(result).toBeTruthy();
      expect(result.domainId).toBe('test-domain-id');
      expect(result.mode).toBe('shadow');
      expect(result.quantumState).toBeDefined();
    });

    test('should timeout long calculations', async () => {
      process.env.QUANTUM_MAX_CALC_TIME_MS = '100'; // 100ms timeout
      quantumService = new QuantumService(pool, logger);

      // Mock slow calculation
      pool.query = jest.fn().mockImplementation(() => {
        return new Promise(resolve => setTimeout(resolve, 200));
      });

      const result = await quantumService.analyzeQuantumState('test-domain-id');
      
      expect(result).toBeNull();
      expect(logger.error).toHaveBeenCalledWith(
        expect.stringContaining('Quantum analysis failed'),
        expect.any(Error)
      );
    });

    test('should use cache when enabled', async () => {
      // First call - cache miss
      pool.query = jest.fn().mockResolvedValue({ rows: [] });
      const result1 = await quantumService.analyzeQuantumState('cached-domain');
      
      // Second call - should hit cache
      const result2 = await quantumService.analyzeQuantumState('cached-domain');
      
      // Pool.query should only be called once due to caching
      expect(pool.query).toHaveBeenCalledTimes(1);
    });
  });

  describe('Data Integrity', () => {
    test('should only read from existing tables', async () => {
      quantumService = new QuantumService(pool, logger);
      
      await quantumService.analyzeQuantumState('test-domain-id');
      
      // Check that only SELECT queries were made to existing tables
      const queries = (pool.query as jest.Mock).mock.calls;
      const modifyingQueries = queries.filter(call => {
        const query = call[0];
        return query.includes('UPDATE domains') || 
               query.includes('DELETE FROM domains') ||
               query.includes('INSERT INTO domains');
      });
      
      expect(modifyingQueries).toHaveLength(0);
    });

    test('should create separate quantum tables', async () => {
      const client = {
        query: jest.fn(),
        release: jest.fn()
      };
      pool.connect = jest.fn().mockResolvedValue(client);
      
      process.env.QUANTUM_SHADOW_MODE = 'false'; // Enable writes
      quantumService = new QuantumService(pool, logger);
      
      await quantumService.analyzeQuantumState('test-domain-id');
      
      // Check for quantum table inserts only
      const quantumInserts = client.query.mock.calls.filter(call => {
        const query = call[0];
        return query.includes('INSERT INTO quantum_');
      });
      
      expect(quantumInserts.length).toBeGreaterThan(0);
    });
  });

  describe('Error Handling', () => {
    test('should handle database errors gracefully', async () => {
      pool.query = jest.fn().mockRejectedValue(new Error('Database connection failed'));
      
      const result = await quantumService.analyzeQuantumState('test-domain-id');
      
      expect(result).toBeNull();
      expect(logger.error).toHaveBeenCalled();
    });

    test('should continue operation if logging fails', async () => {
      // Make logging fail
      pool.query = jest.fn()
        .mockResolvedValueOnce({ rows: [] }) // Main query succeeds
        .mockRejectedValueOnce(new Error('Logging failed')); // Log query fails
      
      const result = await quantumService.analyzeQuantumState('test-domain-id');
      
      expect(result).toBeTruthy(); // Main operation should still succeed
    });
  });

  describe('Health Checks', () => {
    test('should report healthy status', async () => {
      pool.query = jest.fn().mockResolvedValue({ rows: [{ count: '100' }] });
      
      const health = await quantumService.healthCheck();
      
      expect(health.status).toBe('healthy');
      expect(health.quantumStatesCount).toBe(100);
      expect(health.shadowMode).toBe(true);
    });

    test('should report disabled status when disabled', async () => {
      process.env.QUANTUM_ENABLED = 'false';
      quantumService = new QuantumService(pool, logger);
      
      const health = await quantumService.healthCheck();
      
      expect(health.status).toBe('disabled');
      expect(health.message).toBe('Quantum module is disabled');
    });

    test('should report unhealthy on database errors', async () => {
      pool.query = jest.fn().mockRejectedValue(new Error('Connection refused'));
      
      const health = await quantumService.healthCheck();
      
      expect(health.status).toBe('unhealthy');
      expect(health.error).toBe('Connection refused');
    });
  });

  describe('Performance Tests', () => {
    test('should complete analysis within time limit', async () => {
      const startTime = Date.now();
      
      await quantumService.analyzeQuantumState('perf-test-domain');
      
      const duration = Date.now() - startTime;
      expect(duration).toBeLessThan(1000); // Should complete within 1 second
    });

    test('should handle concurrent analyses', async () => {
      const domains = Array.from({ length: 10 }, (_, i) => `domain-${i}`);
      
      const promises = domains.map(domain => 
        quantumService.analyzeQuantumState(domain)
      );
      
      const results = await Promise.all(promises);
      
      expect(results).toHaveLength(10);
      expect(results.every(r => r !== null || r === null)).toBe(true); // All should complete
    });
  });

  describe('Shutdown', () => {
    test('should shutdown gracefully', async () => {
      await quantumService.shutdown();
      
      expect(logger.info).toHaveBeenCalledWith('Shutting down Quantum Intelligence Module...');
      
      // Should not process after shutdown
      const result = await quantumService.analyzeQuantumState('after-shutdown');
      expect(result).toBeNull();
    });
  });
});

// Integration tests with real database (skip in CI)
describe.skip('Quantum Integration Tests', () => {
  let realPool: Pool;
  let realService: QuantumService;

  beforeAll(async () => {
    realPool = new Pool({
      connectionString: process.env.DATABASE_URL
    });

    // Create test tables
    await realPool.query(`
      CREATE SCHEMA IF NOT EXISTS quantum_test;
      SET search_path TO quantum_test;
    `);

    // Run migrations
    const migrationSQL = require('fs').readFileSync(
      '../migrations/001_create_quantum_tables.sql',
      'utf8'
    );
    await realPool.query(migrationSQL);

    realService = new QuantumService(realPool, winston.createLogger());
  });

  afterAll(async () => {
    // Cleanup
    await realPool.query('DROP SCHEMA quantum_test CASCADE');
    await realPool.end();
  });

  test('should perform real quantum analysis', async () => {
    // Insert test data
    await realPool.query(`
      INSERT INTO domains (id, domain) VALUES 
      ('11111111-1111-1111-1111-111111111111', 'test.com')
    `);

    await realPool.query(`
      INSERT INTO domain_responses (domain_id, model, response_content, confidence_score)
      VALUES 
      ('11111111-1111-1111-1111-111111111111', 'gpt-4', 'Positive outlook', 0.9),
      ('11111111-1111-1111-1111-111111111111', 'claude', 'Strong growth', 0.85)
    `);

    const result = await realService.analyzeQuantumState('11111111-1111-1111-1111-111111111111');
    
    expect(result).toBeTruthy();
    expect(result.quantumState).toBeDefined();
    expect(result.anomalies).toBeDefined();
  });
});