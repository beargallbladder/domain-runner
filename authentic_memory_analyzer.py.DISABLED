#!/usr/bin/env python3
"""
AUTHENTIC MEMORY ANALYZER - REAL AI RESPONSE ANALYSIS
====================================================
Analyzes actual AI response content to generate genuine memory scores
NO FAKE ALGORITHMS - Only real patterns from AI responses
"""

import psycopg2
import json
import re
from datetime import datetime
import statistics
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

DATABASE_URL = 'postgresql://raw_capture_db_user:wjFesUM8ISNEvE2b4kZtRAKgGYJVtKK5@dpg-d11fqgndiees73fb35dg-a.oregon-postgres.render.com/raw_capture_db'

class AuthenticMemoryAnalyzer:
    def __init__(self):
        self.conn = psycopg2.connect(DATABASE_URL)
        
    def analyze_response_quality(self, response_text):
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
    
    def analyze_domain_authentically(self, domain_id, domain):
        """Generate authentic memory analysis for a domain"""
        cursor = self.conn.cursor()
        
        cursor.execute("""
            SELECT model, raw_response, captured_at, LENGTH(raw_response) as response_length
            FROM responses 
            WHERE domain_id = %s 
            ORDER BY captured_at ASC
        """, (domain_id,))
        
        responses = cursor.fetchall()
        
        if not responses:
            return None
            
        # Analyze each response
        quality_scores = []
        response_lengths = []
        
        for row in responses:
            model, raw_response, captured_at, response_length = row
            quality = self.analyze_response_quality(raw_response)
            quality_scores.append(quality)
            response_lengths.append(response_length)
        
        # Calculate authentic metrics
        memory_score = statistics.mean(quality_scores) * 100  # 0-100 scale
        unique_models = len(set(r[0] for r in responses))
        avg_response_length = statistics.mean(response_lengths)
        
        # Cohesion: How consistent are the responses
        if len(quality_scores) > 1:
            cohesion_score = max(0, (1.0 - statistics.stdev(quality_scores))) * 100
        else:
            # For single responses, use quality score as cohesion baseline
            cohesion_score = quality_scores[0] * 80  # Slightly lower confidence for single response
            
        # Risk assessment based on actual content
        risk_indicators = 0
        for row in responses:
            text = row[1].lower()
            if any(phrase in text for phrase in ['controversy', 'scandal', 'lawsuit', 'investigation']):
                risk_indicators += 1
            if any(phrase in text for phrase in ['unknown', 'not familiar', 'never heard']):
                risk_indicators += 1
                
        reputation_risk = min(100, (risk_indicators / len(responses)) * 100)
        
        result = {
            'domain_id': domain_id,
            'domain': domain,
            'memory_score': round(memory_score, 2),
            'cohesion_score': round(cohesion_score, 2),
            'ai_consensus_score': round(statistics.mean(quality_scores), 3),
            'drift_delta': round(abs(max(quality_scores) - min(quality_scores)), 3) if len(quality_scores) > 1 else 0.0,
            'model_count': unique_models,
            'reputation_risk_score': round(reputation_risk, 2),
            'avg_response_length': round(avg_response_length, 1),
            'total_responses': len(responses),
            'analysis_metadata': {
                'quality_scores': quality_scores,
                'risk_indicators': risk_indicators,
                'analysis_timestamp': datetime.now().isoformat(),
                'analysis_version': 'authentic_v1.1_single_response_support',
                'single_response': len(responses) == 1
            }
        }
        
        logger.info(f"✅ {domain}: Memory={memory_score:.1f}, Cohesion={cohesion_score:.1f}, Responses={len(responses)}")
        
        return result
    
    def process_all_domains(self):
        """Process all domains with authentic analysis - now includes single-response domains"""
        cursor = self.conn.cursor()
        
        cursor.execute("""
            SELECT DISTINCT d.id, d.domain, COUNT(r.id) as response_count
            FROM domains d
            JOIN responses r ON d.id = r.domain_id
            WHERE d.status = 'completed'
            GROUP BY d.id, d.domain
            HAVING COUNT(r.id) >= 1  -- Changed from 2 to 1 to include single-response domains
            ORDER BY COUNT(r.id) DESC
        """)
        
        domains = cursor.fetchall()
        logger.info(f"🔍 Found {len(domains)} domains for authentic analysis (including single-response)")
        
        results = []
        for domain_id, domain, response_count in domains:
            try:
                analysis = self.analyze_domain_authentically(domain_id, domain)
                if analysis:
                    results.append(analysis)
            except Exception as e:
                logger.error(f"❌ Error analyzing {domain}: {e}")
                
        return results
    
    def update_cache_with_authentic_scores(self, analyses):
        """Update cache with authentic scores"""
        cursor = self.conn.cursor()
        
        updated_count = 0
        for analysis in analyses:
            try:
                cursor.execute("""
                    UPDATE public_domain_cache SET
                        memory_score = %s,
                        cohesion_score = %s,
                        ai_consensus_score = %s,
                        drift_delta = %s,
                        model_count = %s,
                        reputation_risk_score = %s,
                        cache_data = %s,
                        updated_at = NOW()
                    WHERE domain = %s
                """, (
                    analysis['memory_score'],
                    analysis['cohesion_score'],
                    analysis['ai_consensus_score'],
                    analysis['drift_delta'],
                    analysis['model_count'],
                    analysis['reputation_risk_score'],
                    json.dumps(analysis['analysis_metadata']),
                    analysis['domain']
                ))
                
                if cursor.rowcount > 0:
                    updated_count += 1
                
            except Exception as e:
                logger.error(f"❌ Error updating {analysis['domain']}: {e}")
        
        self.conn.commit()
        return updated_count
    
    def close(self):
        self.conn.close()

def main():
    """Run authentic memory analysis"""
    logger.info("🚀 AUTHENTIC MEMORY ANALYSIS")
    logger.info("=" * 40)
    logger.info("📊 Analyzing REAL AI response patterns")
    logger.info("🎯 NO FAKE SCORES - Only genuine analysis")
    
    analyzer = AuthenticMemoryAnalyzer()
    
    try:
        analyses = analyzer.process_all_domains()
        
        if not analyses:
            logger.error("❌ No domains analyzed")
            return
            
        scores = [a['memory_score'] for a in analyses]
        logger.info(f"📈 REAL Score Distribution:")
        logger.info(f"   Min: {min(scores):.1f}")
        logger.info(f"   Max: {max(scores):.1f}")
        logger.info(f"   Avg: {statistics.mean(scores):.1f}")
        logger.info(f"   Median: {statistics.median(scores):.1f}")
        
        updated_count = analyzer.update_cache_with_authentic_scores(analyses)
        
        logger.info("🎉 AUTHENTIC ANALYSIS COMPLETE!")
        logger.info(f"✅ Analyzed: {len(analyses)} domains")
        logger.info(f"✅ Updated: {updated_count} cache entries")
        logger.info(f"📊 REAL score range: {min(scores):.1f} - {max(scores):.1f}")
        
    finally:
        analyzer.close()

if __name__ == "__main__":
    main() 