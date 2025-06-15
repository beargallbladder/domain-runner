import { Pool } from 'pg';
import * as dotenv from 'dotenv';

dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgres://localhost:5432/raw_capture_test',
  ssl: process.env.NODE_ENV === 'production' ? {
    rejectUnauthorized: false
  } : false
});

interface Metrics {
  total_responses: number;
  total_tokens: number;
  total_chars: number;
  avg_tokens_per_response: number;
  avg_response_time_ms: number;
  error_count: number;
  start_time: Date;
}

let metrics: Metrics = {
  total_responses: 0,
  total_tokens: 0,
  total_chars: 0,
  avg_tokens_per_response: 0,
  avg_response_time_ms: 0,
  error_count: 0,
  start_time: new Date()
};

export function incrementResponses(tokens: number, chars: number, responseTime: number) {
  metrics.total_responses++;
  metrics.total_tokens += tokens;
  metrics.total_chars += chars;
  metrics.avg_tokens_per_response = metrics.total_tokens / metrics.total_responses;
  metrics.avg_response_time_ms = ((metrics.avg_response_time_ms * (metrics.total_responses - 1)) + responseTime) / metrics.total_responses;
}

export function incrementErrors() {
  metrics.error_count++;
}

export async function getStorageMetrics(): Promise<{
  db_size: string;
  total_responses: number;
  total_chars: number;
}> {
  const result = await pool.query(`
    SELECT 
      pg_size_pretty(pg_database_size('raw_capture_test')) as db_size,
      COUNT(*) as total_responses,
      SUM(length(raw_response)) as total_chars
    FROM responses;
  `);
  return result.rows[0];
}

export async function getDailyStats(): Promise<{
  responses_today: number;
  avg_tokens_today: number;
  errors_today: number;
}> {
  const result = await pool.query(`
    SELECT 
      COUNT(*) as responses_today,
      AVG(token_count) as avg_tokens_today,
      SUM(CASE WHEN token_count IS NULL THEN 1 ELSE 0 END) as errors_today
    FROM responses 
    WHERE captured_at::date = CURRENT_DATE;
  `);
  return result.rows[0];
}

export function getRunTimeMetrics(): Metrics {
  return {
    ...metrics,
    avg_tokens_per_response: Math.round(metrics.avg_tokens_per_response * 100) / 100,
    avg_response_time_ms: Math.round(metrics.avg_response_time_ms)
  };
}

export async function logMetrics() {
  const storage = await getStorageMetrics();
  const daily = await getDailyStats();
  const runtime = getRunTimeMetrics();
  
  console.log('\n=== Metrics Report ===');
  console.log('Storage:');
  console.log(`- Database Size: ${storage.db_size}`);
  console.log(`- Total Responses: ${storage.total_responses}`);
  console.log(`- Total Characters: ${storage.total_chars}`);
  
  console.log('\nToday\'s Stats:');
  console.log(`- Responses: ${daily.responses_today}`);
  console.log(`- Average Tokens: ${Math.round(daily.avg_tokens_today)}`);
  console.log(`- Errors: ${daily.errors_today}`);
  
  console.log('\nRuntime Stats:');
  console.log(`- Running since: ${runtime.start_time.toISOString()}`);
  console.log(`- Responses processed: ${runtime.total_responses}`);
  console.log(`- Average tokens: ${runtime.avg_tokens_per_response}`);
  console.log(`- Average response time: ${runtime.avg_response_time_ms}ms`);
  console.log(`- Errors: ${runtime.error_count}`);
  console.log('=====================\n');
} 