#!/usr/bin/env python3
"""
ENHANCED CACHE POPULATION - FIXED TRANSACTION HANDLING
======================================================
Process ALL domains with responses using proper transaction management
"""

import psycopg2
import json
import statistics
import logging
from datetime import datetime

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

DATABASE_URL = 'postgresql://raw_capture_db_user:wjFesUM8ISNEvE2b4kZtRAKgGYJVtKK5@dpg-d11fqgndiees73fb35dg-a.oregon-postgres.render.com/raw_capture_db'

def populate_all_domains_with_responses():
    """Populate cache with ALL domains that have responses - with proper transaction handling"""
    conn = psycopg2.connect(DATABASE_URL)
    conn.autocommit = True  # Enable autocommit to avoid transaction issues
    cursor = conn.cursor()
    
    logger.info("🚀 ENHANCED CACHE POPULATION (FIXED)")
    logger.info("=" * 50)
    logger.info("🎯 Processing ALL domains with responses (1+ responses)")
    
    # Get ALL completed domains with responses
    cursor.execute("""
        SELECT DISTINCT d.id, d.domain, COUNT(r.id) as response_count
        FROM domains d
        JOIN responses r ON d.id = r.domain_id
        WHERE d.status = 'completed'
        GROUP BY d.id, d.domain
        HAVING COUNT(r.id) >= 1
        ORDER BY COUNT(r.id) DESC
    """)
    
    domains = cursor.fetchall()
    logger.info(f"📊 Found {len(domains)} domains with responses to process")
    
    # Breakdown by response count
    single_response = sum(1 for _, _, count in domains if count == 1)
    multi_response = sum(1 for _, _, count in domains if count >= 2)
    logger.info(f"   📈 Single response: {single_response} domains")
    logger.info(f"   📈 Multi response: {multi_response} domains")
    
    processed = 0
    updated = 0
    errors = 0
    
    for domain_id, domain, response_count in domains:
        try:
            # Get responses for this domain
            cursor.execute("""
                SELECT model, raw_response, captured_at, LENGTH(raw_response) as response_length
                FROM responses 
                WHERE domain_id = %s 
                ORDER BY captured_at ASC
            """, (domain_id,))
            
            responses = cursor.fetchall()
            
            if not responses:
                continue
                
            # Analyze response quality
            quality_scores = []
            response_lengths = []
            
            for model, raw_response, captured_at, response_length in responses:
                quality = analyze_response_quality(raw_response)
                quality_scores.append(quality)
                response_lengths.append(response_length)
            
            # Calculate authentic metrics
            memory_score = statistics.mean(quality_scores) * 100
            unique_models = len(set(r[0] for r in responses))
            avg_response_length = statistics.mean(response_lengths)
            
            # Cohesion calculation
            if len(quality_scores) > 1:
                cohesion_score = max(0, (1.0 - statistics.stdev(quality_scores))) * 100
            else:
                cohesion_score = quality_scores[0] * 80  # Single response baseline
                
            # Risk assessment
            risk_indicators = 0
            for _, raw_response, _, _ in responses:
                text = raw_response.lower()
                if any(phrase in text for phrase in ['controversy', 'scandal', 'lawsuit', 'investigation']):
                    risk_indicators += 1
                if any(phrase in text for phrase in ['unknown', 'not familiar', 'never heard']):
                    risk_indicators += 1
                    
            reputation_risk = min(100, (risk_indicators / len(responses)) * 100)
            
            # Generate cache data
            cache_data = {
                'analysis_timestamp': datetime.now().isoformat(),
                'analysis_version': 'enhanced_v1.1_full_coverage_fixed',
                'quality_scores': quality_scores,
                'risk_indicators': risk_indicators,
                'single_response': len(responses) == 1,
                'response_count': len(responses)
            }
            
            # Insert/update cache with proper error handling
            try:
                cursor.execute("""
                    INSERT INTO public_domain_cache (
                        domain_id, domain, memory_score, ai_consensus_score, drift_delta,
                        model_count, reputation_risk_score, competitive_threat_level,
                        brand_confusion_alert, perception_decline_alert, visibility_gap_alert,
                        business_focus, market_position, keywords, top_themes, cache_data, updated_at
                    ) VALUES (
                        %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, NOW()
                    )
                    ON CONFLICT (domain_id) DO UPDATE SET
                        memory_score = EXCLUDED.memory_score,
                        ai_consensus_score = EXCLUDED.ai_consensus_score,
                        drift_delta = EXCLUDED.drift_delta,
                        model_count = EXCLUDED.model_count,
                        reputation_risk_score = EXCLUDED.reputation_risk_score,
                        cache_data = EXCLUDED.cache_data,
                        updated_at = NOW()
                """, (
                    domain_id, domain, round(memory_score, 2), round(statistics.mean(quality_scores), 3),
                    round(abs(max(quality_scores) - min(quality_scores)), 3) if len(quality_scores) > 1 else 0.0,
                    unique_models, round(reputation_risk, 2), 'medium',
                    statistics.mean(quality_scores) < 0.6, 
                    abs(max(quality_scores) - min(quality_scores)) > 0.3 if len(quality_scores) > 1 else False,
                    unique_models < 3,
                    'Technology', 'Established', ['ai', 'memory', 'analysis'], 
                    ['business', 'technology'], json.dumps(cache_data)
                ))
                
                updated += 1
                
            except Exception as db_error:
                logger.error(f"❌ Database error for {domain}: {db_error}")
                errors += 1
                continue
            
            processed += 1
            
            if processed % 100 == 0:
                logger.info(f"✅ Processed {processed}/{len(domains)} domains (Updated: {updated}, Errors: {errors})")
                
        except Exception as e:
            logger.error(f"❌ Error processing {domain}: {e}")
            errors += 1
    
    # Final verification
    cursor.execute('SELECT COUNT(*) FROM public_domain_cache')
    final_count = cursor.fetchone()[0]
    
    cursor.close()
    conn.close()
    
    logger.info("🎉 ENHANCED CACHE POPULATION COMPLETE!")
    logger.info("=" * 50)
    logger.info(f"✅ Processed: {processed} domains")
    logger.info(f"✅ Updated: {updated} cache entries")
    logger.info(f"❌ Errors: {errors} domains")
    logger.info(f"📊 Total cache size: {final_count} domains")
    logger.info(f"🚀 Coverage: {final_count}/2102 total domains")
    
    return final_count

def analyze_response_quality(response_text):
    """Analyze actual quality and depth of AI response"""
    if not response_text or len(response_text.strip()) < 10:
        return 0.0
        
    quality_score = 0.0
    
    # 1. Response depth
    word_count = len(response_text.split())
    if word_count > 100:
        quality_score += 0.4
    elif word_count > 50:
        quality_score += 0.3
    elif word_count > 20:
        quality_score += 0.2
    elif word_count > 10:
        quality_score += 0.1
        
    # 2. Specific details mentioned
    import re
    specificity_patterns = [
        r'\b\d{4}\b',  # Years
        r'\$[\d,]+',   # Money amounts  
        r'\b[A-Z][a-z]+ [A-Z][a-z]+\b',  # Proper names
        r'\b(founded|established|created|launched)\b',
        r'\b(CEO|founder|president|director)\b',
        r'\b(headquarters|based|located)\b',
    ]
    
    specificity_count = sum(1 for pattern in specificity_patterns 
                          if re.search(pattern, response_text, re.IGNORECASE))
    quality_score += min(0.3, specificity_count * 0.05)
    
    # 3. Avoid generic "I don't know" responses
    generic_patterns = [
        r"i don't know",
        r"i'm not sure",
        r"i don't have information", 
        r"i cannot provide",
        r"as an ai",
        r"i'm an ai"
    ]
    
    generic_count = sum(1 for pattern in generic_patterns 
                      if re.search(pattern, response_text, re.IGNORECASE))
    
    if generic_count == 0:
        quality_score += 0.2
    else:
        quality_score -= min(0.2, generic_count * 0.1)
        
    # 4. Factual business content
    factual_patterns = [
        r'\b(company|corporation|business|organization)\b',
        r'\b(products?|services?|solutions?)\b',
        r'\b(industry|market|sector)\b',
        r'\b(technology|platform|software)\b'
    ]
    
    factual_count = sum(1 for pattern in factual_patterns 
                      if re.search(pattern, response_text, re.IGNORECASE))
    quality_score += min(0.1, factual_count * 0.02)
    
    return min(1.0, max(0.0, quality_score))

if __name__ == "__main__":
    populate_all_domains_with_responses() 