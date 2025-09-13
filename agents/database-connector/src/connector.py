#!/usr/bin/env python3
"""
Database Connector for Nexus/Ruvnet System
Integrates with existing PostgreSQL database for historical data and real-time operations.
"""

import os
import psycopg2
from psycopg2.extras import RealDictCursor
from psycopg2.pool import ThreadedConnectionPool
from datetime import datetime, timezone
from typing import Dict, List, Optional, Any, Tuple
import logging
import json

logger = logging.getLogger(__name__)

class DatabaseConnector:
    """
    PostgreSQL connector for the Nexus system.
    Handles all database operations with connection pooling and error handling.
    """

    def __init__(self, database_url: Optional[str] = None):
        """Initialize database connection pool"""
        self.database_url = database_url or os.getenv('DATABASE_URL')
        if not self.database_url:
            raise ValueError("DATABASE_URL not provided or found in environment")

        # Create connection pool
        self.pool = ThreadedConnectionPool(
            minconn=2,
            maxconn=20,
            dsn=self.database_url,
            cursor_factory=RealDictCursor
        )
        logger.info("Database connection pool initialized")

    def get_connection(self):
        """Get a connection from the pool"""
        return self.pool.getconn()

    def return_connection(self, conn):
        """Return a connection to the pool"""
        self.pool.putconn(conn)

    def execute_query(self, query: str, params: Optional[Tuple] = None) -> List[Dict]:
        """Execute a SELECT query and return results"""
        conn = None
        try:
            conn = self.get_connection()
            with conn.cursor() as cursor:
                cursor.execute(query, params)
                results = cursor.fetchall()
                return results
        except Exception as e:
            logger.error(f"Query execution failed: {e}")
            raise
        finally:
            if conn:
                self.return_connection(conn)

    def execute_write(self, query: str, params: Optional[Tuple] = None) -> int:
        """Execute an INSERT/UPDATE/DELETE query"""
        conn = None
        try:
            conn = self.get_connection()
            with conn.cursor() as cursor:
                cursor.execute(query, params)
                conn.commit()
                return cursor.rowcount
        except Exception as e:
            if conn:
                conn.rollback()
            logger.error(f"Write operation failed: {e}")
            raise
        finally:
            if conn:
                self.return_connection(conn)

    def get_domain_responses(
        self,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
        limit: int = 1000
    ) -> List[Dict]:
        """
        Fetch domain responses from the database.
        This is the main historical data source.
        """
        query = """
            SELECT
                dr.id,
                dr.domain,
                dr.llm_model,
                dr.llm_response,
                dr.timestamp,
                dr.token_count,
                dr.response_time_ms,
                dr.status,
                d.category,
                d.priority
            FROM domain_responses dr
            LEFT JOIN domains d ON dr.domain = d.domain
            WHERE 1=1
        """
        params = []

        if start_date:
            query += " AND dr.timestamp >= %s"
            params.append(start_date)

        if end_date:
            query += " AND dr.timestamp <= %s"
            params.append(end_date)

        query += " ORDER BY dr.timestamp DESC LIMIT %s"
        params.append(limit)

        return self.execute_query(query, tuple(params))

    def get_model_performance_stats(self) -> List[Dict]:
        """Get performance statistics by model"""
        query = """
            SELECT
                llm_model,
                COUNT(*) as total_calls,
                AVG(response_time_ms) as avg_response_time,
                AVG(token_count) as avg_tokens,
                SUM(CASE WHEN status = 'success' THEN 1 ELSE 0 END)::float / COUNT(*) as success_rate,
                MAX(timestamp) as last_used
            FROM domain_responses
            WHERE timestamp > NOW() - INTERVAL '7 days'
            GROUP BY llm_model
            ORDER BY total_calls DESC
        """
        return self.execute_query(query)

    def get_domain_coverage(self) -> Dict[str, Any]:
        """Calculate domain coverage metrics"""
        query = """
            WITH expected_domains AS (
                SELECT COUNT(DISTINCT domain) as total
                FROM domains
                WHERE active = true
            ),
            observed_domains AS (
                SELECT COUNT(DISTINCT domain) as total
                FROM domain_responses
                WHERE timestamp > NOW() - INTERVAL '24 hours'
                AND status = 'success'
            )
            SELECT
                ed.total as expected,
                od.total as observed,
                CASE
                    WHEN ed.total > 0
                    THEN od.total::float / ed.total
                    ELSE 0
                END as coverage
            FROM expected_domains ed, observed_domains od
        """
        result = self.execute_query(query)
        return result[0] if result else {'expected': 0, 'observed': 0, 'coverage': 0.0}

    def get_drift_signals(self, hours: int = 24) -> List[float]:
        """Get drift signals from recent responses"""
        query = """
            SELECT
                DATE_TRUNC('hour', timestamp) as hour,
                COUNT(*) as total,
                SUM(CASE WHEN status != 'success' THEN 1 ELSE 0 END) as failures
            FROM domain_responses
            WHERE timestamp > NOW() - INTERVAL '%s hours'
            GROUP BY hour
            ORDER BY hour
        """
        results = self.execute_query(query, (hours,))

        # Calculate drift signal for each hour
        signals = []
        for row in results:
            if row['total'] > 0:
                failure_rate = row['failures'] / row['total']
                signals.append(failure_rate)

        return signals

    def save_run_manifest(self, manifest: Dict) -> str:
        """Save a run manifest to the database"""
        query = """
            INSERT INTO run_manifests (
                run_id, window_start, window_end,
                expected_combos, observed_ok, observed_fail,
                coverage, tier, checkpoint_data, created_at
            ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            RETURNING id
        """

        params = (
            manifest['run_id'],
            manifest['window_start'],
            manifest['window_end'],
            manifest['target_combos'],
            manifest.get('observed_ok', 0),
            manifest.get('observed_fail', 0),
            manifest.get('coverage', 0.0),
            manifest.get('tier', 'Invalid'),
            json.dumps(manifest.get('checkpoint', {})),
            datetime.now(timezone.utc)
        )

        result = self.execute_query(query, params)
        return result[0]['id'] if result else None

    def get_provider_usage(self) -> Dict[str, Dict]:
        """Get provider usage statistics"""
        query = """
            SELECT
                CASE
                    WHEN llm_model LIKE 'gpt-%' THEN 'openai'
                    WHEN llm_model LIKE 'claude-%' THEN 'anthropic'
                    WHEN llm_model LIKE 'deepseek-%' THEN 'deepseek'
                    WHEN llm_model LIKE 'mistral-%' THEN 'mistral'
                    ELSE 'other'
                END as provider,
                COUNT(*) as total_calls,
                AVG(token_count) as avg_tokens,
                SUM(token_count) as total_tokens,
                AVG(response_time_ms) as avg_latency
            FROM domain_responses
            WHERE timestamp > NOW() - INTERVAL '24 hours'
            GROUP BY provider
        """
        results = self.execute_query(query)

        return {
            row['provider']: {
                'calls': row['total_calls'],
                'avg_tokens': round(row['avg_tokens'] or 0),
                'total_tokens': row['total_tokens'] or 0,
                'avg_latency': round(row['avg_latency'] or 0)
            }
            for row in results
        }

    def migrate_legacy_data(self, batch_size: int = 1000) -> Dict[str, int]:
        """
        Migrate legacy data to new format.
        This is what L1 Legacy Mapper should have done.
        """
        logger.info("Starting legacy data migration...")

        # Check if migration tables exist
        check_query = """
            SELECT COUNT(*) as count
            FROM information_schema.tables
            WHERE table_name = 'nexus_observations'
        """
        result = self.execute_query(check_query)

        if result[0]['count'] == 0:
            # Create nexus tables
            create_query = """
                CREATE TABLE IF NOT EXISTS nexus_observations (
                    id SERIAL PRIMARY KEY,
                    run_id VARCHAR(255),
                    domain VARCHAR(255),
                    prompt_id VARCHAR(255),
                    model VARCHAR(255),
                    status VARCHAR(50),
                    response_tokens INTEGER,
                    latency_ms INTEGER,
                    error TEXT,
                    created_at TIMESTAMPTZ DEFAULT NOW()
                );

                CREATE INDEX idx_nexus_obs_run ON nexus_observations(run_id);
                CREATE INDEX idx_nexus_obs_domain ON nexus_observations(domain);
                CREATE INDEX idx_nexus_obs_model ON nexus_observations(model);
            """
            self.execute_write(create_query)
            logger.info("Created nexus_observations table")

        # Migrate data in batches
        offset = 0
        total_migrated = 0

        while True:
            batch_query = """
                SELECT * FROM domain_responses
                ORDER BY timestamp
                LIMIT %s OFFSET %s
            """
            batch = self.execute_query(batch_query, (batch_size, offset))

            if not batch:
                break

            # Insert into nexus format
            for row in batch:
                insert_query = """
                    INSERT INTO nexus_observations (
                        run_id, domain, prompt_id, model, status,
                        response_tokens, latency_ms, created_at
                    ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                    ON CONFLICT DO NOTHING
                """
                params = (
                    f"legacy-{row['id']}",
                    row['domain'],
                    'legacy',
                    row['llm_model'],
                    row['status'],
                    row.get('token_count', 0),
                    row.get('response_time_ms', 0),
                    row['timestamp']
                )
                self.execute_write(insert_query, params)

            total_migrated += len(batch)
            offset += batch_size
            logger.info(f"Migrated {total_migrated} records...")

        return {
            'total_migrated': total_migrated,
            'status': 'complete'
        }

    def health_check(self) -> Dict[str, Any]:
        """Check database health"""
        try:
            query = "SELECT 1 as health, NOW() as timestamp"
            result = self.execute_query(query)

            # Get pool stats
            pool_stats = {
                'connections': len(self.pool._used),
                'available': len(self.pool._pool)
            }

            return {
                'healthy': True,
                'timestamp': result[0]['timestamp'],
                'pool_stats': pool_stats
            }
        except Exception as e:
            return {
                'healthy': False,
                'error': str(e),
                'timestamp': datetime.now(timezone.utc).isoformat()
            }

    def close(self):
        """Close all database connections"""
        if self.pool:
            self.pool.closeall()
            logger.info("Database connection pool closed")


def main():
    """Test database connector"""
    # Load environment variables
    from dotenv import load_dotenv
    load_dotenv()

    # Initialize connector
    db = DatabaseConnector()

    # Health check
    health = db.health_check()
    print(f"Database Health: {health}")

    # Get coverage
    coverage = db.get_domain_coverage()
    print(f"\nDomain Coverage: {coverage['coverage']:.1%}")
    print(f"  Expected: {coverage['expected']}")
    print(f"  Observed: {coverage['observed']}")

    # Get model stats
    stats = db.get_model_performance_stats()
    print(f"\nModel Performance:")
    for stat in stats[:5]:
        print(f"  {stat['llm_model']}: {stat['total_calls']} calls, {stat['success_rate']:.1%} success")

    # Get provider usage
    usage = db.get_provider_usage()
    print(f"\nProvider Usage:")
    for provider, data in usage.items():
        print(f"  {provider}: {data['calls']} calls, {data['total_tokens']} tokens")

    # Close connections
    db.close()


if __name__ == "__main__":
    main()