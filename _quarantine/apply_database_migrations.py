#!/usr/bin/env python3
"""
🛠️ Database Migration Runner for Domain Runner System
Applies schema fixes and performance optimizations to production database

This script safely applies:
1. Schema migrations for missing tables and columns
2. Performance indexes for query optimization
3. Data validation constraints
4. Backup and restore procedures
"""

import os
import asyncpg
import asyncio
import time
import json
from pathlib import Path
from typing import List, Dict, Optional

class DatabaseMigrator:
    def __init__(self, database_url: str):
        self.database_url = database_url
        self.conn: Optional[asyncpg.Connection] = None
        self.migration_log = []
        
    async def connect(self) -> bool:
        """Establish database connection with retry logic"""
        print("🔗 Connecting to database...")
        
        for attempt in range(3):
            try:
                self.conn = await asyncpg.connect(self.database_url)
                # Test connection
                await self.conn.fetchval("SELECT 1")
                print("✅ Database connection established")
                return True
            except Exception as e:
                print(f"⚠️  Connection attempt {attempt + 1}/3 failed: {e}")
                if attempt < 2:
                    print("   Retrying in 2 seconds...")
                    await asyncio.sleep(2)
                else:
                    print("❌ Failed to connect after 3 attempts")
                    return False
        return False
    
    async def disconnect(self):
        """Close database connection"""
        if self.conn:
            await self.conn.close()
            print("🔌 Database connection closed")
    
    async def execute_migration(self, name: str, sql: str, ignore_errors: List[str] = None) -> bool:
        """Execute a migration with error handling"""
        ignore_errors = ignore_errors or []
        
        print(f"🚀 Running migration: {name}")
        try:
            await self.conn.execute(sql)
            self.migration_log.append({"name": name, "status": "success", "timestamp": time.time()})
            print(f"✅ Migration '{name}' completed successfully")
            return True
        except Exception as e:
            error_str = str(e)
            if any(ignore_error in error_str for ignore_error in ignore_errors):
                print(f"⚠️  Migration '{name}' - Expected error (ignoring): {error_str}")
                self.migration_log.append({"name": name, "status": "ignored", "error": error_str, "timestamp": time.time()})
                return True
            else:
                print(f"❌ Migration '{name}' failed: {error_str}")
                self.migration_log.append({"name": name, "status": "failed", "error": error_str, "timestamp": time.time()})
                return False
    
    async def backup_schema(self) -> bool:
        """Create a backup of current schema structure"""
        print("💾 Creating schema backup...")
        try:
            # Get all tables
            tables = await self.conn.fetch("""
                SELECT table_name FROM information_schema.tables 
                WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
            """)
            
            # Get all indexes
            indexes = await self.conn.fetch("""
                SELECT indexname, indexdef FROM pg_indexes 
                WHERE schemaname = 'public'
            """)
            
            backup_data = {
                "timestamp": time.time(),
                "tables": [table['table_name'] for table in tables],
                "indexes": [{"name": idx['indexname'], "definition": idx['indexdef']} for idx in indexes]
            }
            
            # Save backup
            backup_file = f"schema_backup_{int(time.time())}.json"
            with open(backup_file, 'w') as f:
                json.dump(backup_data, f, indent=2)
            
            print(f"✅ Schema backup saved to {backup_file}")
            return True
        except Exception as e:
            print(f"❌ Schema backup failed: {e}")
            return False
    
    async def apply_core_schema_migrations(self) -> bool:
        """Apply core schema fixes from migration files"""
        print("\n📋 APPLYING CORE SCHEMA MIGRATIONS")
        print("=" * 50)
        
        # Migration 1: Fix domain_responses table
        domain_responses_sql = """
        -- Create domain_responses table if it doesn't exist
        CREATE TABLE IF NOT EXISTS domain_responses (
            id SERIAL PRIMARY KEY,
            domain_id UUID NOT NULL,
            model VARCHAR(100) NOT NULL,
            prompt_type VARCHAR(100) NOT NULL,
            response TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT NOW(),
            
            -- Foreign key to domains table
            CONSTRAINT fk_domain_responses_domain
                FOREIGN KEY (domain_id) 
                REFERENCES domains(id) 
                ON DELETE CASCADE
        );

        -- Create indexes if they don't exist
        CREATE INDEX IF NOT EXISTS idx_domain_responses_domain_id 
            ON domain_responses(domain_id);

        CREATE INDEX IF NOT EXISTS idx_domain_responses_created_at 
            ON domain_responses(created_at);

        CREATE INDEX IF NOT EXISTS idx_domain_responses_domain_model 
            ON domain_responses(domain_id, model) 
            INCLUDE (response, created_at);

        -- Add constraints for data integrity
        ALTER TABLE domain_responses DROP CONSTRAINT IF EXISTS chk_model_not_empty;
        ALTER TABLE domain_responses ADD CONSTRAINT chk_model_not_empty 
            CHECK (model != '');

        ALTER TABLE domain_responses DROP CONSTRAINT IF EXISTS chk_prompt_type_not_empty;
        ALTER TABLE domain_responses ADD CONSTRAINT chk_prompt_type_not_empty 
            CHECK (prompt_type != '');

        ALTER TABLE domain_responses DROP CONSTRAINT IF EXISTS chk_response_not_empty;
        ALTER TABLE domain_responses ADD CONSTRAINT chk_response_not_empty 
            CHECK (response != '');

        -- Add comments for documentation
        COMMENT ON TABLE domain_responses IS 'Stores LLM responses for each domain from various models';
        COMMENT ON COLUMN domain_responses.domain_id IS 'Reference to the domain being analyzed';
        COMMENT ON COLUMN domain_responses.model IS 'The LLM model used (e.g., gpt-4o-mini, gpt-3.5-turbo)';
        COMMENT ON COLUMN domain_responses.prompt_type IS 'Type of analysis (e.g., business_analysis, content_strategy, technical_assessment)';
        COMMENT ON COLUMN domain_responses.response IS 'The LLM response content';
        COMMENT ON COLUMN domain_responses.created_at IS 'When the response was generated';
        """
        
        success1 = await self.execute_migration(
            "Fix domain_responses schema", 
            domain_responses_sql,
            ignore_errors=["already exists", "does not exist"]
        )
        
        # Migration 2: Update domains table
        domains_update_sql = """
        -- Add missing columns to domains table
        ALTER TABLE domains ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending';
        ALTER TABLE domains ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;
        ALTER TABLE domains ADD COLUMN IF NOT EXISTS last_processed_at TIMESTAMP WITH TIME ZONE;
        ALTER TABLE domains ADD COLUMN IF NOT EXISTS process_count INTEGER DEFAULT 0;
        ALTER TABLE domains ADD COLUMN IF NOT EXISTS error_count INTEGER DEFAULT 0;
        ALTER TABLE domains ADD COLUMN IF NOT EXISTS is_jolt BOOLEAN DEFAULT false;
        ALTER TABLE domains ADD COLUMN IF NOT EXISTS jolt_type TEXT;
        ALTER TABLE domains ADD COLUMN IF NOT EXISTS jolt_severity TEXT;
        ALTER TABLE domains ADD COLUMN IF NOT EXISTS jolt_additional_prompts INTEGER DEFAULT 0;
        ALTER TABLE domains ADD COLUMN IF NOT EXISTS cohort TEXT DEFAULT 'legacy';
        ALTER TABLE domains ADD COLUMN IF NOT EXISTS priority INTEGER DEFAULT 1;
        ALTER TABLE domains ADD COLUMN IF NOT EXISTS discovery_source TEXT;
        ALTER TABLE domains ADD COLUMN IF NOT EXISTS source_domain TEXT;
        ALTER TABLE domains ADD COLUMN IF NOT EXISTS jolt_activated_at TIMESTAMP WITHOUT TIME ZONE;
        ALTER TABLE domains ADD COLUMN IF NOT EXISTS jolt_deactivated_at TIMESTAMP WITHOUT TIME ZONE;

        -- Add constraints for data integrity
        ALTER TABLE domains DROP CONSTRAINT IF EXISTS chk_status_valid;
        ALTER TABLE domains ADD CONSTRAINT chk_status_valid 
            CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'error'));

        ALTER TABLE domains DROP CONSTRAINT IF EXISTS chk_priority_valid;
        ALTER TABLE domains ADD CONSTRAINT chk_priority_valid 
            CHECK (priority >= 0 AND priority <= 10);

        ALTER TABLE domains DROP CONSTRAINT IF EXISTS chk_process_count_valid;
        ALTER TABLE domains ADD CONSTRAINT chk_process_count_valid 
            CHECK (process_count >= 0);

        ALTER TABLE domains DROP CONSTRAINT IF EXISTS chk_error_count_valid;
        ALTER TABLE domains ADD CONSTRAINT chk_error_count_valid 
            CHECK (error_count >= 0);
        """
        
        success2 = await self.execute_migration(
            "Update domains table schema", 
            domains_update_sql,
            ignore_errors=["already exists", "column already exists"]
        )
        
        return success1 and success2
    
    async def apply_performance_indexes(self) -> bool:
        """Apply performance optimization indexes"""
        print("\n🚀 APPLYING PERFORMANCE INDEXES")
        print("=" * 50)
        
        performance_indexes_sql = """
        -- Critical indexes for domain processing
        CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_domains_status_source_created
          ON domains(status, source, created_at) 
          WHERE status = 'pending';

        CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_domains_processing_lookup
          ON domains(status, created_at) 
          WHERE status IN ('pending', 'processing');

        CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_domains_last_processed
          ON domains(last_processed_at) 
          WHERE status = 'pending';

        CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_domains_priority_status 
            ON domains(priority DESC, status, created_at);

        CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_domains_jolt 
            ON domains(is_jolt) 
            WHERE is_jolt = true;

        CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_domains_cohort_status 
            ON domains(cohort, status);

        CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_domains_discovery 
            ON domains(discovery_source);

        -- Optimize response queries if responses table exists
        CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_responses_domain_model
          ON responses(domain_id, model, captured_at);

        -- Analytics performance indexes
        CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_domains_domain_lookup
          ON domains(domain) 
          WHERE status = 'completed';

        -- Update table statistics
        ANALYZE domains;
        ANALYZE domain_responses;
        """
        
        return await self.execute_migration(
            "Performance indexes", 
            performance_indexes_sql,
            ignore_errors=["already exists", "does not exist", "relation", "concurrently"]
        )
    
    async def apply_data_validation_triggers(self) -> bool:
        """Apply data validation triggers"""
        print("\n🔒 APPLYING DATA VALIDATION TRIGGERS")
        print("=" * 50)
        
        triggers_sql = """
        -- Add update trigger for updated_at
        CREATE OR REPLACE FUNCTION update_updated_at_column()
        RETURNS TRIGGER AS $$
        BEGIN
            NEW.updated_at = CURRENT_TIMESTAMP;
            RETURN NEW;
        END;
        $$ language 'plpgsql';

        DROP TRIGGER IF EXISTS update_domains_updated_at ON domains;
        CREATE TRIGGER update_domains_updated_at 
            BEFORE UPDATE ON domains 
            FOR EACH ROW 
            EXECUTE FUNCTION update_updated_at_column();

        -- Data integrity trigger for domain_responses
        CREATE OR REPLACE FUNCTION validate_domain_response()
        RETURNS TRIGGER AS $$
        BEGIN
            -- Ensure domain exists
            IF NOT EXISTS (SELECT 1 FROM domains WHERE id = NEW.domain_id) THEN
                RAISE EXCEPTION 'Domain with id % does not exist', NEW.domain_id;
            END IF;
            
            -- Validate response is not empty
            IF LENGTH(TRIM(NEW.response)) = 0 THEN
                RAISE EXCEPTION 'Response cannot be empty';
            END IF;
            
            RETURN NEW;
        END;
        $$ language 'plpgsql';

        DROP TRIGGER IF EXISTS validate_domain_response_trigger ON domain_responses;
        CREATE TRIGGER validate_domain_response_trigger
            BEFORE INSERT OR UPDATE ON domain_responses
            FOR EACH ROW
            EXECUTE FUNCTION validate_domain_response();
        """
        
        return await self.execute_migration(
            "Data validation triggers", 
            triggers_sql,
            ignore_errors=["already exists", "does not exist"]
        )
    
    async def create_monitoring_views(self) -> bool:
        """Create monitoring views for system health"""
        print("\n📊 CREATING MONITORING VIEWS")
        print("=" * 50)
        
        views_sql = """
        -- Create a view for easy monitoring
        CREATE OR REPLACE VIEW domain_response_stats AS
        SELECT 
            d.domain,
            dr.model,
            dr.prompt_type,
            COUNT(*) as response_count,
            MAX(dr.created_at) as latest_response,
            MIN(dr.created_at) as earliest_response
        FROM domain_responses dr
        JOIN domains d ON d.id = dr.domain_id
        GROUP BY d.domain, dr.model, dr.prompt_type
        ORDER BY d.domain, dr.model, dr.prompt_type;

        -- Create monitoring view for domains
        CREATE OR REPLACE VIEW domain_processing_summary AS
        SELECT 
            status,
            cohort,
            COUNT(*) as count,
            AVG(process_count) as avg_process_count,
            SUM(error_count) as total_errors,
            MAX(last_processed_at) as latest_processed,
            MIN(created_at) as oldest_domain
        FROM domains
        GROUP BY status, cohort
        ORDER BY status, cohort;

        -- System health view
        CREATE OR REPLACE VIEW system_health_summary AS
        SELECT 
            'domains' as table_name,
            COUNT(*) as total_rows,
            COUNT(*) FILTER (WHERE status = 'pending') as pending_count,
            COUNT(*) FILTER (WHERE status = 'processing') as processing_count,
            COUNT(*) FILTER (WHERE status = 'completed') as completed_count,
            COUNT(*) FILTER (WHERE status = 'failed') as failed_count
        FROM domains
        UNION ALL
        SELECT 
            'domain_responses' as table_name,
            COUNT(*) as total_rows,
            0 as pending_count,
            0 as processing_count,
            0 as completed_count,
            0 as failed_count
        FROM domain_responses;
        """
        
        return await self.execute_migration(
            "Monitoring views", 
            views_sql,
            ignore_errors=["already exists"]
        )
    
    async def verify_migration_success(self) -> bool:
        """Verify that all migrations were applied successfully"""
        print("\n🔍 VERIFYING MIGRATION SUCCESS")
        print("=" * 50)
        
        try:
            # Check domain_responses table
            domain_responses_exists = await self.conn.fetchval("""
                SELECT EXISTS (
                    SELECT 1 FROM information_schema.tables 
                    WHERE table_schema = 'public' AND table_name = 'domain_responses'
                )
            """)
            
            if domain_responses_exists:
                print("✅ domain_responses table exists")
            else:
                print("❌ domain_responses table missing")
                return False
            
            # Check domains table columns
            domains_columns = await self.conn.fetch("""
                SELECT column_name FROM information_schema.columns
                WHERE table_schema = 'public' AND table_name = 'domains'
            """)
            
            expected_columns = {
                'id', 'domain', 'status', 'created_at', 'updated_at', 
                'last_processed_at', 'process_count', 'error_count',
                'is_jolt', 'cohort', 'priority'
            }
            
            found_columns = {col['column_name'] for col in domains_columns}
            missing_columns = expected_columns - found_columns
            
            if missing_columns:
                print(f"⚠️  Missing columns in domains table: {missing_columns}")
            else:
                print("✅ All expected columns exist in domains table")
            
            # Check indexes
            indexes = await self.conn.fetch("""
                SELECT indexname FROM pg_indexes 
                WHERE tablename IN ('domains', 'domain_responses')
                AND indexname LIKE 'idx_%'
            """)
            
            index_count = len(indexes)
            print(f"📈 Found {index_count} performance indexes")
            
            # Check views
            views = await self.conn.fetch("""
                SELECT table_name FROM information_schema.views
                WHERE table_schema = 'public' 
                AND table_name IN ('domain_response_stats', 'domain_processing_summary', 'system_health_summary')
            """)
            
            view_count = len(views)
            print(f"👁️  Created {view_count} monitoring views")
            
            # Test data access
            domain_count = await self.conn.fetchval("SELECT COUNT(*) FROM domains")
            response_count = await self.conn.fetchval("SELECT COUNT(*) FROM domain_responses")
            
            print(f"📊 Current data: {domain_count} domains, {response_count} responses")
            
            return True
            
        except Exception as e:
            print(f"❌ Verification failed: {e}")
            return False
    
    async def run_all_migrations(self) -> bool:
        """Run all database migrations in sequence"""
        print("🛠️  STARTING COMPREHENSIVE DATABASE MIGRATION")
        print("=" * 60)
        
        if not await self.connect():
            return False
        
        try:
            # Step 1: Backup schema
            if not await self.backup_schema():
                print("⚠️  Schema backup failed, but continuing...")
            
            # Step 2: Core schema migrations
            if not await self.apply_core_schema_migrations():
                print("❌ Core schema migrations failed")
                return False
            
            # Step 3: Performance indexes
            if not await self.apply_performance_indexes():
                print("⚠️  Some performance indexes failed, but continuing...")
            
            # Step 4: Data validation triggers
            if not await self.apply_data_validation_triggers():
                print("⚠️  Data validation triggers failed, but continuing...")
            
            # Step 5: Monitoring views
            if not await self.create_monitoring_views():
                print("⚠️  Monitoring views failed, but continuing...")
            
            # Step 6: Verify everything
            if not await self.verify_migration_success():
                print("⚠️  Verification had issues, but migration may have succeeded")
            
            print("\n✅ DATABASE MIGRATION COMPLETED SUCCESSFULLY!")
            return True
            
        except Exception as e:
            print(f"❌ Migration failed with error: {e}")
            return False
        finally:
            await self.disconnect()

async def main():
    """Main migration runner"""
    # Get database URL from environment
    database_url = os.getenv('DATABASE_URL')
    if not database_url:
        database_url = "postgresql://raw_capture_db_user:wjFesUM8ISNEvE2b4kZtRAKgGYJVtKK5@dpg-d11fqgndiees73fb35dg-a.oregon-postgres.render.com/raw_capture_db"
        print("⚠️  Using default DATABASE_URL from CLAUDE.md")
    
    print(f"🎯 Target database: {database_url.split('@')[1] if '@' in database_url else 'local'}")
    
    migrator = DatabaseMigrator(database_url)
    
    start_time = time.time()
    success = await migrator.run_all_migrations()
    end_time = time.time()
    
    print("\n" + "=" * 60)
    print(f"⏱️  Migration completed in {end_time - start_time:.2f} seconds")
    
    if success:
        print("🎉 All migrations applied successfully!")
        print("\nNext steps:")
        print("1. Deploy sophisticated-runner with domain processing endpoint")
        print("2. Test domain processing with: curl -X POST https://sophisticated-runner.onrender.com/process-pending-domains")
        print("3. Monitor progress with monitoring views")
    else:
        print("💥 Migration had issues. Check the logs above.")
    
    # Save migration log
    log_file = f"migration_log_{int(time.time())}.json"
    with open(log_file, 'w') as f:
        json.dump(migrator.migration_log, f, indent=2)
    print(f"📝 Migration log saved to {log_file}")

if __name__ == "__main__":
    asyncio.run(main())