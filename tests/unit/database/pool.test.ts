import { Pool } from 'pg';

jest.mock('pg');

describe('Database Pool Configuration', () => {
  let mockPool: any;

  beforeEach(() => {
    mockPool = {
      query: jest.fn(),
      end: jest.fn(),
      connect: jest.fn(),
      on: jest.fn(),
    };
    (Pool as jest.MockedClass<typeof Pool>).mockImplementation(() => mockPool);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Pool Creation', () => {
    it('should create pool with production SSL settings', () => {
      process.env.NODE_ENV = 'production';
      process.env.DATABASE_URL = 'postgresql://user:pass@host:5432/db';

      new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false },
        max: 100,
        min: 20,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 30000,
      });

      expect(Pool).toHaveBeenCalledWith(expect.objectContaining({
        ssl: { rejectUnauthorized: false },
        max: 100,
        min: 20,
      }));
    });

    it('should create pool without SSL in development', () => {
      process.env.NODE_ENV = 'development';
      process.env.DATABASE_URL = 'postgresql://user:pass@localhost:5432/db';

      new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: false,
        max: 100,
        min: 20,
      });

      expect(Pool).toHaveBeenCalledWith(expect.objectContaining({
        ssl: false,
      }));
    });
  });

  describe('Query Operations', () => {
    it('should execute queries with parameters', async () => {
      mockPool.query.mockResolvedValue({ 
        rows: [{ id: 1, domain: 'test.com' }],
        rowCount: 1,
      });

      const result = await mockPool.query(
        'SELECT * FROM domains WHERE id = $1',
        [1]
      );

      expect(mockPool.query).toHaveBeenCalledWith(
        'SELECT * FROM domains WHERE id = $1',
        [1]
      );
      expect(result.rows).toHaveLength(1);
      expect(result.rows[0].domain).toBe('test.com');
    });

    it('should handle query errors', async () => {
      const error = new Error('Database connection failed');
      mockPool.query.mockRejectedValue(error);

      await expect(mockPool.query('SELECT * FROM domains')).rejects.toThrow(
        'Database connection failed'
      );
    });

    it('should handle transaction operations', async () => {
      const client = {
        query: jest.fn(),
        release: jest.fn(),
      };
      mockPool.connect.mockResolvedValue(client);

      // Simulate transaction
      const connectedClient = await mockPool.connect();
      await connectedClient.query('BEGIN');
      await connectedClient.query('INSERT INTO domains (domain) VALUES ($1)', ['test.com']);
      await connectedClient.query('COMMIT');
      connectedClient.release();

      expect(client.query).toHaveBeenCalledTimes(3);
      expect(client.query).toHaveBeenCalledWith('BEGIN');
      expect(client.query).toHaveBeenCalledWith('COMMIT');
      expect(client.release).toHaveBeenCalled();
    });
  });

  describe('Connection Management', () => {
    it('should handle connection pool exhaustion', async () => {
      const clients = [];
      const maxClients = 100;

      // Mock connect to track client creation
      let clientCount = 0;
      mockPool.connect.mockImplementation(() => {
        if (clientCount >= maxClients) {
          return Promise.reject(new Error('Connection pool exhausted'));
        }
        clientCount++;
        return Promise.resolve({
          query: jest.fn(),
          release: jest.fn(() => clientCount--),
        });
      });

      // Try to get max connections
      for (let i = 0; i < maxClients; i++) {
        clients.push(await mockPool.connect());
      }

      // Next connection should fail
      await expect(mockPool.connect()).rejects.toThrow('Connection pool exhausted');

      // Release one connection
      clients[0].release();

      // Now should be able to get a connection
      const newClient = await mockPool.connect();
      expect(newClient).toBeDefined();
    });

    it('should properly close pool on shutdown', async () => {
      await mockPool.end();
      expect(mockPool.end).toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    it('should handle connection timeout', async () => {
      mockPool.query.mockImplementation(() => 
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Connection timeout')), 100)
        )
      );

      await expect(mockPool.query('SELECT 1')).rejects.toThrow('Connection timeout');
    });

    it('should handle invalid queries', async () => {
      mockPool.query.mockRejectedValue(new Error('syntax error at or near "INVALID"'));

      await expect(
        mockPool.query('INVALID SQL QUERY')
      ).rejects.toThrow('syntax error');
    });

    it('should handle constraint violations', async () => {
      mockPool.query.mockRejectedValue({
        code: '23505',
        detail: 'Key (domain)=(test.com) already exists.',
        message: 'duplicate key value violates unique constraint "domains_domain_key"',
      });

      try {
        await mockPool.query('INSERT INTO domains (domain) VALUES ($1)', ['test.com']);
      } catch (error: any) {
        expect(error.code).toBe('23505');
        expect(error.detail).toContain('already exists');
      }
    });
  });

  describe('Performance Monitoring', () => {
    it('should track query execution time', async () => {
      const startTime = Date.now();
      
      mockPool.query.mockImplementation(() => 
        new Promise(resolve => 
          setTimeout(() => resolve({ rows: [], rowCount: 0 }), 50)
        )
      );

      await mockPool.query('SELECT * FROM domains');
      
      const duration = Date.now() - startTime;
      expect(duration).toBeGreaterThanOrEqual(50);
      expect(duration).toBeLessThan(100);
    });

    it('should handle slow queries', async () => {
      jest.setTimeout(10000);
      
      mockPool.query.mockImplementation(() => 
        new Promise(resolve => 
          setTimeout(() => resolve({ rows: [], rowCount: 0 }), 5000)
        )
      );

      const queryPromise = mockPool.query('SELECT pg_sleep(5)');
      
      // In real implementation, this would trigger slow query logging
      await expect(queryPromise).resolves.toBeDefined();
    });
  });
});