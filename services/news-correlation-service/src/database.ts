import { Pool } from 'pg';

// Database connection with proper SSL handling
const getDatabaseConfig = () => {
  const connectionString = process.env.DATABASE_URL;
  
  if (!connectionString) {
    throw new Error('DATABASE_URL environment variable is required');
  }
  
  // Add SSL mode if not present (for local development)
  const needsSslMode = connectionString.includes('postgres.vercel-storage.com') && 
                       !connectionString.includes('sslmode=');
  
  const finalConnectionString = needsSslMode ? 
    `${connectionString}?sslmode=require` : connectionString;
    
  return {
    connectionString: finalConnectionString,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : { rejectUnauthorized: false },
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
  };
};

const pool = new Pool(getDatabaseConfig());

export interface NewsEvent {
  id?: number;
  domain: string;
  event_date: string;
  headline: string;
  source_url?: string;
  event_type: string;
  sentiment_score?: number;
  detected_at?: Date;
}

export interface PerceptionCorrelation {
  id?: number;
  news_event_id: number;
  domain: string;
  model_name: string;
  before_score: number;
  after_score: number;
  days_delta: number;
  correlation_strength: number;
  measured_at?: Date;
}

export class NewsCorrelationDatabase {
  
  // Store detected news event with proper error handling
  async storeNewsEvent(event: NewsEvent): Promise<number | null> {
    try {
      // Validate required fields
      if (!event.domain || !event.event_date || !event.headline || !event.event_type) {
        throw new Error('Missing required fields: domain, event_date, headline, event_type');
      }
      
      const result = await pool.query(`
        INSERT INTO news_events (domain, event_date, headline, source_url, event_type, sentiment_score)
        VALUES ($1, $2, $3, $4, $5, $6)
        ON CONFLICT (domain, headline, event_date) DO NOTHING
        RETURNING id
      `, [
        event.domain,
        event.event_date,
        event.headline.slice(0, 500), // Truncate to prevent DB errors
        event.source_url,
        event.event_type,
        event.sentiment_score
      ]);
      
      return result.rows.length > 0 ? result.rows[0].id : null; // Handle conflict case
    } catch (error) {
      console.error('Failed to store news event:', error);
      throw new Error(`Database error storing news event: ${(error as Error).message}`);
    }
  }
  
  // Store perception correlation
  async storeCorrelation(correlation: PerceptionCorrelation): Promise<void> {
    await pool.query(`
      INSERT INTO perception_correlations 
      (news_event_id, domain, model_name, before_score, after_score, days_delta, correlation_strength)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
    `, [
      correlation.news_event_id,
      correlation.domain,
      correlation.model_name,
      correlation.before_score,
      correlation.after_score,
      correlation.days_delta,
      correlation.correlation_strength
    ]);
  }
  
  // Get domains to monitor (from JOLT tracking)
  async getMonitoredDomains(): Promise<string[]> {
    const result = await pool.query(`
      SELECT DISTINCT domain FROM domains 
      WHERE is_jolt = TRUE OR status = 'completed'
      ORDER BY domain
    `);
    
    return result.rows.map(row => row.domain);
  }
  
  // Get recent perception data for correlation
  async getRecentPerceptionData(domain: string, since: Date): Promise<any[]> {
    const result = await pool.query(`
      SELECT 
        domain, model_name, prompt_type, response_text, 
        created_at, cost, total_tokens
      FROM processed_domains 
      WHERE domain = $1 AND created_at >= $2
      ORDER BY created_at DESC
    `, [domain, since]);
    
    return result.rows;
  }
}

export const db = new NewsCorrelationDatabase();
export default pool; 