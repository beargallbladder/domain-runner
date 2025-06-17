#!/usr/bin/env python3
"""
🔐 Database Migration Runner
Runs the authentication schema migration on the production database
"""

import os
import asyncpg
import asyncio
import time

async def run_migration():
    """Run the database migration with robust error handling"""
    
    # Get database URL from environment
    database_url = os.getenv('DATABASE_URL')
    if not database_url:
        print("❌ ERROR: DATABASE_URL environment variable not set")
        print("   Please set: export DATABASE_URL='postgresql://user:pass@host:port/dbname'")
        return False
    
    # Check if migration file exists
    migration_file = 'database_migration.sql'
    if not os.path.exists(migration_file):
        print(f"❌ ERROR: Migration file '{migration_file}' not found")
        print("   Please ensure you're running this script from the correct directory")
        return False
        
    try:
        # Read migration file
        print("📋 Reading migration file...")
        with open(migration_file, 'r', encoding='utf-8') as f:
            migration_sql = f.read()
        
        if not migration_sql.strip():
            print("❌ ERROR: Migration file is empty")
            return False
        
        print(f"📝 Migration file loaded ({len(migration_sql)} characters)")
        
        # Connect with retry logic
        print("🔗 Connecting to database...")
        conn = None
        for attempt in range(3):
            try:
                conn = await asyncpg.connect(database_url)
                print("✅ Database connection established")
                break
            except Exception as e:
                print(f"⚠️  Connection attempt {attempt + 1}/3 failed: {e}")
                if attempt < 2:
                    print("   Retrying in 2 seconds...")
                    await asyncio.sleep(2)
                else:
                    print("❌ Failed to connect after 3 attempts")
                    return False
        
        # Test basic connection
        try:
            await conn.fetchval("SELECT 1")
            print("✅ Database connection verified")
        except Exception as e:
            print(f"❌ Database connection test failed: {e}")
            await conn.close()
            return False
        
        # Run migration
        print("🚀 Running migration...")
        try:
            await conn.execute(migration_sql)
            print("✅ Migration executed successfully!")
        except asyncpg.exceptions.DuplicateTableError:
            print("⚠️  Tables already exist - migration may have been run before")
            print("   This is usually OK, continuing with verification...")
        except Exception as e:
            print(f"❌ Migration execution failed: {e}")
            await conn.close()
            return False
        
        # Verify tables were created
        print("🔍 Verifying table creation...")
        try:
            tables = await conn.fetch("""
                SELECT table_name FROM information_schema.tables 
                WHERE table_schema = 'public' AND table_name IN ('users', 'api_keys')
            """)
            
            expected_tables = {'users', 'api_keys'}
            found_tables = {table['table_name'] for table in tables}
            
            print("📊 Database tables:")
            for table_name in expected_tables:
                if table_name in found_tables:
                    print(f"  ✅ {table_name}")
                else:
                    print(f"  ❌ {table_name} (MISSING)")
            
            if expected_tables.issubset(found_tables):
                print("✅ All required tables verified")
            else:
                missing = expected_tables - found_tables
                print(f"❌ Missing tables: {', '.join(missing)}")
                await conn.close()
                return False
            
        except Exception as e:
            print(f"⚠️  Table verification failed: {e}")
            print("   Migration may have succeeded but verification failed")
        
        # Test a simple query on users table
        try:
            user_count = await conn.fetchval("SELECT COUNT(*) FROM users")
            print(f"📈 Users table ready (current count: {user_count})")
        except Exception as e:
            print(f"⚠️  Users table test failed: {e}")
        
        await conn.close()
        print("🔌 Database connection closed")
        return True
        
    except FileNotFoundError:
        print(f"❌ Migration file '{migration_file}' not found")
        return False
    except UnicodeDecodeError as e:
        print(f"❌ Failed to read migration file: {e}")
        return False
    except Exception as e:
        print(f"❌ Unexpected error: {e}")
        return False

if __name__ == "__main__":
    print("🔐 Starting database migration...")
    print("=" * 50)
    
    start_time = time.time()
    success = asyncio.run(run_migration())
    end_time = time.time()
    
    print("=" * 50)
    print(f"⏱️  Migration completed in {end_time - start_time:.2f} seconds")
    
    if success:
        print("🎉 All done! Authentication system is ready.")
        print("")
        print("Next steps:")
        print("1. Set JWT_SECRET environment variable on Render")
        print("2. Deploy backend and frontend")
        print("3. Test registration at https://llmpagerank.com/signup")
    else:
        print("💥 Migration failed. Please check the errors above.")
        print("")
        print("Troubleshooting:")
        print("- Verify DATABASE_URL is correct")
        print("- Check database connectivity")
        print("- Ensure you have database permissions")
        print("- Run from the domain-runner directory") 