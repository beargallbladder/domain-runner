import { Pool, PoolConfig, PoolClient, QueryResult } from 'pg';
import { EventEmitter } from 'events';

interface ExtendedPoolClient extends PoolClient {
  lastQuery?: string;
}

// Default pool configuration
const defaultConfig: PoolConfig = {
  max: 20, // Maximum number of clients in the pool
  idleTimeoutMillis: 30000, // Close idle clients after 30 seconds
  connectionTimeoutMillis: 2000, // Return an error after 2 seconds if connection could not be established
  ssl: process.env.NODE_ENV === 'production' ? {
    rejectUnauthorized: false
  } : false
};

// Create pool with environment variables or defaults
export const pool = new Pool({
  ...defaultConfig,
  connectionString: process.env.DATABASE_URL || 'postgres://localhost:5432/raw_capture',
}) as Pool & EventEmitter;

// Handle pool errors
pool.on('error', (err: Error, client: PoolClient) => {
  console.error('Unexpected error on idle client', err);
});

// Export helper functions for common database operations
export async function query<T = any>(text: string, params?: any[]): Promise<QueryResult<T>> {
  const start = Date.now();
  try {
    const res = await pool.query<T>(text, params);
    const duration = Date.now() - start;
    console.log('Executed query', { text, duration, rows: res.rowCount });
    return res;
  } catch (error) {
    console.error('Error executing query', { text, error });
    throw error;
  }
}

// Get a client from the pool
export async function getClient(): Promise<ExtendedPoolClient> {
  const client = await pool.connect() as ExtendedPoolClient;
  const query = client.query.bind(client);
  const release = client.release.bind(client);

  // Set a timeout of 5 seconds on idle clients
  const timeout = setTimeout(() => {
    console.error('A client has been checked out for too long.');
    console.error(`The last executed query on this client was: ${client.lastQuery}`);
  }, 5000);

  // Monkey patch the query method to keep track of the last query
  client.query = (async (...args: [string, any[]?]) => {
    client.lastQuery = args[0];
    return query(...args);
  }) as typeof client.query;

  client.release = () => {
    clearTimeout(timeout);
    client.query = query;
    client.release = release;
    return release();
  };

  return client;
}

export async function cleanup(): Promise<void> {
  await pool.end();
} 