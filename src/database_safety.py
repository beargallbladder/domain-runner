"""
Database safety checks and connection handling
"""
import os
import psycopg2
from psycopg2.extras import RealDictCursor
import time
import logging

logger = logging.getLogger(__name__)

def wait_for_database(database_url: str, max_retries: int = 10, retry_delay: int = 5) -> bool:
    """
    Wait for database to be available before starting
    """
    for attempt in range(max_retries):
        try:
            conn = psycopg2.connect(database_url)
            conn.close()
            logger.info("Database connection successful")
            return True
        except psycopg2.OperationalError as e:
            if attempt < max_retries - 1:
                logger.warning(f"Database not ready (attempt {attempt + 1}/{max_retries}), waiting {retry_delay}s...")
                time.sleep(retry_delay)
            else:
                logger.error(f"Database connection failed after {max_retries} attempts: {e}")
                return False
    return False

def check_required_tables(database_url: str) -> dict:
    """
    Check if required tables exist
    """
    required_tables = [
        'domains',
        'domain_responses',
        'drift_scores',
        'responses_raw',
        'responses_normalized'
    ]

    missing_tables = []
    existing_tables = []

    try:
        conn = psycopg2.connect(database_url)
        with conn.cursor() as cursor:
            for table in required_tables:
                cursor.execute("""
                    SELECT EXISTS (
                        SELECT FROM information_schema.tables
                        WHERE table_name = %s
                    )
                """, (table,))
                exists = cursor.fetchone()[0]

                if exists:
                    existing_tables.append(table)
                else:
                    missing_tables.append(table)

        conn.close()

        return {
            "all_present": len(missing_tables) == 0,
            "existing": existing_tables,
            "missing": missing_tables
        }
    except Exception as e:
        logger.error(f"Failed to check tables: {e}")
        return {
            "all_present": False,
            "existing": [],
            "missing": required_tables,
            "error": str(e)
        }

def apply_migrations(database_url: str) -> bool:
    """
    Apply database migrations if tables are missing
    """
    table_check = check_required_tables(database_url)

    if table_check["all_present"]:
        logger.info("All required tables exist")
        return True

    logger.info(f"Missing tables: {table_check['missing']}")

    # Read migration file
    migration_file = os.path.join(
        os.path.dirname(os.path.dirname(__file__)),
        "migrations",
        "20250913_core_tables.sql"
    )

    if os.path.exists(migration_file):
        logger.info(f"Applying migrations from {migration_file}")
        try:
            with open(migration_file, 'r') as f:
                migration_sql = f.read()

            conn = psycopg2.connect(database_url)
            with conn.cursor() as cursor:
                cursor.execute(migration_sql)
                conn.commit()
            conn.close()

            logger.info("Migrations applied successfully")
            return True
        except Exception as e:
            logger.error(f"Failed to apply migrations: {e}")
            return False
    else:
        logger.warning(f"Migration file not found: {migration_file}")

        # Create minimal tables if migration file is missing
        try:
            conn = psycopg2.connect(database_url)
            with conn.cursor() as cursor:
                # Create domains table if missing
                if 'domains' in table_check['missing']:
                    cursor.execute("""
                        CREATE TABLE IF NOT EXISTS domains (
                            domain TEXT PRIMARY KEY,
                            category TEXT,
                            priority INTEGER DEFAULT 1,
                            active BOOLEAN DEFAULT true,
                            created_at TIMESTAMPTZ DEFAULT NOW()
                        )
                    """)

                # Create domain_responses table if missing
                if 'domain_responses' in table_check['missing']:
                    cursor.execute("""
                        CREATE TABLE IF NOT EXISTS domain_responses (
                            id SERIAL PRIMARY KEY,
                            domain TEXT NOT NULL,
                            llm_model TEXT,
                            llm_response TEXT,
                            timestamp TIMESTAMPTZ DEFAULT NOW(),
                            token_count INTEGER,
                            response_time_ms INTEGER,
                            status TEXT,
                            prompt_type TEXT,
                            embedding FLOAT[]
                        )
                    """)

                # Create drift_scores table if missing
                if 'drift_scores' in table_check['missing']:
                    cursor.execute("""
                        CREATE TABLE IF NOT EXISTS drift_scores (
                            drift_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                            domain TEXT NOT NULL,
                            prompt_id TEXT NOT NULL,
                            model TEXT NOT NULL,
                            ts_iso TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                            similarity_prev REAL NOT NULL,
                            drift_score REAL NOT NULL,
                            status TEXT NOT NULL CHECK (status IN ('stable','drifting','decayed')),
                            explanation TEXT
                        )
                    """)

                conn.commit()
                logger.info("Created minimal required tables")
                return True

            conn.close()
        except Exception as e:
            logger.error(f"Failed to create tables: {e}")
            return False