import { Pool } from 'pg';
import fs from 'fs/promises';
import path from 'path';

describe('Database Migrations', () => {
  let pool: Pool;
  
  beforeAll(async () => {
    // Use test database
    pool = new Pool({
      connectionString: process.env.TEST_DATABASE_URL || 'postgresql://test_user:test_pass@localhost:5432/test_db',
      ssl: false,
    });
    
    // Clean database before tests
    await cleanDatabase();
  });

  afterAll(async () => {
    await pool.end();
  });

  async function cleanDatabase() {
    // Drop all tables to start fresh
    const tables = [
      'cache_snapshots',
      'domain_responses', 
      'domains',
      'raw_responses',
      'prompt_templates',
      'api_keys',
      'user_accounts',
    ];

    for (const table of tables) {
      await pool.query(`DROP TABLE IF EXISTS ${table} CASCADE`);
    }
  }

  describe('Schema Creation', () => {
    it('should create domains table with correct schema', async () => {
      // Run migration
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

      // Verify table exists
      const result = await pool.query(`
        SELECT column_name, data_type, is_nullable, column_default
        FROM information_schema.columns
        WHERE table_name = 'domains'
        ORDER BY ordinal_position
      `);

      const columns = result.rows;
      
      // Verify columns
      expect(columns.find(c => c.column_name === 'id')).toMatchObject({
        data_type: 'integer',
        is_nullable: 'NO',
      });
      
      expect(columns.find(c => c.column_name === 'domain')).toMatchObject({
        data_type: 'character varying',
        is_nullable: 'NO',
      });
      
      expect(columns.find(c => c.column_name === 'status')).toMatchObject({
        data_type: 'character varying',
        is_nullable: 'YES',
        column_default: "'pending'::character varying",
      });

      // Verify unique constraint
      const constraints = await pool.query(`
        SELECT constraint_name, constraint_type
        FROM information_schema.table_constraints
        WHERE table_name = 'domains' AND constraint_type = 'UNIQUE'
      `);
      
      expect(constraints.rows.length).toBeGreaterThan(0);
    });

    it('should create domain_responses table with foreign key', async () => {
      await pool.query(`
        CREATE TABLE IF NOT EXISTS domain_responses (
          id SERIAL PRIMARY KEY,
          domain_id INTEGER REFERENCES domains(id) ON DELETE CASCADE,
          model VARCHAR(255) NOT NULL,
          prompt_type VARCHAR(255) NOT NULL,
          response TEXT NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Verify foreign key constraint
      const fkResult = await pool.query(`
        SELECT
          tc.constraint_name,
          tc.table_name,
          kcu.column_name,
          ccu.table_name AS foreign_table_name,
          ccu.column_name AS foreign_column_name
        FROM information_schema.table_constraints AS tc
        JOIN information_schema.key_column_usage AS kcu
          ON tc.constraint_name = kcu.constraint_name
        JOIN information_schema.constraint_column_usage AS ccu
          ON ccu.constraint_name = tc.constraint_name
        WHERE tc.constraint_type = 'FOREIGN KEY' 
          AND tc.table_name = 'domain_responses'
      `);

      expect(fkResult.rows[0]).toMatchObject({
        column_name: 'domain_id',
        foreign_table_name: 'domains',
        foreign_column_name: 'id',
      });
    });

    it('should create indexes for performance', async () => {
      // Create raw_responses table with indexes
      await pool.query(`
        CREATE TABLE IF NOT EXISTS raw_responses (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          domain TEXT NOT NULL,
          model TEXT NOT NULL,
          prompt_template_id TEXT NOT NULL,
          interpolated_prompt TEXT NOT NULL,
          response TEXT NOT NULL,
          captured_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          latency_ms INT,
          token_usage JSONB,
          cost_estimate FLOAT
        )
      `);

      // Create indexes
      await pool.query(`
        CREATE INDEX IF NOT EXISTS idx_raw_responses_captured_at 
        ON raw_responses(captured_at)
      `);
      
      await pool.query(`
        CREATE INDEX IF NOT EXISTS idx_raw_responses_domain_captured 
        ON raw_responses(domain, captured_at)
      `);
      
      await pool.query(`
        CREATE INDEX IF NOT EXISTS idx_raw_responses_model_captured 
        ON raw_responses(model, captured_at)
      `);

      // Verify indexes exist
      const indexes = await pool.query(`
        SELECT indexname, indexdef
        FROM pg_indexes
        WHERE tablename = 'raw_responses'
          AND indexname LIKE 'idx_%'
      `);

      expect(indexes.rows.length).toBe(3);
      expect(indexes.rows.map(r => r.indexname)).toContain('idx_raw_responses_captured_at');
      expect(indexes.rows.map(r => r.indexname)).toContain('idx_raw_responses_domain_captured');
      expect(indexes.rows.map(r => r.indexname)).toContain('idx_raw_responses_model_captured');
    });
  });

  describe('Migration Execution', () => {
    it('should execute schema files in correct order', async () => {
      const schemaDir = path.join(__dirname, '../../schemas');
      
      // Check if schema files exist
      const initSql = await fs.readFile(path.join(schemaDir, 'init.sql'), 'utf-8');
      const tablesSql = await fs.readFile(path.join(schemaDir, 'tables.sql'), 'utf-8');
      
      expect(initSql).toBeTruthy();
      expect(tablesSql).toBeTruthy();
      
      // Execute migrations
      await pool.query(initSql);
      await pool.query(tablesSql);
      
      // Verify all tables were created
      const tables = await pool.query(`
        SELECT table_name
        FROM information_schema.tables
        WHERE table_schema = 'public'
          AND table_type = 'BASE TABLE'
        ORDER BY table_name
      `);
      
      const tableNames = tables.rows.map(r => r.table_name);
      expect(tableNames).toContain('domains');
      expect(tableNames).toContain('raw_responses');
      expect(tableNames).toContain('prompt_templates');
    });

    it('should handle migration failures gracefully', async () => {
      // Try to create a table with invalid syntax
      try {
        await pool.query(`
          CREATE TABLE invalid_table (
            id SERIAL PRIMARY KEY,
            invalid_column INVALID_TYPE
          )
        `);
        fail('Should have thrown an error');
      } catch (error: any) {
        expect(error.message).toContain('type "invalid_type" does not exist');
      }

      // Verify database is still functional
      const result = await pool.query('SELECT 1 as test');
      expect(result.rows[0].test).toBe(1);
    });
  });

  describe('Data Integrity', () => {
    it('should enforce domain uniqueness', async () => {
      // Insert a domain
      await pool.query(
        'INSERT INTO domains (domain) VALUES ($1)',
        ['unique-test.com']
      );

      // Try to insert duplicate
      try {
        await pool.query(
          'INSERT INTO domains (domain) VALUES ($1)',
          ['unique-test.com']
        );
        fail('Should have thrown unique constraint error');
      } catch (error: any) {
        expect(error.code).toBe('23505'); // Unique violation
        expect(error.detail).toContain('already exists');
      }
    });

    it('should cascade delete domain responses', async () => {
      // Insert domain
      const domainResult = await pool.query(
        'INSERT INTO domains (domain) VALUES ($1) RETURNING id',
        ['cascade-test.com']
      );
      const domainId = domainResult.rows[0].id;

      // Insert responses
      await pool.query(
        'INSERT INTO domain_responses (domain_id, model, prompt_type, response) VALUES ($1, $2, $3, $4)',
        [domainId, 'test-model', 'test-prompt', 'test-response']
      );

      // Verify response exists
      const responsesBefore = await pool.query(
        'SELECT * FROM domain_responses WHERE domain_id = $1',
        [domainId]
      );
      expect(responsesBefore.rows.length).toBe(1);

      // Delete domain
      await pool.query('DELETE FROM domains WHERE id = $1', [domainId]);

      // Verify responses were cascaded
      const responsesAfter = await pool.query(
        'SELECT * FROM domain_responses WHERE domain_id = $1',
        [domainId]
      );
      expect(responsesAfter.rows.length).toBe(0);
    });

    it('should handle JSONB data correctly', async () => {
      // Insert with JSONB data
      const jsonData = {
        tokens: { prompt: 150, completion: 500 },
        model: 'gpt-4',
        temperature: 0.7,
      };

      await pool.query(`
        INSERT INTO raw_responses 
        (domain, model, prompt_template_id, interpolated_prompt, response, token_usage)
        VALUES ($1, $2, $3, $4, $5, $6)
      `, [
        'jsonb-test.com',
        'gpt-4',
        'template-1',
        'Test prompt',
        'Test response',
        JSON.stringify(jsonData),
      ]);

      // Query JSONB data
      const result = await pool.query(`
        SELECT 
          token_usage,
          token_usage->>'model' as model_from_json,
          (token_usage->'tokens'->>'prompt')::int as prompt_tokens
        FROM raw_responses
        WHERE domain = $1
      `, ['jsonb-test.com']);

      expect(result.rows[0].model_from_json).toBe('gpt-4');
      expect(result.rows[0].prompt_tokens).toBe(150);
    });
  });

  describe('Performance Optimizations', () => {
    it('should use indexes for time-based queries', async () => {
      // Insert test data
      for (let i = 0; i < 100; i++) {
        await pool.query(`
          INSERT INTO raw_responses 
          (domain, model, prompt_template_id, interpolated_prompt, response, captured_at)
          VALUES ($1, $2, $3, $4, $5, $6)
        `, [
          `perf-test-${i}.com`,
          'test-model',
          'template-1',
          'Test prompt',
          'Test response',
          new Date(Date.now() - i * 3600000), // Each hour back
        ]);
      }

      // Explain query to verify index usage
      const explainResult = await pool.query(`
        EXPLAIN (FORMAT JSON) 
        SELECT * FROM raw_responses 
        WHERE captured_at > NOW() - INTERVAL '24 hours'
        ORDER BY captured_at DESC
      `);

      const plan = explainResult.rows[0]['QUERY PLAN'][0]['Plan'];
      
      // Check if index is being used (look for Index Scan)
      const planString = JSON.stringify(plan);
      expect(planString).toMatch(/Index Scan|Bitmap.*Scan/);
    });

    it('should handle concurrent inserts efficiently', async () => {
      const promises = [];
      const domainCount = 50;

      // Insert many domains concurrently
      for (let i = 0; i < domainCount; i++) {
        promises.push(
          pool.query(
            'INSERT INTO domains (domain) VALUES ($1) ON CONFLICT (domain) DO NOTHING',
            [`concurrent-${i}.com`]
          )
        );
      }

      const start = Date.now();
      await Promise.all(promises);
      const duration = Date.now() - start;

      // Verify all inserted
      const count = await pool.query(
        "SELECT COUNT(*) FROM domains WHERE domain LIKE 'concurrent-%'"
      );
      expect(parseInt(count.rows[0].count)).toBe(domainCount);

      // Should complete reasonably fast (less than 5 seconds for 50 inserts)
      expect(duration).toBeLessThan(5000);
    });
  });

  describe('Rollback Scenarios', () => {
    it('should rollback transaction on error', async () => {
      const client = await pool.connect();
      
      try {
        await client.query('BEGIN');
        
        // Insert valid data
        await client.query(
          'INSERT INTO domains (domain) VALUES ($1)',
          ['rollback-test.com']
        );
        
        // Attempt invalid operation
        await client.query(
          'INSERT INTO domain_responses (domain_id, model) VALUES ($1, $2)',
          [999999, 'test'] // Missing required fields
        );
        
        await client.query('COMMIT');
        fail('Should have thrown an error');
      } catch (error) {
        await client.query('ROLLBACK');
      } finally {
        client.release();
      }

      // Verify domain was not inserted
      const result = await pool.query(
        'SELECT * FROM domains WHERE domain = $1',
        ['rollback-test.com']
      );
      expect(result.rows.length).toBe(0);
    });
  });
});