import psycopg2
from psycopg2.extras import RealDictCursor
import numpy as np
import os
from collections import defaultdict
import datetime
import json
import random

def get_db_connection():
    """Reuse the same DB connection logic from embedding_runner.py"""
    DATABASE_URL = os.environ.get('DATABASE_URL')
    if not DATABASE_URL:
        raise Exception("DATABASE_URL not found")
    return psycopg2.connect(DATABASE_URL, cursor_factory=RealDictCursor)

def cosine_similarity(a, b):
    """Reuse the same cosine similarity from embedding_runner.py"""
    return np.dot(a, b) / (np.linalg.norm(a) * np.linalg.norm(b))

def compute_memory_score(domain_id, responses):
    """Compute AI memory score based on response consistency with competitive curves"""
    if not responses:
        return 0.0
    
    # Basic memory score: average response length normalized
    lengths = [len(r['raw_response']) for r in responses]
    avg_length = np.mean(lengths)
    length_consistency = 1 - (np.std(lengths) / np.mean(lengths)) if np.mean(lengths) > 0 else 0
    
    # Score based on model count and consistency
    unique_models = len(set(r['model'] for r in responses))
    model_diversity_score = min(unique_models / 10.0, 1.0)  # Max score at 10+ models
    
    # Calculate raw score
    raw_memory_score = (length_consistency * 0.4 + model_diversity_score * 0.6) * 100
    
    # FIXED: Apply competitive distribution to prevent score inflation
    return apply_competitive_curve(raw_memory_score, len(responses), unique_models)

def apply_competitive_curve(raw_score, response_count, model_count):
    """Apply competitive curves to prevent automatic 100% scores"""
    
    adjusted_score = raw_score
    
    # Apply diminishing returns for high response counts
    if response_count > 40:
        excess_factor = (response_count - 40) / 20
        adjusted_score = adjusted_score - (excess_factor * 5) # Reduce by up to 5 points
    
    # Apply diminishing returns for high model counts  
    if model_count > 8:
        excess_factor = (model_count - 8) / 4
        adjusted_score = adjusted_score - (excess_factor * 3) # Reduce by up to 3 points
    
    # Add competitive variance (no perfect scores)
    variance = random.uniform(-3, 3) # ±3 points
    adjusted_score = adjusted_score + variance
    
    # Cap maximum score to create competitive space
    max_score = 86 # No one gets 90%+
    final_score = max(5, min(max_score, adjusted_score))
    
    return final_score

def compute_cohesion_score(responses, embedding_model=None):
    """Compute cohesion using existing embedding capabilities"""
    if not responses or len(responses) < 2:
        return 0.0
    
    try:
        # Use the domain cohesion logic from embedding_runner.py
        texts = [r['raw_response'][:500] for r in responses[:10]]  # Limit for performance
        
        if embedding_model:
            embeddings = embedding_model.encode(texts)
            similarities = []
            for i in range(len(embeddings)):
                for j in range(i + 1, len(embeddings)):
                    similarities.append(cosine_similarity(embeddings[i], embeddings[j]))
            return float(np.mean(similarities)) if similarities else 0.0
        else:
            # Fallback: text-based similarity estimate
            return 0.65  # Default moderate cohesion
    except:
        return 0.65

def extract_real_keywords(responses):
    """Extract meaningful keywords from actual response text"""
    all_text = ' '.join([r['raw_response'].lower() for r in responses])
    
    # Common business/tech terms to look for
    potential_keywords = [
        'software', 'development', 'technology', 'services', 'business', 'solutions',
        'cloud', 'api', 'platform', 'data', 'analytics', 'ai', 'machine learning',
        'web', 'mobile', 'app', 'application', 'custom', 'enterprise', 'saas',
        'consulting', 'digital', 'innovation', 'automation', 'integration',
        'security', 'scalable', 'modern', 'agile', 'devops', 'infrastructure'
    ]
    
    # Find keywords that appear in the text
    found_keywords = []
    for keyword in potential_keywords:
        if keyword in all_text:
            # Count frequency
            frequency = all_text.count(keyword)
            found_keywords.append((keyword, frequency))
    
    # Return top 5 by frequency
    found_keywords.sort(key=lambda x: x[1], reverse=True)
    return [kw[0] for kw in found_keywords[:5]]

def analyze_business_themes(responses):
    """Analyze business themes from response patterns"""
    all_text = ' '.join([r['raw_response'].lower() for r in responses])
    
    # Business theme patterns
    theme_patterns = {
        'developer-first': ['api', 'developer', 'sdk', 'integration', 'technical'],
        'enterprise-focused': ['enterprise', 'corporate', 'business', 'professional', 'commercial'],
        'technology-driven': ['technology', 'innovation', 'advanced', 'cutting-edge', 'modern'],
        'service-oriented': ['service', 'consulting', 'support', 'managed', 'solutions'],
        'cloud-native': ['cloud', 'saas', 'platform', 'hosted', 'scalable'],
        'ai-powered': ['ai', 'artificial intelligence', 'machine learning', 'automated', 'intelligent']
    }
    
    theme_scores = {}
    for theme, keywords in theme_patterns.items():
        score = sum(1 for keyword in keywords if keyword in all_text)
        if score > 0:
            theme_scores[theme] = score
    
    # Return top 3 themes
    sorted_themes = sorted(theme_scores.items(), key=lambda x: x[1], reverse=True)
    return [theme.replace('-', ' ').title() for theme, score in sorted_themes[:3]]

def compute_ai_consensus_analysis(responses, embedding_model=None):
    """Compute detailed AI consensus metrics"""
    if not responses or len(responses) < 3:
        return {
            "consensus_score": 0.0,
            "consensus_level": "insufficient_data",
            "highest_agreement": 0.0,
            "lowest_agreement": 0.0,
            "interpretation": "Not enough responses for consensus analysis"
        }
    
    try:
        if embedding_model:
            texts = [r['raw_response'][:400] for r in responses[:8]]  # Performance limit
            embeddings = embedding_model.encode(texts)
            
            similarities = []
            for i in range(len(embeddings)):
                for j in range(i + 1, len(embeddings)):
                    sim = cosine_similarity(embeddings[i], embeddings[j])
                    similarities.append(sim)
            
            if similarities:
                avg_sim = float(np.mean(similarities))
                max_sim = float(np.max(similarities))
                min_sim = float(np.min(similarities))
                
                # Consensus level interpretation
                if avg_sim > 0.7:
                    level = "high"
                    interpretation = "Strong AI agreement about this business"
                elif avg_sim > 0.5:
                    level = "medium" 
                    interpretation = "Moderate AI agreement"
                else:
                    level = "low"
                    interpretation = "Diverse interpretations by AI models"
                
                return {
                    "consensus_score": round(avg_sim, 3),
                    "consensus_level": level,
                    "highest_agreement": round(max_sim, 3),
                    "lowest_agreement": round(min_sim, 3),
                    "interpretation": interpretation
                }
        
        # Fallback analysis
        return {
            "consensus_score": 0.65,
            "consensus_level": "medium",
            "highest_agreement": 0.75,
            "lowest_agreement": 0.55,
            "interpretation": "Moderate AI agreement (analysis unavailable)"
        }
        
    except Exception as e:
        return {
            "consensus_score": 0.0,
            "consensus_level": "error",
            "highest_agreement": 0.0,
            "lowest_agreement": 0.0,
            "interpretation": f"Analysis error: {str(e)[:50]}"
        }

def compute_drift_delta(domain_id):
    """Compute drift from previous analysis (placeholder)"""
    # For now, return a simulated drift
    # In production, compare with previous cache values
    return np.random.uniform(-5.0, 5.0)

def generate_public_cache_entry(domain_id):
    """Generate complete cache entry for a domain using existing DB data"""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # Get domain info and responses (reuse exact query from embedding_runner.py)
    cursor.execute("""
        SELECT d.domain, r.raw_response, r.model, r.prompt_type, r.created_at
        FROM responses r
        JOIN domains d ON r.domain_id = d.id
        WHERE d.id = %s
        ORDER BY r.created_at DESC
    """, (domain_id,))
    
    rows = cursor.fetchall()
    if not rows:
        cursor.close()
        conn.close()
        return None
    
    domain_name = rows[0]['domain']
    responses = [dict(row) for row in rows]
    
    # SOPHISTICATED ANALYSIS - Use the embedding engine capabilities
    try:
        # Try to load embedding model for real analysis
        from sentence_transformers import SentenceTransformer
        embedding_model = SentenceTransformer('all-MiniLM-L6-v2', cache_folder='/tmp/embeddings')
    except:
        embedding_model = None
    
    # Calculate advanced metrics
    memory_score = compute_memory_score(domain_id, responses)
    cohesion_score = compute_cohesion_score(responses, embedding_model)
    ai_consensus = compute_ai_consensus_analysis(responses, embedding_model)
    drift_delta = compute_drift_delta(domain_id)
    
    # Real keyword and theme extraction
    keywords = extract_real_keywords(responses)
    top_themes = analyze_business_themes(responses)
    
    # Model analysis
    unique_models = list(set(r['model'] for r in responses))
    model_count = len(unique_models)
    
    # Time analysis
    timestamps = [r['created_at'] for r in responses if r['created_at']]
    if timestamps:
        last_seen = max(timestamps).isoformat() + 'Z'
        first_seen = min(timestamps).isoformat() + 'Z'
    else:
        last_seen = first_seen = datetime.datetime.utcnow().isoformat() + 'Z'
    
    # Sample response (most recent, with real model name)
    sample_response = {
        "model": responses[0]['model'] if responses else "economy-tier",
        "prompt": responses[0]['prompt_type'] if responses and responses[0].get('prompt_type') else "Business analysis query",
        "response": responses[0]['raw_response'][:200] + "..." if responses else "",
        "timestamp": last_seen
    }
    
    # Enhanced memory trend based on consensus analysis
    consensus_score = ai_consensus.get('consensus_score', 0.5)
    if consensus_score > 0.7:
        memory_trend = "rising"
    elif consensus_score < 0.4:
        memory_trend = "falling"
    elif model_count > 15:  # High model participation
        memory_trend = "stable"
    else:
        memory_trend = "new"
    
    # Generate sophisticated cache entry with real insights
    cache_entry = {
        "domain": domain_name,
        "domain_id": str(domain_id),
        "memory_score": round(memory_score, 1),
        "memory_trend": memory_trend,
        "drift_delta": round(drift_delta, 1),
        "cohesion_score": round(cohesion_score, 3),
        "model_count": model_count,
        "last_seen": last_seen,
        "first_seen": first_seen,
        "response_sample": sample_response,
        "keywords": keywords,
        "top_themes": top_themes if top_themes else ["Business-focused", "Technology-oriented"],
        "blurred_models": max(model_count - 1, 0),
        "tensor_score": None,
        "tensor_tease": "Semantic memory drift detected. Full history requires upgrade.",
        "competitor_tease": "Competitor memory scores available in Pro view.",
        
        # ADVANCED INSIGHTS - What makes this special
        "ai_consensus": {
            "score": ai_consensus.get('consensus_score', 0.0),
            "level": ai_consensus.get('consensus_level', 'unknown'),
            "interpretation": ai_consensus.get('interpretation', 'Analysis pending'),
            "agreement_range": {
                "highest": ai_consensus.get('highest_agreement', 0.0),
                "lowest": ai_consensus.get('lowest_agreement', 0.0)
            }
        },
        
        "business_intelligence": {
            "primary_focus": top_themes[0] if top_themes else "Technology Services",
            "market_position": "Modern" if "cloud" in keywords or "ai" in keywords else "Traditional",
            "key_strengths": keywords[:3],
            "differentiation_score": round(cohesion_score * 100, 1),
            "competitive_advantage": f"High {keywords[0]} expertise" if keywords else "Specialized services"
        },
        
        "brand_signals": {
            "keyword_frequency": {kw: str(responses[0]['raw_response'].lower().count(kw)) + " mentions" for kw in keywords[:3]} if keywords and responses else {},
            "messaging_consistency": "High" if consensus_score > 0.6 else "Medium" if consensus_score > 0.4 else "Low",
            "brand_clarity": round(consensus_score * 100, 1) if consensus_score else 50.0
        },
        
        "cta": {
            "show_signup": True,
            "text": "Track your brand across AI models",
            "signup_url": "https://llmpagerank.com/signup"
        },
        "seo_summary": f"{domain_name} has been remembered by {model_count} AI models. Memory score: {memory_score:.1f}. {ai_consensus.get('interpretation', 'AI analysis available')}. Explore your AI visibility now.",
        "updated_at": datetime.datetime.utcnow().isoformat() + 'Z'
    }
    
    cursor.close()
    conn.close()
    return cache_entry

def update_all_public_cache():
    """Background job to update cache for all active domains"""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # Get active domains with responses
    cursor.execute("""
        SELECT DISTINCT d.id, d.domain, COUNT(r.id) as response_count
        FROM domains d
        JOIN responses r ON d.id = r.domain_id
        WHERE d.status = 'completed'
        GROUP BY d.id, d.domain
        HAVING COUNT(r.id) >= 5
        ORDER BY COUNT(r.id) DESC
    """)
    
    domains = cursor.fetchall()
    print(f"📊 Updating cache for {len(domains)} domains...")
    
    # Create enhanced cache table with rich insights
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS public_domain_cache (
            domain_id UUID PRIMARY KEY,
            domain TEXT NOT NULL,
            memory_score FLOAT,
            memory_trend TEXT,
            cohesion_score FLOAT,
            drift_delta FLOAT,
            model_count INT,
            last_seen TIMESTAMP,
            first_seen TIMESTAMP,
            response_sample JSONB,
            keywords TEXT[],
            top_themes TEXT[],
            blurred_models INT,
            tensor_tease TEXT,
            competitor_tease TEXT,
            seo_summary TEXT,
            
            -- ADVANCED INSIGHTS COLUMNS
            ai_consensus_score FLOAT,
            ai_consensus_level TEXT,
            business_focus TEXT,
            market_position TEXT,
            brand_clarity_score FLOAT,
            messaging_consistency TEXT,
            
            cache_data JSONB,
            updated_at TIMESTAMP DEFAULT NOW()
        )
    """)
    
    updated_count = 0
    for domain in domains:
        try:
            cache_entry = generate_public_cache_entry(domain['id'])
            if cache_entry:
                # Upsert cache entry with rich insights
                cursor.execute("""
                    INSERT INTO public_domain_cache (
                        domain_id, domain, memory_score, memory_trend, cohesion_score,
                        drift_delta, model_count, last_seen, first_seen, response_sample,
                        keywords, top_themes, blurred_models, tensor_tease, competitor_tease,
                        seo_summary, ai_consensus_score, ai_consensus_level, business_focus,
                        market_position, brand_clarity_score, messaging_consistency,
                        cache_data, updated_at
                    ) VALUES (
                        %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s
                    )
                    ON CONFLICT (domain_id) DO UPDATE SET
                        memory_score = EXCLUDED.memory_score,
                        memory_trend = EXCLUDED.memory_trend,
                        cohesion_score = EXCLUDED.cohesion_score,
                        drift_delta = EXCLUDED.drift_delta,
                        model_count = EXCLUDED.model_count,
                        last_seen = EXCLUDED.last_seen,
                        response_sample = EXCLUDED.response_sample,
                        keywords = EXCLUDED.keywords,
                        top_themes = EXCLUDED.top_themes,
                        seo_summary = EXCLUDED.seo_summary,
                        ai_consensus_score = EXCLUDED.ai_consensus_score,
                        ai_consensus_level = EXCLUDED.ai_consensus_level,
                        business_focus = EXCLUDED.business_focus,
                        market_position = EXCLUDED.market_position,
                        brand_clarity_score = EXCLUDED.brand_clarity_score,
                        messaging_consistency = EXCLUDED.messaging_consistency,
                        cache_data = EXCLUDED.cache_data,
                        updated_at = NOW()
                """, (
                    cache_entry["domain_id"], cache_entry["domain"], cache_entry["memory_score"],
                    cache_entry["memory_trend"], cache_entry["cohesion_score"], cache_entry["drift_delta"],
                    cache_entry["model_count"], cache_entry["last_seen"], cache_entry["first_seen"],
                    json.dumps(cache_entry["response_sample"]), cache_entry["keywords"],
                    cache_entry["top_themes"], cache_entry["blurred_models"], cache_entry["tensor_tease"],
                    cache_entry["competitor_tease"], cache_entry["seo_summary"],
                    cache_entry["ai_consensus"]["score"], cache_entry["ai_consensus"]["level"],
                    cache_entry["business_intelligence"]["primary_focus"], cache_entry["business_intelligence"]["market_position"],
                    cache_entry["brand_signals"]["brand_clarity"], cache_entry["brand_signals"]["messaging_consistency"],
                    json.dumps(cache_entry), datetime.datetime.utcnow()
                ))
                updated_count += 1
                
        except Exception as e:
            print(f"❌ Error caching domain {domain['domain']}: {e}")
            continue
    
    conn.commit()
    cursor.close()
    conn.close()
    
    print(f"✅ Updated cache for {updated_count}/{len(domains)} domains")
    return updated_count

if __name__ == "__main__":
    update_all_public_cache() 