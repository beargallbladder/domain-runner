#!/usr/bin/env python3
"""
Use the EXISTING Render services that already have ALL your API keys
"""

import requests
import psycopg2
from psycopg2.extras import RealDictCursor
import json
import time
from datetime import datetime
import logging

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Database configuration
DB_URL = "postgresql://raw_capture_db_user:wjFesUM8ISNEvE2b4kZtRAKgGYJVtKK5@dpg-d11fqgndiees73fb35dg-a.oregon-postgres.render.com/raw_capture_db"

# Render services that ALREADY HAVE ALL YOUR API KEYS
RENDER_SERVICES = {
    'domain-runner': 'https://domain-runner.onrender.com',
    'sophisticated-runner': 'https://sophisticated-runner.onrender.com'
}

def trigger_domain_processing(limit=100):
    """Trigger domain processing using the services already on Render"""
    
    # First, check which service is actually working
    for service_name, service_url in RENDER_SERVICES.items():
        try:
            health_response = requests.get(f"{service_url}/health", timeout=5)
            if health_response.status_code == 200:
                logger.info(f"✅ {service_name} is healthy: {health_response.json()}")
                
                # Check available providers
                providers_response = requests.get(f"{service_url}/api/provider-status", timeout=5)
                if providers_response.status_code == 200:
                    logger.info(f"Available providers: {providers_response.json()}")
        except Exception as e:
            logger.error(f"Error checking {service_name}: {e}")
    
    # Trigger processing on domain-runner (Node.js service with 11 providers)
    try:
        logger.info(f"Triggering processing of {limit} domains on domain-runner...")
        response = requests.post(
            f"{RENDER_SERVICES['domain-runner']}/api/process-domains",
            json={"limit": limit},
            timeout=300  # 5 minute timeout
        )
        
        if response.status_code == 200:
            result = response.json()
            logger.info(f"✅ Processing triggered successfully: {result}")
            return result
        else:
            logger.error(f"Processing failed: {response.status_code} - {response.text}")
    except Exception as e:
        logger.error(f"Error triggering processing: {e}")
    
    return None

def calculate_volatility_from_responses():
    """Calculate volatility scores from existing responses"""
    
    conn = psycopg2.connect(DB_URL)
    cursor = conn.cursor(cursor_factory=RealDictCursor)
    
    try:
        # Get domains with multiple responses
        cursor.execute("""
            SELECT 
                d.id as domain_id,
                d.domain,
                COUNT(DISTINCT dr.model) as model_count,
                AVG(LENGTH(dr.response)) as avg_response_length,
                STDDEV(LENGTH(dr.response)) as response_length_stddev,
                COUNT(DISTINCT dr.prompt_type) as prompt_types
            FROM domains d
            JOIN domain_responses dr ON d.id = dr.domain_id
            WHERE dr.created_at > NOW() - INTERVAL '7 days'
            GROUP BY d.id, d.domain
            HAVING COUNT(DISTINCT dr.model) >= 3
            ORDER BY STDDEV(LENGTH(dr.response)) DESC
            LIMIT 50
        """)
        
        domains_with_variance = cursor.fetchall()
        logger.info(f"Found {len(domains_with_variance)} domains with high response variance")
        
        for domain in domains_with_variance:
            # Calculate volatility score based on response variance
            variance_score = min(100, (domain['response_length_stddev'] / domain['avg_response_length']) * 100) if domain['avg_response_length'] > 0 else 50
            
            # Determine tier based on score
            if variance_score >= 80:
                tier = 'MAXIMUM_COVERAGE'
            elif variance_score >= 60:
                tier = 'HIGH_QUALITY_COVERAGE'
            elif variance_score >= 40:
                tier = 'BALANCED_COVERAGE'
            else:
                tier = 'EFFICIENT_COVERAGE'
            
            # Store volatility score
            cursor.execute("""
                INSERT INTO volatility_scores (domain_id, score, components, tier, calculated_at)
                VALUES (%s, %s, %s, %s, NOW())
                ON CONFLICT (domain_id) DO UPDATE
                SET score = %s, components = %s, tier = %s, calculated_at = NOW()
            """, (
                domain['domain_id'],
                variance_score / 100,  # Normalize to 0-1
                json.dumps({
                    'responseVariance': float(variance_score),
                    'modelCoverage': domain['model_count'],
                    'promptTypes': domain['prompt_types']
                }),
                tier,
                variance_score / 100,
                json.dumps({
                    'responseVariance': float(variance_score),
                    'modelCoverage': domain['model_count'],
                    'promptTypes': domain['prompt_types']
                }),
                tier
            ))
            
            logger.info(f"Domain: {domain['domain']}, Volatility: {variance_score:.2f}, Tier: {tier}")
        
        conn.commit()
        logger.info("✅ Volatility scores calculated and stored")
        
    except Exception as e:
        logger.error(f"Error calculating volatility: {e}")
        conn.rollback()
    finally:
        cursor.close()
        conn.close()

def set_domains_to_pending(domains_list):
    """Set specific domains to pending for processing"""
    
    conn = psycopg2.connect(DB_URL)
    cursor = conn.cursor()
    
    try:
        placeholders = ','.join(['%s'] * len(domains_list))
        cursor.execute(f"""
            UPDATE domains 
            SET status = 'pending'
            WHERE domain IN ({placeholders})
            RETURNING domain
        """, domains_list)
        
        updated = cursor.fetchall()
        conn.commit()
        
        logger.info(f"✅ Set {len(updated)} domains to pending status")
        return [row[0] for row in updated]
        
    except Exception as e:
        logger.error(f"Error updating domains: {e}")
        conn.rollback()
        return []
    finally:
        cursor.close()
        conn.close()

def monitor_processing():
    """Monitor the processing progress"""
    
    conn = psycopg2.connect(DB_URL)
    cursor = conn.cursor(cursor_factory=RealDictCursor)
    
    try:
        # Check recent activity
        cursor.execute("""
            SELECT 
                model,
                COUNT(*) as responses,
                MAX(created_at) as latest
            FROM domain_responses
            WHERE created_at > NOW() - INTERVAL '10 minutes'
            GROUP BY model
            ORDER BY responses DESC
        """)
        
        recent_activity = cursor.fetchall()
        
        if recent_activity:
            logger.info("🔍 Recent LLM Activity (last 10 minutes):")
            for row in recent_activity:
                logger.info(f"  {row['model']}: {row['responses']} responses, latest: {row['latest']}")
        else:
            logger.info("No recent activity in the last 10 minutes")
        
        # Check domain status
        cursor.execute("""
            SELECT status, COUNT(*) as count
            FROM domains
            GROUP BY status
            ORDER BY status
        """)
        
        status_counts = cursor.fetchall()
        logger.info("\n📊 Domain Status:")
        for row in status_counts:
            logger.info(f"  {row['status']}: {row['count']} domains")
            
    except Exception as e:
        logger.error(f"Error monitoring: {e}")
    finally:
        cursor.close()
        conn.close()

def main():
    """Main execution"""
    
    logger.info("🚀 Using Render Services with ALL your API keys")
    logger.info("=" * 50)
    
    # Step 1: Monitor current state
    monitor_processing()
    
    # Step 2: Set some high-value domains to pending
    high_value_domains = [
        'openai.com', 'anthropic.com', 'mistral.ai', 'cohere.com',
        'groq.com', 'together.ai', 'perplexity.ai', 'x.ai',
        'stability.ai', 'huggingface.co', 'replicate.com'
    ]
    
    logger.info(f"\n📝 Setting {len(high_value_domains)} high-value AI domains to pending...")
    updated = set_domains_to_pending(high_value_domains)
    
    if updated:
        # Step 3: Trigger processing using Render services
        logger.info("\n🔄 Triggering processing on Render services...")
        result = trigger_domain_processing(limit=len(updated))
        
        # Step 4: Wait and monitor
        logger.info("\n⏳ Waiting for processing to complete...")
        time.sleep(30)
        
        # Step 5: Calculate volatility from responses
        logger.info("\n📊 Calculating volatility scores...")
        calculate_volatility_from_responses()
        
        # Step 6: Final monitoring
        logger.info("\n📈 Final status check:")
        monitor_processing()
    
    logger.info("\n✅ Process complete!")

if __name__ == "__main__":
    main()