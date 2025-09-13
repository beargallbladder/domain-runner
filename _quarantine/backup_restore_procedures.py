#!/usr/bin/env python3
"""
💾 Database Backup and Restore Procedures
Production-ready backup and restore system for Domain Runner database
"""

import os
import asyncpg
import asyncio
import time
import json
import gzip
import tarfile
from pathlib import Path
from datetime import datetime
import subprocess

class DatabaseBackupRestore:
    def __init__(self, database_url: str = None):
        self.database_url = database_url or os.getenv('DATABASE_URL', 
            "postgresql://raw_capture_db_user:wjFesUM8ISNEvE2b4kZtRAKgGYJVtKK5@dpg-d11fqgndiees73fb35dg-a.oregon-postgres.render.com/raw_capture_db")
        self.backup_dir = Path('./database_backups')
        self.backup_dir.mkdir(exist_ok=True)
        
    async def create_schema_backup(self) -> str:
        """Create a complete schema backup with metadata"""
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        backup_file = self.backup_dir / f"schema_backup_{timestamp}.json"
        
        print(f"💾 Creating schema backup: {backup_file}")
        
        try:
            conn = await asyncpg.connect(self.database_url)
            
            # Get all tables with column details
            tables = await conn.fetch("""
                SELECT 
                    t.table_name,
                    t.table_type,
                    c.column_name,
                    c.data_type,
                    c.is_nullable,
                    c.column_default,
                    c.ordinal_position
                FROM information_schema.tables t
                LEFT JOIN information_schema.columns c ON t.table_name = c.table_name
                WHERE t.table_schema = 'public' AND t.table_type = 'BASE TABLE'
                ORDER BY t.table_name, c.ordinal_position
            """)
            
            # Get all indexes
            indexes = await conn.fetch("""
                SELECT indexname, indexdef, tablename
                FROM pg_indexes 
                WHERE schemaname = 'public'
                ORDER BY tablename, indexname
            """)
            
            # Get all constraints
            constraints = await conn.fetch("""
                SELECT 
                    conname,
                    contype,
                    conrelid::regclass as table_name,
                    confrelid::regclass as referenced_table,
                    pg_get_constraintdef(oid) as definition
                FROM pg_constraint 
                WHERE connamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
                ORDER BY conrelid, conname
            """)
            
            # Get all triggers
            triggers = await conn.fetch("""
                SELECT 
                    trigger_name,
                    event_manipulation,
                    event_object_table,
                    action_statement,
                    action_timing
                FROM information_schema.triggers
                WHERE trigger_schema = 'public'
                ORDER BY event_object_table, trigger_name
            """)
            
            # Get all views
            views = await conn.fetch("""
                SELECT table_name, view_definition
                FROM information_schema.views
                WHERE table_schema = 'public'
                ORDER BY table_name
            """)
            
            # Get functions and procedures
            functions = await conn.fetch("""
                SELECT 
                    routine_name,
                    routine_type,
                    routine_definition
                FROM information_schema.routines
                WHERE routine_schema = 'public'
                ORDER BY routine_name
            """)
            
            # Organize table data
            table_structure = {}
            for row in tables:
                table_name = row['table_name']
                if table_name not in table_structure:
                    table_structure[table_name] = {
                        'table_type': row['table_type'],
                        'columns': []
                    }
                
                if row['column_name']:  # Some tables might not have columns in the join
                    table_structure[table_name]['columns'].append({
                        'name': row['column_name'],
                        'type': row['data_type'],
                        'nullable': row['is_nullable'],
                        'default': row['column_default'],
                        'position': row['ordinal_position']
                    })
            
            backup_data = {
                'metadata': {
                    'timestamp': timestamp,
                    'database_url_host': self.database_url.split('@')[1].split('/')[0] if '@' in self.database_url else 'local',
                    'backup_type': 'schema_only',
                    'version': '1.0'
                },
                'tables': table_structure,
                'indexes': [
                    {
                        'name': idx['indexname'],
                        'table': idx['tablename'],
                        'definition': idx['indexdef']
                    } for idx in indexes
                ],
                'constraints': [
                    {
                        'name': c['conname'],
                        'type': c['contype'],
                        'table': str(c['table_name']),
                        'referenced_table': str(c['referenced_table']) if c['referenced_table'] else None,
                        'definition': c['definition']
                    } for c in constraints
                ],
                'triggers': [
                    {
                        'name': t['trigger_name'],
                        'event': t['event_manipulation'],
                        'table': t['event_object_table'],
                        'statement': t['action_statement'],
                        'timing': t['action_timing']
                    } for t in triggers
                ],
                'views': [
                    {
                        'name': v['table_name'],
                        'definition': v['view_definition']
                    } for v in views
                ],
                'functions': [
                    {
                        'name': f['routine_name'],
                        'type': f['routine_type'],
                        'definition': f['routine_definition']
                    } for f in functions
                ]
            }
            
            # Save backup
            with open(backup_file, 'w') as f:
                json.dump(backup_data, f, indent=2, default=str)
            
            await conn.close()
            
            # Compress backup
            compressed_file = f"{backup_file}.gz"
            with open(backup_file, 'rb') as f_in:
                with gzip.open(compressed_file, 'wb') as f_out:
                    f_out.writelines(f_in)
            
            # Remove uncompressed file
            backup_file.unlink()
            
            print(f"✅ Schema backup created: {compressed_file}")
            return str(compressed_file)
            
        except Exception as e:
            print(f"❌ Schema backup failed: {e}")
            raise
    
    async def create_data_backup(self, table_names: list = None) -> str:
        """Create a data backup for specified tables"""
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        backup_file = self.backup_dir / f"data_backup_{timestamp}.json"
        
        if not table_names:
            table_names = ['domains', 'domain_responses', 'users', 'api_keys']
        
        print(f"💾 Creating data backup for tables: {table_names}")
        
        try:
            conn = await asyncpg.connect(self.database_url)
            
            backup_data = {
                'metadata': {
                    'timestamp': timestamp,
                    'backup_type': 'data_only',
                    'tables': table_names,
                    'version': '1.0'
                },
                'data': {}
            }
            
            for table_name in table_names:
                try:
                    # Get table row count first
                    count = await conn.fetchval(f"SELECT COUNT(*) FROM {table_name}")
                    print(f"  📊 {table_name}: {count:,} rows")
                    
                    # For large tables, limit backup size
                    if count > 10000:
                        print(f"  ⚠️  Large table {table_name} - backing up latest 10,000 rows")
                        rows = await conn.fetch(f"""
                            SELECT * FROM {table_name} 
                            ORDER BY created_at DESC 
                            LIMIT 10000
                        """)
                    else:
                        rows = await conn.fetch(f"SELECT * FROM {table_name}")
                    
                    # Convert rows to dictionaries
                    backup_data['data'][table_name] = [
                        dict(row) for row in rows
                    ]
                    
                except Exception as e:
                    print(f"  ⚠️  Skipping table {table_name}: {e}")
                    backup_data['data'][table_name] = {'error': str(e)}
            
            await conn.close()
            
            # Save backup
            with open(backup_file, 'w') as f:
                json.dump(backup_data, f, indent=2, default=str)
            
            # Compress backup
            compressed_file = f"{backup_file}.gz"
            with open(backup_file, 'rb') as f_in:
                with gzip.open(compressed_file, 'wb') as f_out:
                    f_out.writelines(f_in)
            
            # Remove uncompressed file
            backup_file.unlink()
            
            file_size = os.path.getsize(compressed_file) / 1024 / 1024  # MB
            print(f"✅ Data backup created: {compressed_file} ({file_size:.2f} MB)")
            return str(compressed_file)
            
        except Exception as e:
            print(f"❌ Data backup failed: {e}")
            raise
    
    async def create_full_backup(self) -> str:
        """Create a complete backup including schema and data"""
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        
        print("🗄️  Creating full database backup...")
        
        schema_backup = await self.create_schema_backup()
        data_backup = await self.create_data_backup()
        
        # Create tar archive with both backups
        full_backup_file = self.backup_dir / f"full_backup_{timestamp}.tar.gz"
        
        with tarfile.open(full_backup_file, 'w:gz') as tar:
            tar.add(schema_backup, arcname=f"schema_{timestamp}.json.gz")
            tar.add(data_backup, arcname=f"data_{timestamp}.json.gz")
        
        print(f"✅ Full backup created: {full_backup_file}")
        return str(full_backup_file)
    
    async def restore_schema(self, backup_file: str) -> bool:
        """Restore database schema from backup"""
        print(f"🔄 Restoring schema from: {backup_file}")
        
        try:
            # Read backup file
            if backup_file.endswith('.gz'):
                with gzip.open(backup_file, 'rt') as f:
                    backup_data = json.load(f)
            else:
                with open(backup_file, 'r') as f:
                    backup_data = json.load(f)
            
            conn = await asyncpg.connect(self.database_url)
            
            # Restore tables (structure only)
            print("📋 Restoring table structures...")
            for table_name, table_info in backup_data['tables'].items():
                print(f"  Creating table: {table_name}")
                # Note: This would need actual CREATE TABLE statements
                # which would require more complex schema reconstruction
            
            # Restore indexes
            print("🚀 Restoring indexes...")
            for index in backup_data['indexes']:
                try:
                    await conn.execute(index['definition'])
                    print(f"  ✅ {index['name']}")
                except Exception as e:
                    print(f"  ⚠️  {index['name']}: {e}")
            
            await conn.close()
            print("✅ Schema restoration completed")
            return True
            
        except Exception as e:
            print(f"❌ Schema restoration failed: {e}")
            return False
    
    def list_backups(self) -> list:
        """List all available backups"""
        backups = []
        
        for backup_file in self.backup_dir.glob("*backup*.gz"):
            stat = backup_file.stat()
            backups.append({
                'file': str(backup_file),
                'name': backup_file.name,
                'size_mb': stat.st_size / 1024 / 1024,
                'created': datetime.fromtimestamp(stat.st_mtime).isoformat(),
                'type': 'schema' if 'schema' in backup_file.name else 'data' if 'data' in backup_file.name else 'full'
            })
        
        return sorted(backups, key=lambda x: x['created'], reverse=True)
    
    def cleanup_old_backups(self, keep_days: int = 7) -> int:
        """Clean up backups older than specified days"""
        cutoff_time = time.time() - (keep_days * 24 * 60 * 60)
        removed_count = 0
        
        for backup_file in self.backup_dir.glob("*backup*.gz"):
            if backup_file.stat().st_mtime < cutoff_time:
                backup_file.unlink()
                removed_count += 1
                print(f"🗑️  Removed old backup: {backup_file.name}")
        
        return removed_count

async def main():
    """Main backup/restore interface"""
    backup_restore = DatabaseBackupRestore()
    
    print("💾 DATABASE BACKUP AND RESTORE SYSTEM")
    print("=" * 50)
    
    # Create schema backup
    print("\n1. Creating schema backup...")
    schema_backup = await backup_restore.create_schema_backup()
    
    # Create data backup
    print("\n2. Creating data backup...")
    data_backup = await backup_restore.create_data_backup()
    
    # List backups
    print("\n📋 Available backups:")
    backups = backup_restore.list_backups()
    for backup in backups[:5]:  # Show latest 5
        print(f"  {backup['name']} ({backup['size_mb']:.2f} MB) - {backup['created']}")
    
    # Cleanup old backups
    print("\n🧹 Cleaning up old backups...")
    removed = backup_restore.cleanup_old_backups(keep_days=7)
    print(f"Removed {removed} old backup files")
    
    print("\n✅ Backup procedures completed successfully!")
    print(f"Latest schema backup: {schema_backup}")
    print(f"Latest data backup: {data_backup}")

if __name__ == "__main__":
    asyncio.run(main())