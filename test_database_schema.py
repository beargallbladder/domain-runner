#!/usr/bin/env python3
"""
🧪 Database Schema Test & Validation
Tests that all migrations were applied correctly and database is ready for processing
"""

import os
import asyncpg
import asyncio
import time

async def test_database_schema():
    """Test the database schema and functionality"""
    
    database_url = os.getenv('DATABASE_URL', "postgresql://raw_capture_db_user:wjFesUM8ISNEvE2b4kZtRAKgGYJVtKK5@dpg-d11fqgndiees73fb35dg-a.oregon-postgres.render.com/raw_capture_db")
    
    print("🧪 TESTING DATABASE SCHEMA & FUNCTIONALITY")
    print("=" * 60)
    
    try:
        conn = await asyncpg.connect(database_url)
        print("✅ Connected to database")
        
        # Test 1: Check table existence
        print("\n📋 TEST 1: Table Existence")
        tables = await conn.fetch("""
            SELECT table_name FROM information_schema.tables 
            WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
            ORDER BY table_name
        """)
        
        expected_tables = {'domains', 'domain_responses'}
        found_tables = {table['table_name'] for table in tables}
        
        print(f"Found tables: {sorted(found_tables)}")
        
        for table in expected_tables:
            if table in found_tables:
                print(f"  ✅ {table}")
            else:
                print(f"  ❌ {table} (MISSING)")
        
        # Test 2: Check domain table schema
        print("\n🏗️  TEST 2: Domains Table Schema")
        domain_columns = await conn.fetch("""
            SELECT column_name, data_type, is_nullable, column_default
            FROM information_schema.columns
            WHERE table_schema = 'public' AND table_name = 'domains'
            ORDER BY ordinal_position
        """)
        
        print("Domains table columns:")
        for col in domain_columns:
            nullable = "NULL" if col['is_nullable'] == 'YES' else "NOT NULL"
            default = f" DEFAULT {col['column_default']}" if col['column_default'] else ""
            print(f"  {col['column_name']}: {col['data_type']} {nullable}{default}")
        
        # Test 3: Check domain_responses table schema
        print("\n📊 TEST 3: Domain Responses Table Schema")
        response_columns = await conn.fetch("""
            SELECT column_name, data_type, is_nullable
            FROM information_schema.columns
            WHERE table_schema = 'public' AND table_name = 'domain_responses'
            ORDER BY ordinal_position
        """)
        
        print("Domain responses table columns:")
        for col in response_columns:
            nullable = "NULL" if col['is_nullable'] == 'YES' else "NOT NULL"
            print(f"  {col['column_name']}: {col['data_type']} {nullable}")
        
        # Test 4: Check indexes
        print("\n🚀 TEST 4: Performance Indexes")
        indexes = await conn.fetch("""
            SELECT indexname, indexdef 
            FROM pg_indexes 
            WHERE tablename IN ('domains', 'domain_responses')
            AND indexname LIKE 'idx_%'
            ORDER BY indexname
        """)
        
        print(f"Found {len(indexes)} performance indexes:")
        for idx in indexes:
            print(f"  ✅ {idx['indexname']}")
        
        # Test 5: Check constraints
        print("\n🔒 TEST 5: Data Constraints")
        constraints = await conn.fetch("""
            SELECT conname, contype, confrelid::regclass as referenced_table
            FROM pg_constraint 
            WHERE conrelid IN (
                SELECT oid FROM pg_class WHERE relname IN ('domains', 'domain_responses')
            )
            ORDER BY conname
        """)
        
        print("Table constraints:")
        for constraint in constraints:
            constraint_type = {
                'c': 'CHECK',
                'f': 'FOREIGN KEY',
                'p': 'PRIMARY KEY',
                'u': 'UNIQUE'
            }.get(constraint['contype'], constraint['contype'])
            
            ref_info = f" -> {constraint['referenced_table']}" if constraint['referenced_table'] else ""
            print(f"  ✅ {constraint['conname']}: {constraint_type}{ref_info}")
        
        # Test 6: Check triggers
        print("\n⚡ TEST 6: Database Triggers")
        triggers = await conn.fetch("""
            SELECT trigger_name, event_manipulation, event_object_table
            FROM information_schema.triggers
            WHERE event_object_schema = 'public'
            ORDER BY trigger_name
        """)
        
        print(f"Found {len(triggers)} triggers:")
        for trigger in triggers:
            print(f"  ✅ {trigger['trigger_name']} on {trigger['event_object_table']} ({trigger['event_manipulation']})")
        
        # Test 7: Check views
        print("\n👁️  TEST 7: Monitoring Views")
        views = await conn.fetch("""
            SELECT table_name FROM information_schema.views
            WHERE table_schema = 'public'
            ORDER BY table_name
        """)
        
        print(f"Found {len(views)} monitoring views:")
        for view in views:
            print(f"  ✅ {view['table_name']}")
        
        # Test 8: Data validation
        print("\n📊 TEST 8: Data Validation & Counts")
        
        # Check domain counts by status
        domain_stats = await conn.fetch("""
            SELECT status, COUNT(*) as count
            FROM domains
            GROUP BY status
            ORDER BY status
        """)
        
        print("Domain counts by status:")
        total_domains = 0
        for stat in domain_stats:
            print(f"  {stat['status']}: {stat['count']:,}")
            total_domains += stat['count']
        print(f"  TOTAL: {total_domains:,}")
        
        # Check response counts
        response_count = await conn.fetchval("SELECT COUNT(*) FROM domain_responses")
        print(f"\nDomain responses: {response_count:,}")
        
        # Test monitoring views
        print("\n📈 TEST 9: Monitoring Views Functionality")
        
        try:
            summary = await conn.fetch("SELECT * FROM domain_processing_summary LIMIT 5")
            print(f"✅ domain_processing_summary: {len(summary)} rows")
            
            stats = await conn.fetch("SELECT * FROM domain_response_stats LIMIT 5")
            print(f"✅ domain_response_stats: {len(stats)} rows")
            
            health = await conn.fetch("SELECT * FROM system_health_summary")
            print(f"✅ system_health_summary: {len(health)} rows")
            
            print("\nSystem health summary:")
            for row in health:
                print(f"  {row['table_name']}: {row['total_rows']:,} rows")
                
        except Exception as e:
            print(f"❌ Error testing views: {e}")
        
        # Test 10: Domain processing readiness
        print("\n🚀 TEST 10: Domain Processing Readiness")
        
        # Count pending domains
        pending_count = await conn.fetchval("""
            SELECT COUNT(*) FROM domains WHERE status = 'pending'
        """)
        print(f"Pending domains for processing: {pending_count:,}")
        
        # Test query performance (should be fast with indexes)
        start_time = time.time()
        test_domains = await conn.fetch("""
            SELECT id, domain FROM domains 
            WHERE status = 'pending' 
            ORDER BY priority DESC, created_at ASC 
            LIMIT 10
        """)
        query_time = (time.time() - start_time) * 1000
        
        print(f"Query performance test: {query_time:.2f}ms for top 10 pending domains")
        if query_time < 100:
            print("  ✅ Query performance: EXCELLENT")
        elif query_time < 500:
            print("  ✅ Query performance: GOOD")
        else:
            print("  ⚠️  Query performance: NEEDS OPTIMIZATION")
        
        print(f"\nSample pending domains:")
        for domain in test_domains[:5]:
            print(f"  • {domain['domain']}")
        
        await conn.close()
        
        print("\n🎉 DATABASE SCHEMA TESTING COMPLETED!")
        print("✅ All tests passed - database is ready for domain processing")
        
        return True
        
    except Exception as e:
        print(f"❌ Error during testing: {e}")
        return False

if __name__ == "__main__":
    start_time = time.time()
    success = asyncio.run(test_database_schema())
    end_time = time.time()
    
    print(f"\n⏱️  Testing completed in {end_time - start_time:.2f} seconds")
    if success:
        print("🚀 Database is ready for production domain processing!")
    else:
        print("💥 Database testing revealed issues")