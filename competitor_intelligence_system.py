#!/usr/bin/env python3
"""
COMPETITOR INTELLIGENCE SYSTEM
==============================
Automatically groups domains by industry and creates killer competitive stack rankings
for the AI Memory Death Match visualization.

This is the backend intelligence that powers the million-dollar demo.
"""

import psycopg2
import json
import logging
from datetime import datetime
from collections import defaultdict
import statistics
import re

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

DATABASE_URL = 'postgresql://raw_capture_db_user:wjFesUM8ISNEvE2b4kZtRAKgGYJVtKK5@dpg-d11fqgndiees73fb35dg-a.oregon-postgres.render.com/raw_capture_db'

class CompetitorIntelligenceSystem:
    def __init__(self):
        self.conn = psycopg2.connect(DATABASE_URL)
        self.industry_keywords = {
            'Technology Giants': ['google', 'microsoft', 'apple', 'amazon', 'meta', 'facebook', 'alphabet'],
            'Social Media': ['twitter', 'instagram', 'linkedin', 'tiktok', 'snapchat', 'pinterest', 'reddit'],
            'AI & Machine Learning': ['openai', 'anthropic', 'huggingface', 'nvidia', 'deepmind', 'cohere'],
            'Cloud & Infrastructure': ['aws', 'azure', 'gcp', 'cloudflare', 'digitalocean', 'linode'],
            'Financial Services': ['stripe', 'paypal', 'square', 'robinhood', 'coinbase', 'plaid'],
            'E-commerce': ['shopify', 'etsy', 'ebay', 'alibaba', 'walmart', 'target'],
            'Streaming & Media': ['netflix', 'spotify', 'youtube', 'twitch', 'hulu', 'disney'],
            'Enterprise Software': ['salesforce', 'slack', 'zoom', 'atlassian', 'servicenow', 'workday'],
            'Cybersecurity': ['crowdstrike', 'okta', 'paloalto', 'fortinet', 'checkpoint', 'zscaler'],
            'Developer Tools': ['github', 'gitlab', 'docker', 'kubernetes', 'jenkins', 'terraform']
        }
        
    def classify_domain_industry(self, domain):
        """Intelligently classify a domain into an industry category"""
        domain_lower = domain.lower()
        
        # Direct keyword matching
        for industry, keywords in self.industry_keywords.items():
            for keyword in keywords:
                if keyword in domain_lower:
                    return industry
        
        # Domain extension and pattern analysis
        if any(ext in domain_lower for ext in ['.edu', '.gov', '.org']):
            return 'Non-Profit & Government'
        
        if any(pattern in domain_lower for pattern in ['bank', 'finance', 'invest', 'capital']):
            return 'Financial Services'
            
        if any(pattern in domain_lower for pattern in ['shop', 'store', 'buy', 'sell', 'market']):
            return 'E-commerce'
            
        if any(pattern in domain_lower for pattern in ['news', 'media', 'press', 'journal']):
            return 'News & Media'
            
        # Default fallback
        return 'Technology'
    
    def get_all_domains_with_scores(self):
        """Get all domains with their memory scores from the cache"""
        cursor = self.conn.cursor()
        
        cursor.execute("""
            SELECT domain, memory_score, ai_consensus_score, model_count, 
                   reputation_risk_score, updated_at
            FROM public_domain_cache 
            WHERE memory_score IS NOT NULL 
            AND updated_at > NOW() - INTERVAL '7 days'
            ORDER BY memory_score DESC
        """)
        
        domains = cursor.fetchall()
        cursor.close()
        
        logger.info(f"📊 Retrieved {len(domains)} domains with scores")
        return domains
    
    def create_industry_groups(self):
        """Create competitive industry groupings with stack rankings"""
        domains = self.get_all_domains_with_scores()
        
        # Group domains by industry
        industry_groups = defaultdict(list)
        
        for domain_data in domains:
            domain, memory_score, ai_consensus, model_count, reputation_risk, updated_at = domain_data
            
            industry = self.classify_domain_industry(domain)
            
            industry_groups[industry].append({
                'domain': domain,
                'score': round(memory_score, 1),
                'ai_consensus': round(ai_consensus * 100, 1) if ai_consensus else 70.0,
                'model_count': model_count or 15,
                'reputation_risk': round(reputation_risk, 1) if reputation_risk else 25.0,
                'updated_at': updated_at.isoformat() if updated_at else datetime.now().isoformat(),
                'modelsPositive': max(1, int((model_count or 15) * 0.7)),
                'modelsNeutral': max(1, int((model_count or 15) * 0.2)),
                'modelsNegative': max(0, int((model_count or 15) * 0.1))
            })
        
        # Sort each industry group by score and limit to top performers
        for industry in industry_groups:
            industry_groups[industry].sort(key=lambda x: x['score'], reverse=True)
            industry_groups[industry] = industry_groups[industry][:8]  # Top 8 per industry
        
        # Filter out industries with too few domains
        filtered_groups = {
            industry: domains 
            for industry, domains in industry_groups.items() 
            if len(domains) >= 3
        }
        
        logger.info(f"🏢 Created {len(filtered_groups)} industry groups")
        for industry, domains in filtered_groups.items():
            avg_score = statistics.mean([d['score'] for d in domains])
            logger.info(f"   {industry}: {len(domains)} domains, avg score {avg_score:.1f}")
        
        return filtered_groups
    
    def generate_death_match_scenarios(self, industry_groups):
        """Generate compelling death match scenarios for the frontend"""
        scenarios = []
        
        for industry, domains in industry_groups.items():
            if len(domains) < 3:
                continue
                
            # Calculate industry stats
            scores = [d['score'] for d in domains]
            avg_score = statistics.mean(scores)
            score_range = max(scores) - min(scores)
            
            # Determine industry health
            if avg_score >= 85:
                health_status = 'THRIVING'
                health_color = '#007AFF'
            elif avg_score >= 70:
                health_status = 'SURVIVING'
                health_color = '#34C759'
            elif avg_score >= 55:
                health_status = 'STRUGGLING'
                health_color = '#FF9500'
            else:
                health_status = 'DYING'
                health_color = '#FF3B30'
            
            # Create death match narrative
            top_domain = domains[0]
            bottom_domain = domains[-1]
            score_gap = top_domain['score'] - bottom_domain['score']
            
            scenario = {
                'industry': industry,
                'total_domains': len(domains),
                'average_score': round(avg_score, 1),
                'score_range': round(score_range, 1),
                'health_status': health_status,
                'health_color': health_color,
                'top_performer': top_domain,
                'bottom_performer': bottom_domain,
                'score_gap': round(score_gap, 1),
                'domains': domains,
                'narrative': self.create_narrative(industry, top_domain, bottom_domain, score_gap),
                'crisis_vulnerability': self.assess_crisis_vulnerability(domains),
                'competitive_intensity': 'HIGH' if score_range > 30 else 'MODERATE' if score_range > 15 else 'LOW'
            }
            
            scenarios.append(scenario)
        
        # Sort scenarios by competitive intensity and average score
        scenarios.sort(key=lambda x: (x['score_gap'], x['average_score']), reverse=True)
        
        logger.info(f"💀 Generated {len(scenarios)} death match scenarios")
        return scenarios
    
    def create_narrative(self, industry, top_domain, bottom_domain, score_gap):
        """Create compelling narrative for each death match"""
        narratives = {
            'Technology Giants': f"{top_domain['domain']} dominates AI memory while {bottom_domain['domain']} struggles with a {score_gap:.1f} point gap. In the AI age, memory is market cap.",
            'Social Media': f"Social platforms battle for AI mindshare. {top_domain['domain']} leads the pack, but {bottom_domain['domain']} risks being forgotten in the algorithm wars.",
            'AI & Machine Learning': f"The AI industry eating itself: {top_domain['domain']} achieves superior AI memory while {bottom_domain['domain']} falls behind by {score_gap:.1f} points.",
            'Financial Services': f"Trust in fintech measured by AI memory. {top_domain['domain']} builds confidence while {bottom_domain['domain']} faces a {score_gap:.1f} point credibility gap.",
            'E-commerce': f"Shopping behavior shifts to AI recommendations. {top_domain['domain']} stays top-of-mind while {bottom_domain['domain']} risks invisibility."
        }
        
        return narratives.get(industry, f"{top_domain['domain']} outperforms {bottom_domain['domain']} by {score_gap:.1f} points in the {industry} AI memory battle.")
    
    def assess_crisis_vulnerability(self, domains):
        """Assess how vulnerable this industry is to reputation crises"""
        facebook_crisis_baseline = 52.0
        
        vulnerable_count = sum(1 for d in domains if d['score'] < facebook_crisis_baseline + 10)
        vulnerability_percentage = (vulnerable_count / len(domains)) * 100
        
        if vulnerability_percentage > 60:
            return 'CRITICAL'
        elif vulnerability_percentage > 30:
            return 'HIGH'
        elif vulnerability_percentage > 15:
            return 'MODERATE'
        else:
            return 'LOW'
    
    def save_competitive_intelligence(self, scenarios):
        """Save the competitive intelligence to the database"""
        cursor = self.conn.cursor()
        
        # Create or update competitive intelligence table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS competitive_intelligence (
                id SERIAL PRIMARY KEY,
                industry TEXT NOT NULL,
                scenario_data JSONB NOT NULL,
                generated_at TIMESTAMP DEFAULT NOW(),
                UNIQUE(industry)
            )
        """)
        
        for scenario in scenarios:
            cursor.execute("""
                INSERT INTO competitive_intelligence (industry, scenario_data)
                VALUES (%s, %s)
                ON CONFLICT (industry) DO UPDATE SET
                    scenario_data = EXCLUDED.scenario_data,
                    generated_at = NOW()
            """, (scenario['industry'], json.dumps(scenario)))
        
        self.conn.commit()
        cursor.close()
        
        logger.info(f"💾 Saved {len(scenarios)} competitive intelligence scenarios")
    
    def generate_api_response_format(self, scenarios):
        """Format scenarios for API consumption"""
        api_response = {
            'categories': [],
            'generated_at': datetime.now().isoformat(),
            'total_industries': len(scenarios),
            'total_domains': sum(s['total_domains'] for s in scenarios)
        }
        
        for scenario in scenarios:
            category = {
                'name': scenario['industry'],
                'totalDomains': scenario['total_domains'],
                'averageScore': scenario['average_score'],
                'healthStatus': scenario['health_status'],
                'crisisVulnerability': scenario['crisis_vulnerability'],
                'competitiveIntensity': scenario['competitive_intensity'],
                'narrative': scenario['narrative'],
                'topDomains': json.dumps(scenario['domains'][:5])  # Top 5 for API
            }
            api_response['categories'].append(category)
        
        return api_response
    
    def run_full_analysis(self):
        """Run the complete competitive intelligence analysis"""
        logger.info("🚀 Starting Competitor Intelligence System")
        
        try:
            # Step 1: Create industry groups
            industry_groups = self.create_industry_groups()
            
            # Step 2: Generate death match scenarios
            scenarios = self.generate_death_match_scenarios(industry_groups)
            
            # Step 3: Save to database
            self.save_competitive_intelligence(scenarios)
            
            # Step 4: Generate API format
            api_response = self.generate_api_response_format(scenarios)
            
            logger.info("🎉 COMPETITIVE INTELLIGENCE ANALYSIS COMPLETE!")
            logger.info("=" * 60)
            logger.info(f"✅ Industries analyzed: {len(scenarios)}")
            logger.info(f"✅ Total domains: {api_response['total_domains']}")
            logger.info(f"✅ Death match scenarios: {len(scenarios)}")
            
            # Print top scenarios
            logger.info("\n🔥 TOP DEATH MATCH SCENARIOS:")
            for i, scenario in enumerate(scenarios[:3], 1):
                logger.info(f"{i}. {scenario['industry']}: {scenario['narrative']}")
            
            return api_response
            
        except Exception as e:
            logger.error(f"❌ Analysis failed: {e}")
            raise
        finally:
            self.conn.close()

def main():
    """Run the competitive intelligence system"""
    system = CompetitorIntelligenceSystem()
    return system.run_full_analysis()

if __name__ == "__main__":
    main() 