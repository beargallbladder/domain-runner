#!/usr/bin/env python3
"""
API Log Maintenance Script
Handles log rotation, cleanup, and summary generation
"""

import asyncio
import asyncpg
import os
import sys
from datetime import datetime, timedelta
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class LogMaintenance:
    def __init__(self, database_url: str):
        self.database_url = database_url
        
    async def run_maintenance(self):
        """Run all maintenance tasks"""
        conn = await asyncpg.connect(self.database_url)
        
        try:
            # 1. Archive old logs
            archived_count = await self.archive_old_logs(conn)
            logger.info(f"Archived {archived_count} old log entries")
            
            # 2. Generate missing summaries
            summary_count = await self.generate_missing_summaries(conn)
            logger.info(f"Generated {summary_count} missing usage summaries")
            
            # 3. Clean up orphaned data
            cleanup_count = await self.cleanup_orphaned_data(conn)
            logger.info(f"Cleaned up {cleanup_count} orphaned records")
            
            # 4. Update statistics
            await self.update_statistics(conn)
            logger.info("Updated database statistics")
            
            # 5. Generate maintenance report
            report = await self.generate_report(conn)
            print("\n" + "=" * 60)
            print("📊 API LOG MAINTENANCE REPORT")
            print("=" * 60)
            print(report)
            
        finally:
            await conn.close()
    
    async def archive_old_logs(self, conn: asyncpg.Connection) -> int:
        """Archive logs older than 90 days"""
        cutoff_date = datetime.utcnow().date() - timedelta(days=90)
        
        # Count logs to archive
        count = await conn.fetchval("""
            SELECT COUNT(*) FROM api_key_usage_log 
            WHERE created_date < $1
        """, cutoff_date)
        
        if count > 0:
            # Archive the logs
            await conn.execute("""
                INSERT INTO api_key_usage_log_archive 
                SELECT * FROM api_key_usage_log 
                WHERE created_date < $1
                ON CONFLICT DO NOTHING
            """, cutoff_date)
            
            # Delete archived logs
            await conn.execute("""
                DELETE FROM api_key_usage_log 
                WHERE created_date < $1
            """, cutoff_date)
            
        return count
    
    async def generate_missing_summaries(self, conn: asyncpg.Connection) -> int:
        """Generate any missing daily summaries"""
        # Find dates with logs but no summaries
        missing_dates = await conn.fetch("""
            SELECT DISTINCT l.created_date, l.api_key_id, l.user_id
            FROM api_key_usage_log l
            LEFT JOIN api_usage_summary s 
                ON l.created_date = s.summary_date 
                AND l.api_key_id = s.api_key_id
            WHERE s.id IS NULL
            AND l.created_date >= CURRENT_DATE - INTERVAL '30 days'
        """)
        
        for row in missing_dates:
            await self._generate_summary_for_date(
                conn, 
                row['api_key_id'], 
                row['user_id'], 
                row['created_date']
            )
        
        return len(missing_dates)
    
    async def _generate_summary_for_date(
        self, 
        conn: asyncpg.Connection, 
        api_key_id: str, 
        user_id: str, 
        date: datetime.date
    ):
        """Generate summary for a specific date and API key"""
        stats = await conn.fetchrow("""
            SELECT 
                COUNT(*) as total_requests,
                COUNT(*) FILTER (WHERE status_code < 400) as successful_requests,
                COUNT(*) FILTER (WHERE status_code >= 400) as failed_requests,
                AVG(response_time_ms)::integer as avg_response_time_ms,
                PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY response_time_ms)::integer as p95_response_time_ms,
                PERCENTILE_CONT(0.99) WITHIN GROUP (ORDER BY response_time_ms)::integer as p99_response_time_ms,
                SUM(request_body_size) as total_request_bytes,
                SUM(response_size) as total_response_bytes
            FROM api_key_usage_log
            WHERE api_key_id = $1 AND created_date = $2
        """, api_key_id, date)
        
        # Get endpoint usage
        endpoint_usage = await conn.fetch("""
            SELECT endpoint, COUNT(*) as count
            FROM api_key_usage_log
            WHERE api_key_id = $1 AND created_date = $2
            GROUP BY endpoint
        """, api_key_id, date)
        
        endpoint_dict = {row['endpoint']: row['count'] for row in endpoint_usage}
        
        # Get error types
        error_types = await conn.fetch("""
            SELECT error_message, COUNT(*) as count
            FROM api_key_usage_log
            WHERE api_key_id = $1 AND created_date = $2 AND error_message IS NOT NULL
            GROUP BY error_message
        """, api_key_id, date)
        
        error_dict = {row['error_message']: row['count'] for row in error_types}
        
        # Insert summary
        await conn.execute("""
            INSERT INTO api_usage_summary (
                api_key_id, user_id, summary_date,
                total_requests, successful_requests, failed_requests,
                avg_response_time_ms, p95_response_time_ms, p99_response_time_ms,
                total_request_bytes, total_response_bytes,
                endpoint_usage, error_count, error_types
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
            ON CONFLICT (api_key_id, summary_date) DO NOTHING
        """, 
            api_key_id, user_id, date,
            stats['total_requests'], stats['successful_requests'], stats['failed_requests'],
            stats['avg_response_time_ms'], stats['p95_response_time_ms'], stats['p99_response_time_ms'],
            stats['total_request_bytes'] or 0, stats['total_response_bytes'] or 0,
            endpoint_dict, len(error_dict), error_dict
        )
    
    async def cleanup_orphaned_data(self, conn: asyncpg.Connection) -> int:
        """Clean up orphaned data"""
        # Remove logs for deleted API keys older than 30 days
        count = await conn.fetchval("""
            DELETE FROM api_key_usage_log 
            WHERE api_key_id IS NULL 
            AND created_date < CURRENT_DATE - INTERVAL '30 days'
            RETURNING *
        """)
        
        return count or 0
    
    async def update_statistics(self, conn: asyncpg.Connection):
        """Update database statistics for query optimization"""
        await conn.execute("ANALYZE api_key_usage_log;")
        await conn.execute("ANALYZE api_usage_summary;")
        await conn.execute("ANALYZE api_key_usage_log_archive;")
    
    async def generate_report(self, conn: asyncpg.Connection) -> str:
        """Generate maintenance report"""
        # Get current stats
        main_table_stats = await conn.fetchrow("""
            SELECT 
                COUNT(*) as total_logs,
                MIN(created_date) as oldest_log,
                MAX(created_date) as newest_log,
                pg_size_pretty(pg_total_relation_size('api_key_usage_log')) as table_size
            FROM api_key_usage_log
        """)
        
        archive_stats = await conn.fetchrow("""
            SELECT 
                COUNT(*) as total_logs,
                MIN(created_date) as oldest_log,
                MAX(created_date) as newest_log,
                pg_size_pretty(pg_total_relation_size('api_key_usage_log_archive')) as table_size
            FROM api_key_usage_log_archive
        """)
        
        summary_stats = await conn.fetchrow("""
            SELECT 
                COUNT(*) as total_summaries,
                COUNT(DISTINCT api_key_id) as unique_api_keys,
                MIN(summary_date) as oldest_summary,
                MAX(summary_date) as newest_summary,
                pg_size_pretty(pg_total_relation_size('api_usage_summary')) as table_size
            FROM api_usage_summary
        """)
        
        # Get usage stats for last 7 days
        recent_usage = await conn.fetchrow("""
            SELECT 
                COUNT(*) as total_requests,
                COUNT(DISTINCT api_key_id) as active_keys,
                AVG(response_time_ms)::integer as avg_response_time,
                COUNT(*) FILTER (WHERE status_code >= 400)::float / COUNT(*)::float * 100 as error_rate
            FROM api_key_usage_log
            WHERE created_date >= CURRENT_DATE - INTERVAL '7 days'
        """)
        
        report = f"""
📅 Report Generated: {datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S UTC')}

📊 MAIN LOG TABLE (api_key_usage_log):
   - Total Logs: {main_table_stats['total_logs']:,}
   - Date Range: {main_table_stats['oldest_log']} to {main_table_stats['newest_log']}
   - Table Size: {main_table_stats['table_size']}

🗄️  ARCHIVE TABLE (api_key_usage_log_archive):
   - Total Logs: {archive_stats['total_logs']:,}
   - Date Range: {archive_stats['oldest_log'] or 'N/A'} to {archive_stats['newest_log'] or 'N/A'}
   - Table Size: {archive_stats['table_size']}

📈 SUMMARY TABLE (api_usage_summary):
   - Total Summaries: {summary_stats['total_summaries']:,}
   - Unique API Keys: {summary_stats['unique_api_keys']}
   - Date Range: {summary_stats['oldest_summary'] or 'N/A'} to {summary_stats['newest_summary'] or 'N/A'}
   - Table Size: {summary_stats['table_size']}

🚀 LAST 7 DAYS ACTIVITY:
   - Total Requests: {recent_usage['total_requests']:,}
   - Active API Keys: {recent_usage['active_keys']}
   - Avg Response Time: {recent_usage['avg_response_time']}ms
   - Error Rate: {recent_usage['error_rate']:.2f}%

💾 TOTAL DATABASE SPACE USED:
   - All logging tables combined
"""
        
        return report

async def main():
    """Main entry point"""
    database_url = os.environ.get('DATABASE_URL')
    if not database_url:
        print("❌ ERROR: DATABASE_URL environment variable not set")
        sys.exit(1)
    
    print("🔧 Starting API Log Maintenance...")
    
    maintenance = LogMaintenance(database_url)
    await maintenance.run_maintenance()
    
    print("\n✅ Maintenance completed successfully!")

if __name__ == "__main__":
    asyncio.run(main())