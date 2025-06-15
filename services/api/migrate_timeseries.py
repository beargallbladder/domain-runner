#!/usr/bin/env python3

import sqlite3
import os
import json

def migrate_database():
    """Add missing columns for time-series analysis."""
    
    # Connect to database
    db_path = os.getenv('DATABASE_PATH', 'memory_tracker.db')
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()

    print(f"Migrating database: {db_path}")

    # Add missing columns for time-series analysis
    migrations = [
        ('memory_score_history', 'TEXT DEFAULT "[]"'),
        ('previous_memory_score', 'REAL DEFAULT 0.0'),
        ('memory_score_trend', 'TEXT DEFAULT "stable"'),
        ('trend_direction', 'TEXT DEFAULT "stable"'),
        ('last_updated', 'TIMESTAMP DEFAULT CURRENT_TIMESTAMP')
    ]

    for column_name, column_def in migrations:
        try:
            cursor.execute(f'ALTER TABLE domains ADD COLUMN {column_name} {column_def}')
            print(f'✅ Added {column_name} column')
        except sqlite3.OperationalError as e:
            if 'duplicate column name' in str(e).lower():
                print(f'⚠️  {column_name} column already exists')
            else:
                print(f'❌ Error adding {column_name} column: {e}')

    # Initialize history for existing domains
    try:
        cursor.execute('''
            UPDATE domains 
            SET memory_score_history = '[]',
                previous_memory_score = memory_score,
                last_updated = CURRENT_TIMESTAMP
            WHERE memory_score_history IS NULL OR memory_score_history = ''
        ''')
        updated_rows = cursor.rowcount
        print(f'✅ Initialized history for {updated_rows} domains')
    except Exception as e:
        print(f'❌ Error initializing history: {e}')

    conn.commit()
    conn.close()
    print('🎉 Database migration completed successfully')

if __name__ == '__main__':
    migrate_database() 