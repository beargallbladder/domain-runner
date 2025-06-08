#!/usr/bin/env python3
"""
Multi-Layer Embedding Engine
Layer 1: Database Service - Connect to 17K responses
Layer 2: Embedding Service - Text to vectors  
Layer 3: Analysis Service - Drift detection & similarity analysis
Layer 4: API Orchestration - Real data analysis & insights
"""

import os
import psycopg2
from flask import Flask, request, jsonify
from datetime import datetime
import numpy as np
from collections import defaultdict
import random

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

def cosine_similarity(a, b):
    """Calculate cosine similarity between two vectors"""
    dot_product = np.dot(a, b)
    norm_a = np.linalg.norm(a)
    norm_b = np.linalg.norm(b)
    if norm_a == 0 or norm_b == 0:
        return 0.0
    return float(dot_product / (norm_a * norm_b))

@app.route('/')
def root():
    return jsonify({
        "service": "complete-embedding-engine",
        "layers": {
            "layer1_database": "active",
            "layer2_embeddings": "active" if model_loaded else "failed",
            "layer3_analysis": "active" if model_loaded else "waiting_for_layer2",
            "layer4_orchestration": "active" if model_loaded else "waiting_for_layers_2_3"
        },
        "status": "running", 
        "message": "🚨 ULTRA-DEEP-FIX-V3 DEPLOYMENT SUCCESSFUL - ALL NUMPY BOOL FIXED 🚨",
        "endpoints": {
            "layer1": ["/data/count", "/data/tables", "/data/test"],
            "layer2": ["/embed", "/embed/batch"] if model_loaded else ["disabled - " + str(embedding_error)[:50]],
            "layer3": ["/analyze/similarity", "/analyze/drift", "/analyze/clusters"] if model_loaded else ["waiting_for_layer2"],
            "layer4": ["/insights/models", "/insights/domains", "/insights/compare"] if model_loaded else ["waiting_for_layers_2_3"]
        },
        "data_status": "17,722 responses ready for analysis",
        "timestamp": datetime.now().isoformat()
    })

@app.route('/health')
def health():
    """Health check endpoint for monitoring"""
    return jsonify({
        "status": "healthy",
        "timestamp": datetime.now().isoformat(),
        "layers": {
            "database": bool(DATABASE_URL),
            "embeddings": model_loaded
        }
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
        
        # Count total responses
        cursor.execute("SELECT COUNT(*) FROM responses")
        total_responses = cursor.fetchone()[0]
        
        # Count total domains and their status
        cursor.execute("""
            SELECT status, COUNT(*) as count 
            FROM domains 
            GROUP BY status 
            ORDER BY count DESC
        """)
        domain_status = [{"status": row[0], "count": row[1]} for row in cursor.fetchall()]
        
        # Count total domains
        cursor.execute("SELECT COUNT(*) FROM domains")
        total_domains = cursor.fetchone()[0]
        
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
            "total_responses": total_responses,
            "total_domains": total_domains,
            "domain_status_breakdown": domain_status,
            "domains_with_responses": next((d["count"] for d in domain_status if d["status"] == "completed"), 0),
            "columns": columns,
            "message": f"Found {total_responses:,} responses from {total_domains:,} total domains! 🎉"
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

# =============================================================================
# LAYER 3: ANALYSIS ENDPOINTS
# =============================================================================

@app.route('/analyze/similarity', methods=['POST'])
def analyze_similarity():
    """Analyze similarity between texts using three-tier framework"""
    if not model_loaded:
        return jsonify({
            "status": "error",
            "layer": "layer3_analysis",
            "error": f"Analysis requires embedding model: {embedding_error}"
        }), 503
    
    try:
        data = request.get_json()
        if not data or 'texts' not in data:
            return jsonify({
                "status": "error",
                "layer": "layer3_analysis",
                "error": "Missing 'texts' field (array of strings)"
            }), 400
        
        texts = data['texts']
        if not isinstance(texts, list) or len(texts) < 2:
            return jsonify({
                "status": "error",
                "layer": "layer3_analysis",
                "error": "Need at least 2 texts to analyze similarity"
            }), 400
        
        # Generate embeddings for all texts
        embeddings = embedding_model.encode(texts)
        
        # Calculate pairwise similarities
        similarities = []
        for i in range(len(texts)):
            for j in range(i + 1, len(texts)):
                sim = cosine_similarity(embeddings[i], embeddings[j])
                similarities.append({
                    "text1_index": i,
                    "text2_index": j,
                    "text1_preview": texts[i][:50] + "..." if len(texts[i]) > 50 else texts[i],
                    "text2_preview": texts[j][:50] + "..." if len(texts[j]) > 50 else texts[j],
                    "similarity_score": float(sim),
                    "similarity_category": "high" if sim > 0.8 else "medium" if sim > 0.5 else "low"
                })
        
        # Sort by similarity score
        similarities.sort(key=lambda x: x['similarity_score'], reverse=True)
        
        return jsonify({
            "status": "success",
            "layer": "layer3_analysis",
            "analysis_type": "similarity_matrix",
            "input_count": len(texts),
            "similarity_pairs": len(similarities),
            "similarities": similarities,
            "summary": {
                "highest_similarity": similarities[0]['similarity_score'] if similarities else 0,
                "lowest_similarity": similarities[-1]['similarity_score'] if similarities else 0,
                "average_similarity": sum(s['similarity_score'] for s in similarities) / len(similarities) if similarities else 0
            }
        })
        
    except Exception as e:
        return jsonify({
            "status": "error",
            "layer": "layer3_analysis",
            "error": str(e)
        }), 500

@app.route('/analyze/drift', methods=['POST'])
def analyze_drift():
    """Detect drift patterns in model responses"""
    if not model_loaded:
        return jsonify({
            "status": "error",
            "layer": "layer3_analysis",
            "error": f"Drift analysis requires embedding model: {embedding_error}"
        }), 503
    
    try:
        data = request.get_json()
        if not data or 'baseline_texts' not in data or 'comparison_texts' not in data:
            return jsonify({
                "status": "error",
                "layer": "layer3_analysis",
                "error": "Missing 'baseline_texts' and 'comparison_texts' fields"
            }), 400
        
        baseline_texts = data['baseline_texts']
        comparison_texts = data['comparison_texts']
        
        if not isinstance(baseline_texts, list) or not isinstance(comparison_texts, list):
            return jsonify({
                "status": "error",
                "layer": "layer3_analysis",
                "error": "Both baseline_texts and comparison_texts must be arrays"
            }), 400
        
        # Generate embeddings
        baseline_embeddings = embedding_model.encode(baseline_texts)
        comparison_embeddings = embedding_model.encode(comparison_texts)
        
        # Calculate centroids
        baseline_centroid = np.mean(baseline_embeddings, axis=0)
        comparison_centroid = np.mean(comparison_embeddings, axis=0)
        
        # Calculate drift metrics
        centroid_shift = cosine_similarity(baseline_centroid, comparison_centroid)
        
        # Calculate average intra-group similarity
        baseline_sim_scores = []
        for i in range(len(baseline_embeddings)):
            for j in range(i + 1, len(baseline_embeddings)):
                baseline_sim_scores.append(cosine_similarity(baseline_embeddings[i], baseline_embeddings[j]))
        
        comparison_sim_scores = []
        for i in range(len(comparison_embeddings)):
            for j in range(i + 1, len(comparison_embeddings)):
                comparison_sim_scores.append(cosine_similarity(comparison_embeddings[i], comparison_embeddings[j]))
        
        baseline_cohesion = float(np.mean(baseline_sim_scores)) if baseline_sim_scores else 0.0
        comparison_cohesion = float(np.mean(comparison_sim_scores)) if comparison_sim_scores else 0.0
        
        # Drift detection
        drift_threshold = 0.85  # Configurable threshold
        has_drift = bool(float(centroid_shift) < drift_threshold)
        
        # Pre-compute drift severity with explicit type conversion
        centroid_shift_float = float(centroid_shift)
        if centroid_shift_float < 0.7:
            drift_severity = "high"
        elif centroid_shift_float < 0.85:
            drift_severity = "medium"
        else:
            drift_severity = "low"
        
        return jsonify({
            "status": "success",
            "layer": "layer3_analysis",
            "analysis_type": "drift_detection",
            "debug_version": "ultra_deep_fix_v3",
            "baseline_count": int(len(baseline_texts)),
            "comparison_count": int(len(comparison_texts)),
            "drift_metrics": {
                "centroid_similarity": float(centroid_shift),
                "baseline_cohesion": float(baseline_cohesion),
                "comparison_cohesion": float(comparison_cohesion),
                "cohesion_change": float(float(comparison_cohesion) - float(baseline_cohesion))
            },
            "drift_detection": {
                "has_drift": has_drift,
                "drift_severity": drift_severity,
                "threshold_used": float(drift_threshold)
            },
            "interpretation": {
                "centroid_shift": "Lower values indicate more drift between groups",
                "cohesion_change": "Positive means comparison group is more cohesive"
            }
        })
        
    except Exception as e:
        return jsonify({
            "status": "error",
            "layer": "layer3_analysis",
            "error": str(e)
        }), 500

@app.route('/analyze/clusters', methods=['POST'])
def analyze_clusters():
    """Find natural clusters in text data"""
    if not model_loaded:
        return jsonify({
            "status": "error",
            "layer": "layer3_analysis",
            "error": f"Cluster analysis requires embedding model: {embedding_error}"
        }), 503
    
    try:
        data = request.get_json()
        if not data or 'texts' not in data:
            return jsonify({
                "status": "error",
                "layer": "layer3_analysis",
                "error": "Missing 'texts' field"
            }), 400
        
        texts = data['texts']
        similarity_threshold = data.get('similarity_threshold', 0.7)
        
        if not isinstance(texts, list) or len(texts) < 2:
            return jsonify({
                "status": "error",
                "layer": "layer3_analysis",
                "error": "Need at least 2 texts for clustering"
            }), 400
        
        # Generate embeddings
        embeddings = embedding_model.encode(texts)
        
        # Simple clustering based on similarity threshold
        clusters = []
        assigned = set()
        
        for i, text in enumerate(texts):
            if i in assigned:
                continue
                
            # Start new cluster
            cluster = {
                "cluster_id": len(clusters),
                "texts": [{"index": i, "text": text[:100] + "..." if len(text) > 100 else text}],
                "embeddings": [embeddings[i]]
            }
            assigned.add(i)
            
            # Find similar texts
            for j, other_text in enumerate(texts):
                if j in assigned or i == j:
                    continue
                    
                similarity = cosine_similarity(embeddings[i], embeddings[j])
                if similarity >= similarity_threshold:
                    cluster["texts"].append({
                        "index": j, 
                        "text": other_text[:100] + "..." if len(other_text) > 100 else other_text
                    })
                    cluster["embeddings"].append(embeddings[j])
                    assigned.add(j)
            
            clusters.append(cluster)
        
        # Calculate cluster statistics
        cluster_stats = []
        for cluster in clusters:
            if len(cluster["embeddings"]) > 1:
                # Calculate intra-cluster similarity
                sims = []
                for i in range(len(cluster["embeddings"])):
                    for j in range(i + 1, len(cluster["embeddings"])):
                        sims.append(cosine_similarity(cluster["embeddings"][i], cluster["embeddings"][j]))
                avg_similarity = float(np.mean(sims)) if sims else 1.0
            else:
                avg_similarity = 1.0
            
            cluster_stats.append({
                "cluster_id": cluster["cluster_id"],
                "size": len(cluster["texts"]),
                "texts": cluster["texts"],
                "average_similarity": float(avg_similarity),
                "centroid": np.mean(cluster["embeddings"], axis=0).tolist() if cluster["embeddings"] else []
            })
        
        return jsonify({
            "status": "success",
            "layer": "layer3_analysis",
            "analysis_type": "clustering",
            "input_count": len(texts),
            "cluster_count": len(clusters),
            "similarity_threshold": similarity_threshold,
            "clusters": cluster_stats,
            "summary": {
                "largest_cluster": max(cluster_stats, key=lambda x: x['size'])['size'] if cluster_stats else 0,
                "average_cluster_size": sum(c['size'] for c in cluster_stats) / len(cluster_stats) if cluster_stats else 0
            }
        })
        
    except Exception as e:
        return jsonify({
            "status": "error",
            "layer": "layer3_analysis",
            "error": str(e)
        }), 500

# =============================================================================
# LAYER 4: API ORCHESTRATION - REAL DATA INSIGHTS
# =============================================================================

@app.route('/insights/models', methods=['GET'])
def analyze_models():
    """Analyze patterns across different models in the dataset"""
    if not model_loaded:
        return jsonify({
            "status": "error",
            "layer": "layer4_orchestration",
            "error": f"Model analysis requires embedding capabilities: {embedding_error}"
        }), 503
    
    try:
        limit = request.args.get('limit', 100, type=int)
        limit = min(limit, 500)  # Safety limit
        
        conn = get_db_connection(use_replica=True)
        cursor = conn.cursor()
        
        # Get model distribution
        cursor.execute("""
            SELECT model, COUNT(*) as response_count
            FROM responses 
            GROUP BY model 
            ORDER BY response_count DESC
        """)
        model_stats = [{"model": row[0], "count": row[1]} for row in cursor.fetchall()]
        
        # Sample responses from top models for analysis
        cursor.execute("""
            SELECT model, raw_response, domain_id, prompt_type
            FROM responses 
            WHERE model IN (
                SELECT model FROM responses 
                GROUP BY model 
                ORDER BY COUNT(*) DESC 
                LIMIT 5
            )
            ORDER BY RANDOM() 
            LIMIT %s
        """, (limit,))
        
        sample_responses = []
        model_samples = defaultdict(list)
        
        for row in cursor.fetchall():
            model, response, domain_id, prompt_type = row
            sample_responses.append({
                "model": model,
                "response": response[:200] + "..." if len(response) > 200 else response,
                "domain_id": str(domain_id),
                "prompt_type": prompt_type
            })
            model_samples[model].append(response)
        
        cursor.close()
        conn.close()
        
        # Analyze response patterns if we have samples
        analysis_results = {}
        if sample_responses and len(model_samples) >= 2:
            # Pick top 2 models with most samples
            top_models = sorted(model_samples.keys(), key=lambda m: len(model_samples[m]), reverse=True)[:2]
            
            if len(model_samples[top_models[0]]) >= 2 and len(model_samples[top_models[1]]) >= 2:
                # Generate embeddings for comparison
                model1_texts = model_samples[top_models[0]][:10]  # Limit for performance
                model2_texts = model_samples[top_models[1]][:10]
                
                embeddings1 = embedding_model.encode(model1_texts)
                embeddings2 = embedding_model.encode(model2_texts)
                
                # Calculate model-specific cohesion
                cohesion1 = []
                for i in range(len(embeddings1)):
                    for j in range(i + 1, len(embeddings1)):
                        cohesion1.append(cosine_similarity(embeddings1[i], embeddings1[j]))
                
                cohesion2 = []
                for i in range(len(embeddings2)):
                    for j in range(i + 1, len(embeddings2)):
                        cohesion2.append(cosine_similarity(embeddings2[i], embeddings2[j]))
                
                # Cross-model similarity
                cross_similarities = []
                for emb1 in embeddings1:
                    for emb2 in embeddings2:
                        cross_similarities.append(cosine_similarity(emb1, emb2))
                
                analysis_results = {
                    "model_comparison": {
                        "model1": top_models[0],
                        "model1_cohesion": float(np.mean(cohesion1)) if cohesion1 else 0,
                        "model2": top_models[1], 
                        "model2_cohesion": float(np.mean(cohesion2)) if cohesion2 else 0,
                        "cross_model_similarity": float(np.mean(cross_similarities)) if cross_similarities else 0
                    }
                }
        
        return jsonify({
            "status": "success",
            "layer": "layer4_orchestration",
            "analysis_type": "model_insights",
            "dataset_size": sum(stat["count"] for stat in model_stats),
            "unique_models": len(model_stats),
            "model_distribution": model_stats,
            "sample_analysis": analysis_results,
            "samples_analyzed": len(sample_responses),
            "methodology": "Random sampling with embedding-based similarity analysis"
        })
        
    except Exception as e:
        return jsonify({
            "status": "error",
            "layer": "layer4_orchestration", 
            "error": str(e)
        }), 500

@app.route('/insights/domains', methods=['GET'])
def analyze_domains():
    """Analyze response patterns across different domains"""
    if not model_loaded:
        return jsonify({
            "status": "error",
            "layer": "layer4_orchestration",
            "error": f"Domain analysis requires embedding capabilities: {embedding_error}"
        }), 503
    
    try:
        limit = request.args.get('limit', 100, type=int)
        limit = min(limit, 500)
        
        conn = get_db_connection(use_replica=True)
        cursor = conn.cursor()
        
        # Get domain distribution
        cursor.execute("""
            SELECT domain_id, COUNT(*) as response_count,
                   COUNT(DISTINCT model) as unique_models
            FROM responses 
            GROUP BY domain_id 
            ORDER BY response_count DESC
            LIMIT 20
        """)
        domain_stats = []
        for row in cursor.fetchall():
            domain_stats.append({
                "domain_id": str(row[0]),
                "response_count": row[1],
                "unique_models": row[2]
            })
        
        # Sample responses across domains
        cursor.execute("""
            SELECT domain_id, raw_response, model, prompt_type
            FROM responses 
            WHERE domain_id IN (
                SELECT domain_id FROM responses 
                GROUP BY domain_id 
                ORDER BY COUNT(*) DESC 
                LIMIT 10
            )
            ORDER BY RANDOM() 
            LIMIT %s
        """, (limit,))
        
        domain_samples = defaultdict(list)
        sample_data = []
        
        for row in cursor.fetchall():
            domain_id, response, model, prompt_type = row
            domain_key = str(domain_id)
            domain_samples[domain_key].append(response)
            sample_data.append({
                "domain_id": domain_key,
                "response_preview": response[:150] + "..." if len(response) > 150 else response,
                "model": model,
                "prompt_type": prompt_type
            })
        
        cursor.close()
        conn.close()
        
        # Domain similarity analysis
        domain_analysis = {}
        if len(domain_samples) >= 2:
            # Analyze top domains with sufficient samples
            top_domains = sorted(domain_samples.keys(), key=lambda d: len(domain_samples[d]), reverse=True)[:3]
            
            domain_cohesions = {}
            for domain in top_domains:
                if len(domain_samples[domain]) >= 3:
                    # Sample for performance
                    sample_texts = domain_samples[domain][:8]
                    embeddings = embedding_model.encode(sample_texts)
                    
                    similarities = []
                    for i in range(len(embeddings)):
                        for j in range(i + 1, len(embeddings)):
                            similarities.append(cosine_similarity(embeddings[i], embeddings[j]))
                    
                    domain_cohesions[domain] = {
                        "avg_similarity": float(np.mean(similarities)) if similarities else 0,
                        "sample_size": len(sample_texts)
                    }
            
            domain_analysis = {"cohesion_by_domain": domain_cohesions}
        
        return jsonify({
            "status": "success",
            "layer": "layer4_orchestration",
            "analysis_type": "domain_insights",
            "total_domains": len(domain_stats),
            "domain_distribution": domain_stats,
            "domain_analysis": domain_analysis,
            "samples_analyzed": len(sample_data),
            "methodology": "Domain-based cohesion analysis using embeddings"
        })
        
    except Exception as e:
        return jsonify({
            "status": "error",
            "layer": "layer4_orchestration",
            "error": str(e)
        }), 500

@app.route('/insights/compare', methods=['POST'])
def compare_segments():
    """Compare specific segments of the dataset"""
    if not model_loaded:
        return jsonify({
            "status": "error",
            "layer": "layer4_orchestration",
            "error": f"Comparison analysis requires embedding capabilities: {embedding_error}"
        }), 503
    
    try:
        data = request.get_json()
        if not data:
            return jsonify({
                "status": "error",
                "layer": "layer4_orchestration",
                "error": "Request body required with comparison criteria"
            }), 400
        
        # Parse comparison criteria
        model_filter = data.get('model')
        domain_filter = data.get('domain_id') 
        prompt_filter = data.get('prompt_type')
        comparison_type = data.get('comparison_type', 'model')  # 'model', 'domain', or 'prompt'
        
        conn = get_db_connection(use_replica=True)
        cursor = conn.cursor()
        
        # Build dynamic query based on comparison type
        if comparison_type == 'model' and model_filter:
            # Compare this model vs others
            cursor.execute("""
                SELECT model, raw_response, domain_id, prompt_type
                FROM responses 
                WHERE model = %s OR model != %s
                ORDER BY RANDOM()
                LIMIT 100
            """, (model_filter, model_filter))
            
        elif comparison_type == 'domain' and domain_filter:
            # Compare this domain vs others  
            cursor.execute("""
                SELECT domain_id, raw_response, model, prompt_type
                FROM responses 
                WHERE domain_id = %s OR domain_id != %s
                ORDER BY RANDOM()
                LIMIT 100
            """, (domain_filter, domain_filter))
            
        else:
            # Default: random comparison
            cursor.execute("""
                SELECT model, raw_response, domain_id, prompt_type
                FROM responses 
                ORDER BY RANDOM()
                LIMIT 100
            """)
        
        rows = cursor.fetchall()
        cursor.close()
        conn.close()
        
        if not rows:
            return jsonify({
                "status": "error",
                "layer": "layer4_orchestration",
                "error": "No data found matching criteria"
            }), 404
        
        # Segment the data for comparison
        target_group = []
        comparison_group = []
        
        for row in rows:
            if comparison_type == 'model' and model_filter:
                if row[0] == model_filter:  # model field
                    target_group.append(row[1])  # raw_response
                else:
                    comparison_group.append(row[1])
                    
            elif comparison_type == 'domain' and domain_filter:
                if str(row[2]) == str(domain_filter):  # domain_id field
                    target_group.append(row[1])  # raw_response
                else:
                    comparison_group.append(row[1])
            else:
                # Split randomly for general comparison
                if len(target_group) < len(rows) // 2:
                    target_group.append(row[1])
                else:
                    comparison_group.append(row[1])
        
        # Ensure we have data for both groups
        if len(target_group) < 2 or len(comparison_group) < 2:
            return jsonify({
                "status": "error",
                "layer": "layer4_orchestration",
                "error": "Insufficient data in one or both comparison groups"
            }), 400
        
        # Limit for performance
        target_group = target_group[:20]
        comparison_group = comparison_group[:20]
        
        # Generate embeddings and analyze
        target_embeddings = embedding_model.encode(target_group)
        comparison_embeddings = embedding_model.encode(comparison_group)
        
        # Calculate group cohesions
        target_sims = []
        for i in range(len(target_embeddings)):
            for j in range(i + 1, len(target_embeddings)):
                target_sims.append(cosine_similarity(target_embeddings[i], target_embeddings[j]))
        
        comparison_sims = []
        for i in range(len(comparison_embeddings)):
            for j in range(i + 1, len(comparison_embeddings)):
                comparison_sims.append(cosine_similarity(comparison_embeddings[i], comparison_embeddings[j]))
        
        # Cross-group similarity
        cross_sims = []
        for t_emb in target_embeddings:
            for c_emb in comparison_embeddings:
                cross_sims.append(cosine_similarity(t_emb, c_emb))
        
        # Calculate centroids and drift
        target_centroid = np.mean(target_embeddings, axis=0)
        comparison_centroid = np.mean(comparison_embeddings, axis=0)
        centroid_similarity = cosine_similarity(target_centroid, comparison_centroid)
        
        return jsonify({
            "status": "success",
            "layer": "layer4_orchestration",
            "analysis_type": "segment_comparison",
            "comparison_criteria": {
                "type": comparison_type,
                "filter_value": model_filter or domain_filter or prompt_filter or "random"
            },
            "group_sizes": {
                "target_group": len(target_group),
                "comparison_group": len(comparison_group)
            },
            "similarity_analysis": {
                "target_group_cohesion": float(np.mean(target_sims)) if target_sims else 0,
                "comparison_group_cohesion": float(np.mean(comparison_sims)) if comparison_sims else 0,
                "cross_group_similarity": float(np.mean(cross_sims)) if cross_sims else 0,
                "centroid_similarity": float(centroid_similarity)
            },
            "insights": {
                "groups_are_similar": bool(centroid_similarity > 0.8),
                "target_more_cohesive": bool((np.mean(target_sims) if target_sims else 0) > (np.mean(comparison_sims) if comparison_sims else 0)),
                "significant_difference": bool(centroid_similarity < 0.7)
            }
        })
        
    except Exception as e:
        return jsonify({
            "status": "error",
            "layer": "layer4_orchestration",
            "error": str(e)
        }), 500

@app.route('/debug/response-breakdown')
def debug_response_breakdown():
    """Debug: Show response counts by domain status"""
    try:
        conn = get_db_connection(use_replica=True)
        cursor = conn.cursor()
        
        # Total responses without any filter
        cursor.execute("SELECT COUNT(*) FROM responses")
        total_all_responses = cursor.fetchone()[0]
        
        # Responses by domain status
        cursor.execute("""
            SELECT d.status, COUNT(r.id) as response_count
            FROM responses r
            JOIN domains d ON r.domain_id = d.id
            GROUP BY d.status
            ORDER BY response_count DESC
        """)
        by_status = [{"status": row[0], "response_count": row[1]} for row in cursor.fetchall()]
        
        # Responses from completed domains only (current filter)
        cursor.execute("""
            SELECT COUNT(r.id) as completed_responses
            FROM responses r
            JOIN domains d ON r.domain_id = d.id
            WHERE d.status = 'completed'
        """)
        completed_responses = cursor.fetchone()[0]
        
        cursor.close()
        conn.close()
        
        return jsonify({
            "status": "success",
            "debug_info": {
                "total_responses_all": total_all_responses,
                "completed_responses_only": completed_responses,
                "missing_responses": total_all_responses - completed_responses,
                "breakdown_by_status": by_status
            }
        })
        
    except Exception as e:
        return jsonify({
            "status": "error",
            "error": str(e)
        }), 500

@app.route('/admin/generate-cache', methods=['POST'])
def admin_generate_cache():
    """Admin endpoint to trigger cache generation for public API"""
    try:
        # Import the cache generation function
        import sys
        import os
        cache_gen_path = os.path.join(os.path.dirname(__file__), 'cache_generator.py')
        
        # Simple execution approach - run the cache generator
        import subprocess
        result = subprocess.run([
            'python3', cache_gen_path
        ], capture_output=True, text=True, timeout=600)  # 10 minute timeout
        
        if result.returncode == 0:
            return jsonify({
                "status": "success",
                "message": "Cache generation completed successfully",
                "output": result.stdout[-500:] if len(result.stdout) > 500 else result.stdout,
                "action": "public_domain_cache updated"
            })
        else:
            return jsonify({
                "status": "error", 
                "message": "Cache generation failed",
                "error": result.stderr,
                "output": result.stdout
            }), 500
            
    except subprocess.TimeoutExpired:
        return jsonify({
            "status": "timeout",
            "message": "Cache generation timed out (>10 minutes)",
            "suggestion": "Try generating cache for fewer domains or optimize the process"
        }), 504
        
    except Exception as e:
        return jsonify({
            "status": "error",
            "message": "Failed to trigger cache generation",
            "error": str(e)
        }), 500

@app.route('/admin/generate-cache-batch', methods=['POST'])
def admin_generate_cache_batch():
    """Generate cache in small batches to avoid timeouts"""
    try:
        data = request.get_json() or {}
        batch_size = min(data.get('batch_size', 5), 20)  # Max 20 domains per batch
        start_offset = data.get('start_offset', 0)
        
        # Import batch function
        import sys
        import os
        sys.path.append(os.path.dirname(__file__))
        from cache_generator_batch import update_cache_batch
        
        # Process batch
        result = update_cache_batch(batch_size=batch_size, start_offset=start_offset)
        
        return jsonify({
            "status": "success",
            "message": f"Batch processing complete",
            "batch_result": result,
            "suggestion": f"Next call: POST /admin/generate-cache-batch with start_offset={result.get('next_offset', 0)}" if result.get('has_more') else "All batches complete!"
        })
        
    except Exception as e:
        return jsonify({
            "status": "error",
            "message": "Batch cache generation failed",
            "error": str(e)
        }), 500

@app.route('/admin/cache-status')
def admin_cache_status():
    """Check status of public domain cache"""
    try:
        conn = get_db_connection(use_replica=True)
        cursor = conn.cursor()
        
        # Check if cache table exists
        cursor.execute("""
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_name = 'public_domain_cache'
            )
        """)
        table_exists = cursor.fetchone()[0]
        
        if table_exists:
            # Get cache statistics
            cursor.execute("""
                SELECT 
                    COUNT(*) as total_cached,
                    COUNT(*) FILTER (WHERE updated_at > NOW() - INTERVAL '6 hours') as fresh_cache,
                    MIN(updated_at) as oldest_entry,
                    MAX(updated_at) as newest_entry
                FROM public_domain_cache
            """)
            stats = cursor.fetchone()
            
            cursor.close()
            conn.close()
            
            return jsonify({
                "status": "success",
                "cache_table_exists": True,
                "total_cached_domains": stats[0],
                "fresh_entries_6h": stats[1],
                "oldest_entry": stats[2].isoformat() + 'Z' if stats[2] else None,
                "newest_entry": stats[3].isoformat() + 'Z' if stats[3] else None,
                "cache_health": "good" if stats[1] > 0 else "stale"
            })
        else:
            cursor.close()
            conn.close()
            return jsonify({
                "status": "success",
                "cache_table_exists": False,
                "message": "Public domain cache table not created yet",
                "action_needed": "Run cache generation to create and populate table"
            })
            
    except Exception as e:
        return jsonify({
            "status": "error",
            "error": str(e)
        }), 500

if __name__ == "__main__":
    port = int(os.environ.get('PORT', 5000))
    print(f"🚀 ULTRA-DEEP-FIX-V3 Multi-Layer Embedding Engine on port {port}")
    print(f"📊 Layer 1 (Database): {'✅ Ready' if DATABASE_URL else '❌ No DB URL'}")
    print(f"🧠 Layer 2 (Embeddings): {'✅ Ready' if model_loaded else '❌ ' + str(embedding_error)[:50]}")
    print("🔧 DEPLOYMENT: Ultra-deep numpy bool fix v3 - ALL SCALAR TYPES CONVERTED")
    app.run(host='0.0.0.0', port=port) 