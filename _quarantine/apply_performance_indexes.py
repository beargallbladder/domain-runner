#!/usr/bin/env python3
"""
🚀 Performance Index Application Script
Applies performance indexes outside of transactions for DATABASE_URL
"""

import os
import asyncpg
import asyncio
import time

async def apply_performance_indexes():
    """Apply performance indexes that require CONCURRENTLY"""
    
    database_url = os.getenv('DATABASE_URL', "postgresql://raw_capture_db_user:wjFesUM8ISNEvE2b4kZtRAKgGYJVtKK5@dpg-d11fqgndiees73fb35dg-a.oregon-postgres.render.com/raw_capture_db")
    
    print("🚀 APPLYING PERFORMANCE INDEXES")
    print("=" * 50)
    
    try:
        conn = await asyncpg.connect(database_url)
        print("✅ Connected to database")
        
        # List of indexes to create (must be run individually, not in transactions)
        indexes = [
            ("idx_domains_status_source_created", """
                CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_domains_status_source_created
                  ON domains(status, source, created_at) 
                  WHERE status = 'pending'
            """),
            ("idx_domains_processing_lookup", """
                CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_domains_processing_lookup
                  ON domains(status, created_at) 
                  WHERE status IN ('pending', 'processing')
            """),
            ("idx_domains_last_processed", """
                CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_domains_last_processed
                  ON domains(last_processed_at) 
                  WHERE status = 'pending'
            """),
            ("idx_domains_priority_status_v2", """
                CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_domains_priority_status_v2
                    ON domains(priority DESC, status, created_at)
            """),
            ("idx_domains_jolt_v2", """
                CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_domains_jolt_v2
                    ON domains(is_jolt) 
                    WHERE is_jolt = true
            """),
            ("idx_domains_cohort_status_v2", """
                CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_domains_cohort_status_v2
                    ON domains(cohort, status)
            """),
            ("idx_domains_discovery_v2", """
                CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_domains_discovery_v2
                    ON domains(discovery_source)
            """),
            ("idx_domains_domain_lookup", """
                CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_domains_domain_lookup
                  ON domains(domain) 
                  WHERE status = 'completed'
            """)
        ]
        
        success_count = 0
        total_count = len(indexes)
        
        for index_name, index_sql in indexes:
            try:
                print(f"🔨 Creating index: {index_name}")
                await conn.execute(index_sql.strip())
                print(f"✅ Index {index_name} created successfully")
                success_count += 1
            except Exception as e:
                if "already exists" in str(e):
                    print(f"⚠️  Index {index_name} already exists")
                    success_count += 1
                else:
                    print(f"❌ Failed to create index {index_name}: {e}")
        
        # Update statistics
        print("\n📊 Updating table statistics...")
        await conn.execute("ANALYZE domains")
        await conn.execute("ANALYZE domain_responses")
        print("✅ Statistics updated")
        
        # Verify indexes
        print("\n🔍 Verifying index creation...")
        indexes_result = await conn.fetch("""
            SELECT indexname, indexdef 
            FROM pg_indexes 
            WHERE tablename IN ('domains', 'domain_responses')
            AND indexname LIKE 'idx_%'
            ORDER BY indexname
        """)
        
        print(f"📈 Found {len(indexes_result)} performance indexes:")
        for idx in indexes_result:
            print(f"  ✅ {idx['indexname']}")
        
        await conn.close()
        
        print(f"\n🎉 Performance index application completed!")
        print(f"   Successfully applied: {success_count}/{total_count} indexes")
        
        return True
        
    except Exception as e:
        print(f"❌ Error applying performance indexes: {e}")
        return False

if __name__ == "__main__":
    start_time = time.time()
    success = asyncio.run(apply_performance_indexes())
    end_time = time.time()
    
    print(f"\n⏱️  Index application completed in {end_time - start_time:.2f} seconds")
    if success:
        print("🚀 All performance optimizations applied!")
    else:
        print("💥 Some indexes failed to apply")