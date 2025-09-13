#!/usr/bin/env python3
"""
Apply API Request Logging Migration
Creates all necessary tables and views for comprehensive request logging
"""

import asyncio
import asyncpg
import os
import sys
from datetime import datetime

async def apply_migration():
    """Apply the logging migration to the database"""
    
    # Get database URL from environment
    database_url = os.environ.get('DATABASE_URL')
    if not database_url:
        print("❌ ERROR: DATABASE_URL environment variable not set")
        sys.exit(1)
    
    print(f"📊 Connecting to database...")
    
    try:
        # Connect to database
        conn = await asyncpg.connect(database_url)
        
        # Read migration file
        with open('api_request_logging_migration.sql', 'r') as f:
            migration_sql = f.read()
        
        print("🔧 Applying logging migration...")
        
        # Execute migration
        await conn.execute(migration_sql)
        
        # Verify tables were created
        tables = await conn.fetch("""
            SELECT tablename 
            FROM pg_tables 
            WHERE schemaname = 'public' 
            AND tablename IN ('api_key_usage_log', 'api_usage_summary', 'api_key_usage_log_archive')
        """)
        
        print("\n✅ Created tables:")
        for table in tables:
            print(f"   - {table['tablename']}")
        
        # Check indexes
        indexes = await conn.fetch("""
            SELECT indexname 
            FROM pg_indexes 
            WHERE schemaname = 'public' 
            AND tablename IN ('api_key_usage_log', 'api_usage_summary')
        """)
        
        print(f"\n📑 Created {len(indexes)} indexes for performance optimization")
        
        # Check views
        views = await conn.fetch("""
            SELECT viewname 
            FROM pg_views 
            WHERE schemaname = 'public' 
            AND viewname IN ('v_daily_api_usage', 'v_endpoint_usage')
        """)
        
        print(f"\n👁️  Created {len(views)} analytics views")
        
        # Get table sizes
        print("\n📊 Table information:")
        for table_name in ['api_key_usage_log', 'api_usage_summary', 'api_key_usage_log_archive']:
            size_info = await conn.fetchrow(f"""
                SELECT 
                    pg_size_pretty(pg_total_relation_size('{table_name}')) as total_size,
                    (SELECT COUNT(*) FROM {table_name}) as row_count
            """)
            if size_info:
                print(f"   - {table_name}: {size_info['row_count']} rows, {size_info['total_size']}")
        
        print("\n✅ Logging migration completed successfully!")
        print("\n📋 Next steps:")
        print("   1. Restart the API service to enable request logging")
        print("   2. All API requests will now be logged automatically")
        print("   3. Access usage analytics at /api/usage endpoints")
        print("   4. Monitor logs will be automatically archived after 90 days")
        
        await conn.close()
        
    except Exception as e:
        print(f"\n❌ Migration failed: {e}")
        sys.exit(1)

if __name__ == "__main__":
    print("🚀 API Request Logging Migration Tool")
    print("=" * 50)
    asyncio.run(apply_migration())