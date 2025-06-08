#!/usr/bin/env python3
"""
Layer 1: Database Service
Connects to your raw capture database and proves we can access the 36K responses
"""

import os
import psycopg2
from flask import Flask, jsonify
from datetime import datetime

app = Flask(__name__)

# Database configuration
DATABASE_URL = os.getenv('DATABASE_URL')
READ_REPLICA_URL = os.getenv('READ_REPLICA_URL')

def get_db_connection(use_replica=True):
    """Get database connection - use read replica by default"""
    url = READ_REPLICA_URL if (use_replica and READ_REPLICA_URL) else DATABASE_URL
    if not url:
        raise Exception("No database URL configured")
    return psycopg2.connect(url)

@app.route('/')
def root():
    return jsonify({
        "service": "embedding-engine-layer-1",
        "layer": "database",
        "status": "running", 
        "message": "Database Layer - Ready to connect to your 36K responses",
        "timestamp": datetime.now().isoformat()
    })

@app.route('/health')
def health():
    return jsonify({
        "status": "healthy",
        "service": "embedding-engine-layer-1",
        "layer": "database",
        "timestamp": datetime.now().isoformat()
    })

@app.route('/data/test')
def test_connection():
    """Test if we can connect to the database"""
    try:
        conn = get_db_connection(use_replica=True)
        cursor = conn.cursor()
        cursor.execute("SELECT 1")
        result = cursor.fetchone()
        cursor.close()
        conn.close()
        
        return jsonify({
            "status": "connected",
            "message": "Successfully connected to database",
            "database_url_present": bool(DATABASE_URL),
            "read_replica_url_present": bool(READ_REPLICA_URL),
            "test_query": "SELECT 1",
            "result": result[0] if result else None
        })
    except Exception as e:
        return jsonify({
            "status": "error",
            "error": str(e),
            "database_url_present": bool(DATABASE_URL),
            "read_replica_url_present": bool(READ_REPLICA_URL)
        }), 500

@app.route('/data/tables')
def list_tables():
    """List all tables in the database to discover the schema"""
    try:
        conn = get_db_connection(use_replica=True)
        cursor = conn.cursor()
        
        # List all tables
        cursor.execute("""
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public'
            ORDER BY table_name
        """)
        tables = [row[0] for row in cursor.fetchall()]
        
        cursor.close()
        conn.close()
        
        return jsonify({
            "status": "success",
            "tables": tables,
            "message": f"Found {len(tables)} tables in database"
        })
    except Exception as e:
        return jsonify({
            "status": "error",
            "error": str(e)
        }), 500

@app.route('/data/count')
def count_responses():
    """Count total responses in your dataset"""
    try:
        conn = get_db_connection(use_replica=True)
        cursor = conn.cursor()
        
        # Count total responses
        cursor.execute("SELECT COUNT(*) FROM llm_responses")
        total_count = cursor.fetchone()[0]
        
        # Count by status if status column exists
        try:
            cursor.execute("SELECT status, COUNT(*) FROM llm_responses GROUP BY status")
            status_counts = dict(cursor.fetchall())
        except:
            status_counts = {"status_column_not_found": "table may use different schema"}
        
        cursor.close()
        conn.close()
        
        return jsonify({
            "status": "success",
            "total_responses": total_count,
            "status_breakdown": status_counts,
            "message": f"Found {total_count:,} total responses in your dataset"
        })
    except Exception as e:
        return jsonify({
            "status": "error",
            "error": str(e)
        }), 500

if __name__ == "__main__":
    port = int(os.environ.get('PORT', 5000))
    app.run(host='0.0.0.0', port=port) 