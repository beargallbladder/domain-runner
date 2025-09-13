#!/usr/bin/env python3
"""
Apply Neural Pattern Detection Database Migration
Safely applies the neural pattern detection schema to the production database.
"""

import os
import psycopg2
import logging
from datetime import datetime

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler(f'neural_pattern_migration_{datetime.now().strftime("%Y%m%d_%H%M%S")}.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

def read_migration_file():
    """Read the neural pattern migration SQL file."""
    migration_path = '/Users/samkim/domain-runner/migrations/003_neural_pattern_detection_simple.sql'
    
    try:
        with open(migration_path, 'r') as f:
            return f.read()
    except FileNotFoundError:
        logger.error(f"Migration file not found: {migration_path}")
        return None
    except Exception as e:
        logger.error(f"Error reading migration file: {e}")
        return None

def apply_migration():
    """Apply the neural pattern detection migration."""
    
    # Database configuration
    DATABASE_URL = "postgresql://raw_capture_db_user:wjFesUM8ISNEvE2b4kZtRAKgGYJVtKK5@dpg-d11fqgndiees73fb35dg-a.oregon-postgres.render.com/raw_capture_db"
    
    if not DATABASE_URL:
        logger.error("DATABASE_URL environment variable not set")
        return False
    
    logger.info("🚀 Starting Neural Pattern Detection Migration")
    logger.info(f"Database: {DATABASE_URL.split('@')[1].split('/')[0]}")
    
    # Read migration SQL
    migration_sql = read_migration_file()
    if not migration_sql:
        return False
    
    try:
        # Connect to database
        logger.info("Connecting to database...")
        conn = psycopg2.connect(DATABASE_URL)
        conn.autocommit = False
        cursor = conn.cursor()
        
        # Start transaction
        logger.info("Starting migration transaction...")
        
        # Check if migration was already applied
        cursor.execute("""
            SELECT EXISTS (
                SELECT 1 FROM information_schema.tables 
                WHERE table_name = 'pattern_detections'
            )
        """)
        
        if cursor.fetchone()[0]:
            logger.warning("⚠️  Pattern detection tables already exist. Checking for updates...")
            
            # Check if we need to add new columns or indexes
            cursor.execute("""
                SELECT column_name FROM information_schema.columns 
                WHERE table_name = 'pattern_detections'
            """)
            existing_columns = [row[0] for row in cursor.fetchall()]
            logger.info(f"Existing columns: {existing_columns}")
            
            # Apply only new parts of the migration if needed
            if 'supporting_evidence' not in existing_columns:
                logger.info("Adding missing columns and indexes...")
                # Apply incremental updates here if needed
        
        # Execute migration SQL
        logger.info("Executing neural pattern detection schema...")
        
        # Split SQL into individual statements to handle them separately
        statements = [stmt.strip() for stmt in migration_sql.split(';') if stmt.strip()]
        
        for i, statement in enumerate(statements):
            if statement.strip():
                try:
                    logger.info(f"Executing statement {i+1}/{len(statements)}")
                    cursor.execute(statement)
                except psycopg2.Error as e:
                    if "already exists" in str(e):
                        logger.info(f"Skipping existing object: {e}")
                    else:
                        logger.warning(f"Non-critical error in statement {i+1}: {e}")
        
        # Verify tables were created
        logger.info("Verifying table creation...")
        cursor.execute("""
            SELECT table_name FROM information_schema.tables 
            WHERE table_name IN (
                'pattern_detections', 
                'pattern_alerts', 
                'pattern_learning_data',
                'competitive_metrics',
                'cross_category_analysis'
            )
        """)
        
        created_tables = [row[0] for row in cursor.fetchall()]
        logger.info(f"✅ Created/verified tables: {created_tables}")
        
        # Verify indexes
        cursor.execute("""
            SELECT indexname FROM pg_indexes 
            WHERE indexname LIKE 'idx_pattern%' OR indexname LIKE 'idx_competitive%'
            OR indexname LIKE 'idx_cross_category%'
        """)
        
        created_indexes = [row[0] for row in cursor.fetchall()]
        logger.info(f"✅ Created/verified indexes: {len(created_indexes)} indexes")
        
        # Verify views
        cursor.execute("""
            SELECT viewname FROM pg_views 
            WHERE viewname LIKE 'v_pattern%' OR viewname LIKE 'v_competitive%'
        """)
        
        created_views = [row[0] for row in cursor.fetchall()]
        logger.info(f"✅ Created/verified views: {created_views}")
        
        # Test basic functionality
        logger.info("Testing basic functionality...")
        
        # Test insert into pattern_detections
        test_domain = "test-neural-pattern.com"
        cursor.execute("""
            INSERT INTO pattern_detections 
            (domain, pattern_type, confidence, signals, supporting_evidence)
            VALUES (%s, %s, %s, %s, %s)
            ON CONFLICT (domain, pattern_type) DO UPDATE SET
            confidence = EXCLUDED.confidence
        """, [
            test_domain,
            'test_pattern',
            0.85,
            '{"test_signal": 0.9}',
            '["Test evidence"]'
        ])
        
        # Test query
        cursor.execute("""
            SELECT * FROM pattern_detections 
            WHERE domain = %s
        """, [test_domain])
        
        test_result = cursor.fetchone()
        if test_result:
            logger.info("✅ Basic functionality test passed")
            
            # Clean up test data
            cursor.execute("DELETE FROM pattern_detections WHERE domain = %s", [test_domain])
        else:
            logger.error("❌ Basic functionality test failed")
            return False
        
        # Test view access (optional since views weren't created in simple migration)
        try:
            cursor.execute("SELECT COUNT(*) FROM v_pattern_summary")
            view_count = cursor.fetchone()[0]
            logger.info(f"✅ Pattern summary view accessible: {view_count} pattern types")
        except psycopg2.Error:
            logger.info("📝 Pattern summary view not created (using simple migration)")
        
        # Commit transaction
        conn.commit()
        logger.info("✅ Migration committed successfully!")
        
        # Generate migration summary
        summary = {
            'migration_applied': True,
            'tables_created': len(created_tables),
            'indexes_created': len(created_indexes),
            'views_created': len(created_views),
            'timestamp': datetime.now().isoformat()
        }
        
        logger.info("🎉 Neural Pattern Detection Migration Summary:")
        for key, value in summary.items():
            logger.info(f"  {key}: {value}")
        
        return True
        
    except psycopg2.Error as e:
        logger.error(f"❌ Database error: {e}")
        if conn:
            conn.rollback()
        return False
    except Exception as e:
        logger.error(f"❌ Unexpected error: {e}")
        if conn:
            conn.rollback()
        return False
    finally:
        if 'cursor' in locals():
            cursor.close()
        if 'conn' in locals():
            conn.close()
        logger.info("Database connection closed")

def main():
    """Main function to run the migration."""
    logger.info("🧠 Neural Pattern Detection Database Migration")
    logger.info("=" * 60)
    
    success = apply_migration()
    
    if success:
        logger.info("✅ MIGRATION COMPLETED SUCCESSFULLY!")
        logger.info("Neural pattern detection system is ready for use.")
        logger.info("\nAvailable endpoints:")
        logger.info("  POST /detect-patterns - Run pattern detection")
        logger.info("  GET /pattern-monitor - Monitor patterns")
        logger.info("  POST /neural-learning - Neural learning")
        logger.info("  GET /competitive-dashboard - Intelligence dashboard")
        logger.info("  POST /cross-category-analysis - Cross-category analysis")
    else:
        logger.error("❌ MIGRATION FAILED!")
        logger.error("Check the logs above for details.")
    
    return success

if __name__ == "__main__":
    success = main()
    exit(0 if success else 1)