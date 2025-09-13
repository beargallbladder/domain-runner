import psycopg2
from psycopg2.extras import RealDictCursor
import os
import json
import time
from cache_generator import generate_public_cache_entry, get_db_connection

def update_cache_batch(batch_size=10, start_offset=0):
    """Update cache in small batches to avoid timeouts"""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # Get domains in batches
    cursor.execute("""
        SELECT DISTINCT d.id, d.domain, COUNT(r.id) as response_count
        FROM domains d
        JOIN responses r ON d.id = r.domain_id
        WHERE d.status = 'completed'
        GROUP BY d.id, d.domain
        HAVING COUNT(r.id) >= 5
        ORDER BY COUNT(r.id) DESC
        LIMIT %s OFFSET %s
    """, (batch_size, start_offset))
    
    domains = cursor.fetchall()
    cursor.close()
    conn.close()
    
    if not domains:
        return {"status": "complete", "message": "No more domains to process"}
    
    print(f"📊 Processing batch: {len(domains)} domains (offset: {start_offset})")
    
    # Create cache table if it doesn't exist (first batch only)
    if start_offset == 0:
        conn = get_db_connection()
        cursor = conn.cursor()
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
        cursor.close()
        conn.close()
        print("✅ Cache table created/verified")
    
    updated_count = 0
    errors = []
    
    for domain in domains:
        try:
            print(f"   Processing: {domain['domain']} ({domain['response_count']} responses)")
            start_time = time.time()
            
            cache_entry = generate_public_cache_entry(domain['id'])
            if cache_entry:
                conn = get_db_connection()
                cursor = conn.cursor()
                
                cursor.execute("""
                    INSERT INTO public_domain_cache (
                        domain_id, domain, memory_score, memory_trend, cohesion_score,
                        drift_delta, model_count, last_seen, first_seen, response_sample,
                        keywords, top_themes, blurred_models, tensor_tease, competitor_tease,
                        seo_summary, ai_consensus_score, ai_consensus_level, business_focus,
                        market_position, brand_clarity_score, messaging_consistency,
                        cache_data, updated_at
                    ) VALUES (
                        %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, NOW()
                    )
                    ON CONFLICT (domain_id) DO UPDATE SET
                        memory_score = EXCLUDED.memory_score,
                        memory_trend = EXCLUDED.memory_trend,
                        cohesion_score = EXCLUDED.cohesion_score,
                        drift_delta = EXCLUDED.drift_delta,
                        model_count = EXCLUDED.model_count,
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
                    json.dumps(cache_entry)
                ))
                
                conn.commit()
                cursor.close()
                conn.close()
                
                elapsed = time.time() - start_time
                print(f"   ✅ Cached in {elapsed:.1f}s - Memory: {cache_entry['memory_score']:.1f}")
                updated_count += 1
                
        except Exception as e:
            error_msg = f"Domain {domain['domain']}: {str(e)[:100]}"
            errors.append(error_msg)
            print(f"   ❌ Error: {error_msg}")
            continue
    
    result = {
        "status": "success",
        "batch_size": len(domains),
        "updated_count": updated_count,
        "errors": len(errors),
        "error_details": errors[:3],  # First 3 errors
        "next_offset": start_offset + batch_size,
        "has_more": len(domains) == batch_size
    }
    
    print(f"✅ Batch complete: {updated_count}/{len(domains)} domains cached")
    return result

if __name__ == "__main__":
    # Process first batch
    result = update_cache_batch(batch_size=5, start_offset=0)
    print(json.dumps(result, indent=2)) 