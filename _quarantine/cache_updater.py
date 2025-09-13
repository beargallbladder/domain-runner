#!/usr/bin/env python3
"""
Cache Refresh System for public_domain_cache table
Updates the 20-day-old cache with fresh data from domain_responses
"""

import psycopg2
import json
import logging
from datetime import datetime, timedelta
from typing import Dict, List, Tuple, Optional
import sys

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('cache_updater.log'),
        logging.StreamHandler(sys.stdout)
    ]
)

DATABASE_URL = 'postgresql://raw_capture_db_user:wjFesUM8ISNEvE2b4kZtRAKgGYJVtKK5@dpg-d11fqgndiees73fb35dg-a.oregon-postgres.render.com/raw_capture_db'

class CacheRefreshEngine:
    def __init__(self):
        self.conn = psycopg2.connect(DATABASE_URL)
        self.cursor = self.conn.cursor()
        self.stats = {
            'domains_processed': 0,
            'domains_updated': 0,
            'domains_failed': 0,
            'start_time': datetime.now()
        }
    
    def calculate_memory_score(self, responses: List[Dict]) -> float:
        """Calculate memory score based on AI responses"""
        if not responses:
            return 0.0
        
        scores = []
        for resp in responses:
            content = resp.get('response', '').lower()
            # Score based on response quality and detail
            score = 50.0  # Base score
            
            # Positive indicators
            if 'well-known' in content or 'established' in content:
                score += 10
            if 'innovative' in content or 'cutting-edge' in content:
                score += 8
            if 'market leader' in content or 'industry leader' in content:
                score += 12
            if 'trusted' in content or 'reliable' in content:
                score += 5
            
            # Length and detail bonus
            word_count = len(content.split())
            if word_count > 200:
                score += min(word_count / 50, 10)
            
            scores.append(min(score, 95.0))  # Cap at 95
        
        return round(sum(scores) / len(scores), 1)
    
    def calculate_ai_consensus(self, responses: List[Dict]) -> float:
        """Calculate AI consensus percentage"""
        if not responses:
            return 0.0
        
        # Extract key themes from responses
        themes = {}
        for resp in responses:
            content = resp.get('response', '').lower()
            words = content.split()
            
            # Track common themes
            for word in ['technology', 'business', 'service', 'platform', 'software', 
                        'media', 'entertainment', 'commerce', 'finance', 'health']:
                if word in content:
                    themes[word] = themes.get(word, 0) + 1
        
        if not themes:
            return 75.0  # Default consensus
        
        # Calculate consensus based on theme agreement
        max_mentions = max(themes.values())
        total_responses = len(responses)
        consensus = (max_mentions / total_responses) * 100
        
        return round(min(consensus * 1.2, 98.0), 1)  # Boost and cap at 98
    
    def determine_risk_level(self, domain: str, responses: List[Dict]) -> Optional[str]:
        """Determine reputation risk level"""
        combined_content = ' '.join([r.get('response', '') for r in responses]).lower()
        
        # High volatility indicators
        if any(term in combined_content for term in ['controversial', 'volatile', 'risky', 'unstable']):
            return 'High Volatility'
        
        # Emerging indicators
        if any(term in combined_content for term in ['emerging', 'startup', 'new player', 'young company']):
            return 'Emerging'
        
        # Stable indicators
        if any(term in combined_content for term in ['established', 'stable', 'mature', 'trusted']):
            return 'Stable'
        
        return None
    
    def extract_business_info(self, responses: List[Dict]) -> Dict:
        """Extract business category, themes, and competitive landscape"""
        combined_content = ' '.join([r.get('response', '') for r in responses])
        
        # Business categories
        categories = {
            'Technology': ['technology', 'software', 'tech', 'digital', 'platform'],
            'E-commerce': ['commerce', 'shopping', 'retail', 'marketplace', 'store'],
            'Media': ['media', 'content', 'publishing', 'news', 'entertainment'],
            'Finance': ['finance', 'financial', 'payment', 'banking', 'investment'],
            'Healthcare': ['health', 'medical', 'wellness', 'healthcare', 'medicine'],
            'Education': ['education', 'learning', 'training', 'course', 'academy'],
            'Social': ['social', 'community', 'network', 'connect', 'share']
        }
        
        content_lower = combined_content.lower()
        category_scores = {}
        
        for category, keywords in categories.items():
            score = sum(1 for keyword in keywords if keyword in content_lower)
            if score > 0:
                category_scores[category] = score
        
        business_category = max(category_scores.items(), key=lambda x: x[1])[0] if category_scores else 'General'
        
        # Extract key themes (simplified)
        key_themes = []
        theme_keywords = ['innovation', 'growth', 'quality', 'service', 'technology', 
                         'customer', 'platform', 'solution', 'global', 'leader']
        
        for keyword in theme_keywords:
            if keyword in content_lower:
                key_themes.append(keyword.capitalize())
        
        # Market position
        if 'leader' in content_lower or 'leading' in content_lower:
            market_position = 'Leader'
        elif 'emerging' in content_lower or 'growing' in content_lower:
            market_position = 'Emerging'
        elif 'niche' in content_lower or 'specialized' in content_lower:
            market_position = 'Niche'
        else:
            market_position = 'Established'
        
        return {
            'business_category': business_category,
            'key_themes': key_themes[:5],  # Top 5 themes
            'market_position': market_position,
            'competitor_landscape': [],  # Would need more analysis
            'strategic_advantages': []   # Would need more analysis
        }
    
    def refresh_domain_cache(self, domain_id: int, domain: str) -> bool:
        """Refresh cache for a single domain"""
        try:
            # Fetch all responses for this domain
            self.cursor.execute("""
                SELECT dr.model, dr.prompt_type, dr.response, dr.created_at
                FROM domain_responses dr
                WHERE dr.domain_id = %s
                ORDER BY dr.created_at DESC
            """, (domain_id,))
            
            responses = []
            unique_models = set()
            
            for model, prompt_type, response, created_at in self.cursor.fetchall():
                responses.append({
                    'model': model,
                    'prompt_type': prompt_type,
                    'response': response,
                    'created_at': created_at
                })
                unique_models.add(model)
            
            if not responses:
                logging.warning(f"No responses found for domain {domain}")
                return False
            
            # Calculate metrics
            memory_score = self.calculate_memory_score(responses)
            ai_consensus = self.calculate_ai_consensus(responses)
            reputation_risk = self.determine_risk_level(domain, responses)
            business_info = self.extract_business_info(responses)
            
            # Calculate cohesion score (simplified - based on response consistency)
            cohesion_score = min(ai_consensus * 0.8 + 20, 95.0)
            
            # Get timestamps
            first_seen = min(r['created_at'] for r in responses)
            last_seen = max(r['created_at'] for r in responses)
            
            # Upsert into public_domain_cache
            self.cursor.execute("""
                INSERT INTO public_domain_cache (
                    domain, memory_score, ai_consensus_percentage, cohesion_score,
                    drift_delta, reputation_risk, business_category, market_position,
                    key_themes, competitor_landscape, strategic_advantages,
                    response_count, unique_models, first_seen, last_seen, updated_at
                ) VALUES (
                    %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s
                )
                ON CONFLICT (domain) DO UPDATE SET
                    memory_score = EXCLUDED.memory_score,
                    ai_consensus_percentage = EXCLUDED.ai_consensus_percentage,
                    cohesion_score = EXCLUDED.cohesion_score,
                    drift_delta = EXCLUDED.drift_delta,
                    reputation_risk = EXCLUDED.reputation_risk,
                    business_category = EXCLUDED.business_category,
                    market_position = EXCLUDED.market_position,
                    key_themes = EXCLUDED.key_themes,
                    competitor_landscape = EXCLUDED.competitor_landscape,
                    strategic_advantages = EXCLUDED.strategic_advantages,
                    response_count = EXCLUDED.response_count,
                    unique_models = EXCLUDED.unique_models,
                    first_seen = EXCLUDED.first_seen,
                    last_seen = EXCLUDED.last_seen,
                    updated_at = EXCLUDED.updated_at
            """, (
                domain, memory_score, ai_consensus, cohesion_score,
                0.0,  # drift_delta - would need historical data
                reputation_risk, business_info['business_category'],
                business_info['market_position'], business_info['key_themes'],
                business_info['competitor_landscape'], business_info['strategic_advantages'],
                len(responses), len(unique_models), first_seen, last_seen,
                datetime.now()
            ))
            
            self.conn.commit()
            return True
            
        except Exception as e:
            logging.error(f"Error refreshing domain {domain}: {e}")
            self.conn.rollback()
            return False
    
    def get_stale_domains(self, hours_old: int = 24, limit: int = 100) -> List[Tuple[int, str]]:
        """Get domains that need cache refresh"""
        self.cursor.execute("""
            SELECT d.id, d.domain
            FROM domains d
            LEFT JOIN public_domain_cache pdc ON d.domain = pdc.domain
            WHERE pdc.updated_at IS NULL 
               OR pdc.updated_at < NOW() - INTERVAL '%s hours'
            ORDER BY pdc.updated_at ASC NULLS FIRST
            LIMIT %s
        """, (hours_old, limit))
        
        return self.cursor.fetchall()
    
    def get_recently_updated_domains(self, hours: int = 24, limit: int = 50) -> List[Tuple[int, str]]:
        """Get domains with recent responses that need cache update"""
        self.cursor.execute("""
            SELECT DISTINCT ON (d.id) d.id, d.domain, MAX(dr.created_at) as last_response
            FROM domains d
            INNER JOIN domain_responses dr ON d.id = dr.domain_id
            LEFT JOIN public_domain_cache pdc ON d.domain = pdc.domain
            WHERE dr.created_at > NOW() - INTERVAL '%s hours'
              AND (pdc.updated_at IS NULL OR dr.created_at > pdc.updated_at)
            GROUP BY d.id, d.domain
            ORDER BY d.id, MAX(dr.created_at) DESC
            LIMIT %s
        """, (hours, limit))
        
        return [(row[0], row[1]) for row in self.cursor.fetchall()]
    
    def run_incremental_update(self, batch_size: int = 50):
        """Run incremental cache update for recently modified domains"""
        logging.info("Starting incremental cache update...")
        
        # Get domains with recent activity
        domains = self.get_recently_updated_domains(hours=24, limit=batch_size)
        
        logging.info(f"Found {len(domains)} domains with recent updates")
        
        for domain_id, domain in domains:
            if self.refresh_domain_cache(domain_id, domain):
                self.stats['domains_updated'] += 1
                logging.info(f"✓ Updated cache for {domain}")
            else:
                self.stats['domains_failed'] += 1
                logging.error(f"✗ Failed to update {domain}")
            
            self.stats['domains_processed'] += 1
    
    def run_full_refresh(self, batch_size: int = 100):
        """Run full cache refresh for all stale domains"""
        logging.info("Starting full cache refresh...")
        
        total_updated = 0
        
        while True:
            # Get next batch of stale domains
            domains = self.get_stale_domains(hours_old=72, limit=batch_size)
            
            if not domains:
                break
            
            logging.info(f"Processing batch of {len(domains)} domains...")
            
            for domain_id, domain in domains:
                if self.refresh_domain_cache(domain_id, domain):
                    self.stats['domains_updated'] += 1
                    total_updated += 1
                    
                    if total_updated % 10 == 0:
                        logging.info(f"Progress: {total_updated} domains updated")
                else:
                    self.stats['domains_failed'] += 1
                
                self.stats['domains_processed'] += 1
        
        logging.info(f"Full refresh complete! Updated {total_updated} domains")
    
    def print_stats(self):
        """Print refresh statistics"""
        duration = datetime.now() - self.stats['start_time']
        
        print("\n=== CACHE REFRESH STATISTICS ===")
        print(f"Duration: {duration}")
        print(f"Domains processed: {self.stats['domains_processed']}")
        print(f"Domains updated: {self.stats['domains_updated']}")
        print(f"Domains failed: {self.stats['domains_failed']}")
        print(f"Success rate: {self.stats['domains_updated'] / max(self.stats['domains_processed'], 1) * 100:.1f}%")
    
    def close(self):
        """Close database connection"""
        self.cursor.close()
        self.conn.close()


def main():
    """Main execution function"""
    import argparse
    
    parser = argparse.ArgumentParser(description='Refresh public_domain_cache with latest data')
    parser.add_argument('--mode', choices=['incremental', 'full'], default='incremental',
                       help='Refresh mode: incremental (recent updates) or full (all stale)')
    parser.add_argument('--batch-size', type=int, default=50,
                       help='Number of domains to process per batch')
    
    args = parser.parse_args()
    
    engine = CacheRefreshEngine()
    
    try:
        if args.mode == 'incremental':
            engine.run_incremental_update(batch_size=args.batch_size)
        else:
            engine.run_full_refresh(batch_size=args.batch_size)
        
        engine.print_stats()
        
    except Exception as e:
        logging.error(f"Fatal error: {e}")
        raise
    finally:
        engine.close()


if __name__ == "__main__":
    main()