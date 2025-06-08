#!/usr/bin/env python3
"""
Multi-Layer Embedding Engine
Layer 1: Database Service - Connect to 36K responses
Layer 2: Embedding Service - Text to vectors  
Layer 3: Analysis Service - Drift detection (coming soon)
"""

import os
import psycopg2
from flask import Flask, request, jsonify
from datetime import datetime

app = Flask(__name__)

# Database configuration
DATABASE_URL = os.getenv('DATABASE_URL')
READ_REPLICA_URL = os.getenv('READ_REPLICA_URL')

# Layer 2: Try to load embedding model
embedding_model = None
embedding_error = None

def load_embedding_model():
    """Load embedding model for Layer 2 functionality"""
    global embedding_model, embedding_error
    try:
        from sentence_transformers import SentenceTransformer
        print("🔄 Loading embedding model...")
        embedding_model = SentenceTransformer('all-MiniLM-L6-v2')
        print("✅ Embedding model loaded!")
        return True
    except Exception as e:
        embedding_error = str(e)
        print(f"❌ Embedding model failed to load: {e}")
        return False

# Try to load embedding model at startup
model_loaded = load_embedding_model()

def get_db_connection(use_replica=True):
    """Get database connection - use read replica by default"""
    url = READ_REPLICA_URL if (use_replica and READ_REPLICA_URL) else DATABASE_URL
    if not url:
        raise Exception("No database URL configured")
    return psycopg2.connect(url)

@app.route('/')
def root():
    return jsonify({
        "service": "multi-layer-embedding-engine",
        "layers": {
            "layer1_database": "active",
            "layer2_embeddings": "active" if model_loaded else "failed",
            "layer3_analysis": "coming_soon"
        },
        "status": "running", 
        "message": "Modular Embedding Engine - Database + ML capabilities",
        "endpoints": {
            "layer1": ["/data/count", "/data/tables", "/data/test"],
            "layer2": ["/embed", "/embed/batch"] if model_loaded else ["disabled - " + str(embedding_error)[:50]]
        },
        "timestamp": datetime.now().isoformat()
    })

@app.route('/health')
def health():
    return jsonify({
        "status": "healthy",
        "service": "multi-layer-embedding-engine",
        "layer1_database": "active",
        "layer2_embeddings": "active" if model_loaded else "failed",
        "database_connected": bool(DATABASE_URL),
        "timestamp": datetime.now().isoformat()
    })

# =============================================================================
# LAYER 1: DATABASE ENDPOINTS
# =============================================================================

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
            "layer": "layer1_database",
            "message": "Successfully connected to database",
            "database_url_present": bool(DATABASE_URL),
            "read_replica_url_present": bool(READ_REPLICA_URL),
            "test_query": "SELECT 1",
            "result": result[0] if result else None
        })
    except Exception as e:
        return jsonify({
            "status": "error",
            "layer": "layer1_database",
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
            "layer": "layer1_database",
            "tables": tables,
            "message": f"Found {len(tables)} tables in database"
        })
    except Exception as e:
        return jsonify({
            "status": "error",
            "layer": "layer1_database",
            "error": str(e)
        }), 500

@app.route('/data/count')
def count_responses():
    """Count total responses in your dataset"""
    try:
        conn = get_db_connection(use_replica=True)
        cursor = conn.cursor()
        
        # Count total responses (using the actual table name we discovered)
        cursor.execute("SELECT COUNT(*) FROM responses")
        total_count = cursor.fetchone()[0]
        
        # Get some basic info about the responses table
        cursor.execute("""
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'responses' 
            ORDER BY ordinal_position
            LIMIT 10
        """)
        columns = [{"name": row[0], "type": row[1]} for row in cursor.fetchall()]
        
        cursor.close()
        conn.close()
        
        return jsonify({
            "status": "success",
            "layer": "layer1_database",
            "total_responses": total_count,
            "columns": columns,
            "message": f"Found {total_count:,} total responses in your dataset! 🎉"
        })
    except Exception as e:
        return jsonify({
            "status": "error",
            "layer": "layer1_database", 
            "error": str(e)
        }), 500

# =============================================================================
# LAYER 2: EMBEDDING ENDPOINTS
# =============================================================================

@app.route('/embed', methods=['POST'])
def create_embedding():
    """Convert text to embedding vector"""
    if not model_loaded:
        return jsonify({
            "status": "error",
            "layer": "layer2_embeddings",
            "error": f"Embedding model not loaded: {embedding_error}"
        }), 503
    
    try:
        data = request.get_json()
        if not data or 'text' not in data:
            return jsonify({
                "status": "error",
                "layer": "layer2_embeddings",
                "error": "Missing 'text' field in request body"
            }), 400
        
        text = data['text']
        if not isinstance(text, str) or len(text.strip()) == 0:
            return jsonify({
                "status": "error",
                "layer": "layer2_embeddings", 
                "error": "Text must be a non-empty string"
            }), 400
        
        # Generate embedding
        embedding = embedding_model.encode(text)
        
        return jsonify({
            "status": "success",
            "layer": "layer2_embeddings",
            "text": text[:100] + "..." if len(text) > 100 else text,
            "embedding": embedding.tolist(),
            "dimension": len(embedding),
            "model": "all-MiniLM-L6-v2"
        })
        
    except Exception as e:
        return jsonify({
            "status": "error",
            "layer": "layer2_embeddings",
            "error": str(e)
        }), 500

@app.route('/embed/batch', methods=['POST'])
def create_batch_embeddings():
    """Convert multiple texts to embeddings"""
    if not model_loaded:
        return jsonify({
            "status": "error",
            "layer": "layer2_embeddings",
            "error": f"Embedding model not loaded: {embedding_error}"
        }), 503
        
    try:
        data = request.get_json()
        if not data or 'texts' not in data:
            return jsonify({
                "status": "error",
                "layer": "layer2_embeddings",
                "error": "Missing 'texts' field in request body"
            }), 400
        
        texts = data['texts']
        if not isinstance(texts, list) or len(texts) == 0:
            return jsonify({
                "status": "error",
                "layer": "layer2_embeddings",
                "error": "texts must be a non-empty list"
            }), 400
        
        # Limit batch size for safety
        if len(texts) > 50:  # Reduced for production safety
            return jsonify({
                "status": "error",
                "layer": "layer2_embeddings",
                "error": "Batch size limited to 50 texts"
            }), 400
        
        # Generate embeddings
        embeddings = embedding_model.encode(texts)
        
        return jsonify({
            "status": "success",
            "layer": "layer2_embeddings",
            "count": len(texts),
            "embeddings": embeddings.tolist(),
            "dimension": len(embeddings[0]) if len(embeddings) > 0 else 0,
            "model": "all-MiniLM-L6-v2"
        })
        
    except Exception as e:
        return jsonify({
            "status": "error",
            "layer": "layer2_embeddings",
            "error": str(e)
        }), 500

if __name__ == "__main__":
    port = int(os.environ.get('PORT', 5000))
    print(f"🚀 Starting Multi-Layer Embedding Engine on port {port}")
    print(f"📊 Layer 1 (Database): {'✅ Ready' if DATABASE_URL else '❌ No DB URL'}")
    print(f"🧠 Layer 2 (Embeddings): {'✅ Ready' if model_loaded else '❌ ' + str(embedding_error)[:50]}")
    app.run(host='0.0.0.0', port=port) 