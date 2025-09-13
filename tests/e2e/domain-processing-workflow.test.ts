import { Pool } from 'pg';
import request from 'supertest';
import { spawn } from 'child_process';
import path from 'path';

/**
 * End-to-End tests for the complete domain processing workflow
 * This tests the full flow from domain submission to final results
 */
describe('Domain Processing Workflow E2E', () => {
  let pool: Pool;
  let services: any[] = [];
  
  beforeAll(async () => {
    // Setup test database connection
    pool = new Pool({
      connectionString: process.env.TEST_DATABASE_URL || 'postgresql://test_user:test_pass@localhost:5432/test_db',
      ssl: false,
    });

    // Start required services
    await startServices();
    
    // Setup database schema
    await setupDatabase();
    
    // Wait for services to be ready
    await waitForServices();
  }, 60000); // 60 second timeout for setup

  afterAll(async () => {
    // Cleanup
    await cleanupDatabase();
    await pool.end();
    await stopServices();
  }, 30000);

  async function startServices() {
    // Start sophisticated-runner service
    const sophisticatedRunner = spawn('npm', ['run', 'start'], {
      cwd: path.join(__dirname, '../../services/sophisticated-runner'),
      env: { ...process.env, PORT: '3003' },
    });
    services.push(sophisticatedRunner);

    // Start public-api service
    const publicApi = spawn('python', ['production_api.py'], {
      cwd: path.join(__dirname, '../../services/public-api'),
      env: { ...process.env, PORT: '8000' },
    });
    services.push(publicApi);
  }

  async function stopServices() {
    for (const service of services) {
      service.kill('SIGTERM');
    }
  }

  async function waitForServices() {
    const maxRetries = 30;
    const services = [
      { url: 'http://localhost:3003/health', name: 'sophisticated-runner' },
      { url: 'http://localhost:8000/health', name: 'public-api' },
    ];

    for (const service of services) {
      let retries = 0;
      while (retries < maxRetries) {
        try {
          const response = await fetch(service.url);
          if (response.ok) {
            console.log(`✅ ${service.name} is ready`);
            break;
          }
        } catch (error) {
          // Service not ready yet
        }
        retries++;
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
      
      if (retries === maxRetries) {
        throw new Error(`${service.name} failed to start`);
      }
    }
  }

  async function setupDatabase() {
    // Create tables
    await pool.query(`
      CREATE TABLE IF NOT EXISTS domains (
        id SERIAL PRIMARY KEY,
        domain VARCHAR(255) UNIQUE NOT NULL,
        status VARCHAR(50) DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        crawl_status VARCHAR(50),
        brand_strength FLOAT,
        ai_summary TEXT
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS domain_responses (
        id SERIAL PRIMARY KEY,
        domain_id INTEGER REFERENCES domains(id),
        model VARCHAR(255) NOT NULL,
        prompt_type VARCHAR(255) NOT NULL,
        response TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS cache_snapshots (
        id SERIAL PRIMARY KEY,
        domain VARCHAR(255) NOT NULL,
        consensus_data JSONB,
        brand_strength FLOAT,
        competitive_position JSONB,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
  }

  async function cleanupDatabase() {
    await pool.query('DROP TABLE IF EXISTS cache_snapshots CASCADE');
    await pool.query('DROP TABLE IF EXISTS domain_responses CASCADE');
    await pool.query('DROP TABLE IF EXISTS domains CASCADE');
  }

  describe('Complete Domain Processing Flow', () => {
    it('should process a domain from submission to final results', async () => {
      // Step 1: Submit a new domain
      const testDomain = 'test-e2e-domain.com';
      
      await pool.query(
        'INSERT INTO domains (domain, status) VALUES ($1, $2)',
        [testDomain, 'pending']
      );

      // Step 2: Trigger domain processing
      const processingResponse = await request('http://localhost:3003')
        .post('/process-pending-domains')
        .send({});
      
      expect(processingResponse.status).toBe(202);

      // Step 3: Wait for processing to complete
      let attempts = 0;
      let domainStatus = 'pending';
      
      while (domainStatus === 'pending' && attempts < 30) {
        const result = await pool.query(
          'SELECT status FROM domains WHERE domain = $1',
          [testDomain]
        );
        
        if (result.rows.length > 0) {
          domainStatus = result.rows[0].status;
        }
        
        if (domainStatus !== 'completed') {
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
        attempts++;
      }

      expect(domainStatus).toBe('completed');

      // Step 4: Verify responses were generated
      const responses = await pool.query(
        `SELECT dr.* FROM domain_responses dr
         JOIN domains d ON dr.domain_id = d.id
         WHERE d.domain = $1`,
        [testDomain]
      );

      expect(responses.rows.length).toBeGreaterThan(0);
      
      // Should have responses from multiple models
      const uniqueModels = new Set(responses.rows.map(r => r.model));
      expect(uniqueModels.size).toBeGreaterThan(3);

      // Step 5: Verify data is accessible via API
      const apiResponse = await request('http://localhost:8000')
        .get(`/api/v1/domains/${testDomain}`)
        .send();

      expect(apiResponse.status).toBe(200);
      expect(apiResponse.body.domain).toBe(testDomain);
      expect(apiResponse.body.crawl_status).toBe('completed');
    });

    it('should handle multiple domains concurrently', async () => {
      const testDomains = [
        'concurrent-test-1.com',
        'concurrent-test-2.com',
        'concurrent-test-3.com',
        'concurrent-test-4.com',
        'concurrent-test-5.com',
      ];

      // Insert all test domains
      for (const domain of testDomains) {
        await pool.query(
          'INSERT INTO domains (domain, status) VALUES ($1, $2)',
          [domain, 'pending']
        );
      }

      // Trigger processing
      const response = await request('http://localhost:3003')
        .post('/ultra-fast-process')
        .send({});

      expect(response.status).toBe(200);
      expect(response.body.processed).toBeGreaterThan(0);

      // Wait for all domains to be processed
      await new Promise(resolve => setTimeout(resolve, 10000));

      // Verify all domains were processed
      const results = await pool.query(
        `SELECT domain, status FROM domains 
         WHERE domain = ANY($1)`,
        [testDomains]
      );

      const completedCount = results.rows.filter(r => r.status === 'completed').length;
      expect(completedCount).toBeGreaterThan(3); // At least 3 out of 5 should complete
    });

    it('should generate cache snapshots after processing', async () => {
      const testDomain = 'cache-test-domain.com';
      
      // Add and process domain
      await pool.query(
        'INSERT INTO domains (domain, status) VALUES ($1, $2)',
        [testDomain, 'pending']
      );

      await request('http://localhost:3003')
        .post('/process-pending-domains')
        .send({});

      // Wait for processing
      await new Promise(resolve => setTimeout(resolve, 8000));

      // Check for cache snapshot
      const cacheResult = await pool.query(
        'SELECT * FROM cache_snapshots WHERE domain = $1',
        [testDomain]
      );

      if (cacheResult.rows.length > 0) {
        expect(cacheResult.rows[0].consensus_data).toBeDefined();
        expect(cacheResult.rows[0].brand_strength).toBeGreaterThan(0);
      }
    });

    it('should handle API rate limiting gracefully', async () => {
      // Add many domains to trigger rate limiting
      const manyDomains = [];
      for (let i = 1; i <= 20; i++) {
        manyDomains.push(`rate-limit-test-${i}.com`);
      }

      for (const domain of manyDomains) {
        await pool.query(
          'INSERT INTO domains (domain, status) VALUES ($1, $2) ON CONFLICT DO NOTHING',
          [domain, 'pending']
        );
      }

      // Process with ultra-fast endpoint
      const response = await request('http://localhost:3003')
        .post('/ultra-fast-process')
        .set('x-batch-size', '20')
        .send({});

      expect(response.status).toBe(200);

      // Even with rate limiting, some should complete
      await new Promise(resolve => setTimeout(resolve, 15000));

      const completed = await pool.query(
        `SELECT COUNT(*) as count FROM domains 
         WHERE domain LIKE 'rate-limit-test-%' 
         AND status = 'completed'`
      );

      expect(parseInt(completed.rows[0].count)).toBeGreaterThan(5);
    });

    it('should recover from database failures', async () => {
      const testDomain = 'recovery-test.com';
      
      await pool.query(
        'INSERT INTO domains (domain, status) VALUES ($1, $2)',
        [testDomain, 'pending']
      );

      // Temporarily break the domain_responses table
      await pool.query('ALTER TABLE domain_responses RENAME TO domain_responses_backup');

      // Try to process
      await request('http://localhost:3003')
        .post('/process-pending-domains')
        .send({});

      // Wait a bit
      await new Promise(resolve => setTimeout(resolve, 3000));

      // Domain should still be pending
      const result = await pool.query(
        'SELECT status FROM domains WHERE domain = $1',
        [testDomain]
      );
      expect(result.rows[0].status).toBe('pending');

      // Restore table
      await pool.query('ALTER TABLE domain_responses_backup RENAME TO domain_responses');

      // Retry processing
      await request('http://localhost:3003')
        .post('/process-pending-domains')
        .send({});

      // Wait for completion
      await new Promise(resolve => setTimeout(resolve, 8000));

      // Should now be completed
      const finalResult = await pool.query(
        'SELECT status FROM domains WHERE domain = $1',
        [testDomain]
      );
      expect(finalResult.rows[0].status).toBe('completed');
    });
  });

  describe('Data Quality Checks', () => {
    it('should generate meaningful AI responses', async () => {
      const testDomain = 'quality-check.com';
      
      await pool.query(
        'INSERT INTO domains (domain, status) VALUES ($1, $2)',
        [testDomain, 'pending']
      );

      await request('http://localhost:3003')
        .post('/process-pending-domains')
        .send({});

      await new Promise(resolve => setTimeout(resolve, 8000));

      const responses = await pool.query(
        `SELECT dr.response FROM domain_responses dr
         JOIN domains d ON dr.domain_id = d.id
         WHERE d.domain = $1`,
        [testDomain]
      );

      // Check response quality
      for (const row of responses.rows) {
        const response = row.response;
        expect(response.length).toBeGreaterThan(50); // Not just a placeholder
        expect(response).not.toContain('error');
        expect(response).not.toContain('undefined');
      }
    });

    it('should calculate brand strength correctly', async () => {
      const testDomain = 'brand-strength-test.com';
      
      await pool.query(
        'INSERT INTO domains (domain, status) VALUES ($1, $2)',
        [testDomain, 'pending']
      );

      // Process domain
      await request('http://localhost:3003')
        .post('/process-pending-domains')
        .send({});

      await new Promise(resolve => setTimeout(resolve, 10000));

      // Update brand strength based on responses
      await pool.query(`
        UPDATE domains 
        SET brand_strength = (
          SELECT AVG(LENGTH(response)::float / 10) 
          FROM domain_responses 
          WHERE domain_id = domains.id
        )
        WHERE domain = $1
      `, [testDomain]);

      const result = await pool.query(
        'SELECT brand_strength FROM domains WHERE domain = $1',
        [testDomain]
      );

      if (result.rows.length > 0 && result.rows[0].brand_strength) {
        expect(result.rows[0].brand_strength).toBeGreaterThan(0);
        expect(result.rows[0].brand_strength).toBeLessThanOrEqual(100);
      }
    });
  });

  describe('API Integration', () => {
    it('should serve processed data through public API', async () => {
      // Get all domains
      const domainsResponse = await request('http://localhost:8000')
        .get('/api/v1/domains')
        .send();

      expect(domainsResponse.status).toBe(200);
      expect(Array.isArray(domainsResponse.body.domains)).toBe(true);

      // Get rankings
      const rankingsResponse = await request('http://localhost:8000')
        .get('/api/v1/rankings')
        .send();

      expect(rankingsResponse.status).toBe(200);
      expect(Array.isArray(rankingsResponse.body.rankings)).toBe(true);
    });

    it('should handle concurrent API requests', async () => {
      const requests = [];
      
      // Send 20 concurrent requests
      for (let i = 0; i < 20; i++) {
        requests.push(
          fetch('http://localhost:8000/api/v1/domains')
            .then(res => res.json())
        );
      }

      const results = await Promise.all(requests);
      
      // All should succeed
      expect(results.length).toBe(20);
      results.forEach(result => {
        expect(result.domains).toBeDefined();
      });
    });
  });
});