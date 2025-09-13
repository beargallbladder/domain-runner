#!/usr/bin/env python3
"""
LLM Category Performance Grading System
Discovers which LLMs are best at remembering which categories
Creates "Trust Scores" for LLM/Category combinations
"""

import psycopg2
from psycopg2.extras import RealDictCursor
import pandas as pd
import numpy as np
from datetime import datetime
import json
from collections import defaultdict
from typing import Dict, List, Tuple

class LLMCategoryGrader:
    def __init__(self, db_connection):
        self.conn = db_connection
        self.category_mapping = self._load_category_mapping()
        
    def _load_category_mapping(self):
        """Load domains into categories based on patterns"""
        # Industry category patterns
        return {
            'TECH_GIANTS': ['google', 'microsoft', 'apple', 'amazon', 'facebook', 'meta', 'netflix', 'uber', 'tesla'],
            'AI_ML': ['openai', 'anthropic', 'deepmind', 'huggingface', 'cohere', 'stability', 'midjourney'],
            'FINTECH': ['stripe', 'square', 'paypal', 'coinbase', 'robinhood', 'chime', 'plaid', 'wise'],
            'ECOMMERCE': ['amazon', 'alibaba', 'ebay', 'etsy', 'shopify', 'wayfair', 'chewy', 'zappos'],
            'FASHION': ['nike', 'adidas', 'gucci', 'louis vuitton', 'zara', 'h&m', 'uniqlo', 'gap', 'calvin'],
            'MEDIA': ['netflix', 'disney', 'spotify', 'youtube', 'tiktok', 'twitter', 'instagram', 'reddit'],
            'ENTERPRISE': ['salesforce', 'oracle', 'sap', 'workday', 'servicenow', 'atlassian', 'slack'],
            'HEALTHCARE': ['unitedhealth', 'cvs', 'anthem', 'humana', 'teladoc', 'doximity'],
            'AUTOMOTIVE': ['tesla', 'ford', 'gm', 'toyota', 'volkswagen', 'bmw', 'mercedes'],
            'FOOD_DELIVERY': ['doordash', 'uber eats', 'grubhub', 'instacart', 'postmates'],
            'GAMING': ['steam', 'epic', 'roblox', 'minecraft', 'fortnite', 'activision', 'ea'],
            'CRYPTO': ['bitcoin', 'ethereum', 'binance', 'coinbase', 'kraken', 'opensea', 'uniswap'],
            'EDUCATION': ['coursera', 'udemy', 'khan', 'duolingo', 'masterclass', 'udacity'],
            'TRAVEL': ['airbnb', 'booking', 'expedia', 'tripadvisor', 'kayak', 'hotels'],
            'PRODUCTIVITY': ['notion', 'asana', 'monday', 'trello', 'slack', 'zoom', 'miro']
        }
    
    def categorize_domain(self, domain: str) -> str:
        """Categorize a domain based on keywords"""
        domain_lower = domain.lower()
        
        for category, keywords in self.category_mapping.items():
            for keyword in keywords:
                if keyword in domain_lower:
                    return category
        
        # Fallback categorization based on common patterns
        if any(x in domain_lower for x in ['pay', 'bank', 'finance', 'money', 'cash']):
            return 'FINTECH'
        elif any(x in domain_lower for x in ['shop', 'store', 'buy', 'mall', 'market']):
            return 'ECOMMERCE'
        elif any(x in domain_lower for x in ['ai', 'ml', 'neural', 'deep', 'model']):
            return 'AI_ML'
        elif any(x in domain_lower for x in ['fashion', 'wear', 'cloth', 'style', 'apparel']):
            return 'FASHION'
        elif any(x in domain_lower for x in ['health', 'med', 'pharma', 'bio', 'care']):
            return 'HEALTHCARE'
        elif any(x in domain_lower for x in ['game', 'play', 'gaming', 'xbox', 'nintendo']):
            return 'GAMING'
        elif any(x in domain_lower for x in ['edu', 'learn', 'study', 'course', 'university']):
            return 'EDUCATION'
        elif any(x in domain_lower for x in ['travel', 'hotel', 'flight', 'trip', 'vacation']):
            return 'TRAVEL'
        elif any(x in domain_lower for x in ['news', 'media', 'tv', 'video', 'stream']):
            return 'MEDIA'
        
        return 'OTHER'
    
    def grade_llm_category_performance(self):
        """Grade each LLM's performance by category"""
        
        # Get all domain scores by model
        query = """
        WITH domain_scores AS (
            SELECT 
                d.domain,
                dr.model,
                dr.prompt_type,
                CAST(SUBSTRING(dr.response FROM '\\d+') AS FLOAT) as score,
                dr.created_at
            FROM domain_responses dr
            JOIN domains d ON d.id = dr.domain_id
            WHERE dr.prompt_type = 'memory_analysis'
                AND dr.created_at > NOW() - INTERVAL '30 days'
                AND SUBSTRING(dr.response FROM '\\d+') IS NOT NULL
        ),
        model_domain_stats AS (
            SELECT 
                domain,
                model,
                AVG(score) as avg_score,
                STDDEV(score) as score_stddev,
                COUNT(*) as response_count,
                MAX(score) as max_score,
                MIN(score) as min_score
            FROM domain_scores
            WHERE score >= 0 AND score <= 100
            GROUP BY domain, model
        )
        SELECT * FROM model_domain_stats
        ORDER BY domain, model
        """
        
        df = pd.read_sql(query, self.conn)
        
        # Categorize domains
        df['category'] = df['domain'].apply(self.categorize_domain)
        
        # Calculate LLM performance by category
        llm_category_grades = defaultdict(lambda: defaultdict(dict))
        
        for category in df['category'].unique():
            category_data = df[df['category'] == category]
            
            for model in category_data['model'].unique():
                model_data = category_data[category_data['model'] == model]
                
                if len(model_data) >= 5:  # Need enough data points
                    # Calculate performance metrics
                    metrics = {
                        'coverage': len(model_data) / len(category_data['domain'].unique()),  # % of category covered
                        'avg_memory_score': model_data['avg_score'].mean(),
                        'consistency': 1 - (model_data['score_stddev'].mean() / 50),  # Normalized consistency
                        'recall_strength': model_data[model_data['avg_score'] > 70].shape[0] / len(model_data),  # % well remembered
                        'amnesia_rate': model_data[model_data['avg_score'] < 30].shape[0] / len(model_data),  # % forgotten
                        'volatility': model_data['score_stddev'].mean(),
                        'domain_count': len(model_data)
                    }
                    
                    # Calculate composite trust score
                    trust_score = (
                        metrics['coverage'] * 0.25 +  # How much of category they know
                        (metrics['avg_memory_score'] / 100) * 0.25 +  # How well they remember
                        metrics['consistency'] * 0.25 +  # How consistent they are
                        metrics['recall_strength'] * 0.25  # How many they remember well
                    )
                    
                    llm_category_grades[model][category] = {
                        **metrics,
                        'trust_score': trust_score,
                        'grade': self._calculate_grade(trust_score)
                    }
        
        return llm_category_grades
    
    def _calculate_grade(self, trust_score: float) -> str:
        """Convert trust score to letter grade"""
        if trust_score >= 0.9: return 'A+'
        elif trust_score >= 0.85: return 'A'
        elif trust_score >= 0.8: return 'A-'
        elif trust_score >= 0.75: return 'B+'
        elif trust_score >= 0.7: return 'B'
        elif trust_score >= 0.65: return 'B-'
        elif trust_score >= 0.6: return 'C+'
        elif trust_score >= 0.55: return 'C'
        elif trust_score >= 0.5: return 'C-'
        elif trust_score >= 0.4: return 'D'
        else: return 'F'
    
    def find_category_specialists(self, grades: Dict) -> Dict:
        """Find which LLMs are best for each category"""
        category_leaders = defaultdict(list)
        
        for model, categories in grades.items():
            for category, metrics in categories.items():
                category_leaders[category].append({
                    'model': model,
                    'trust_score': metrics['trust_score'],
                    'grade': metrics['grade'],
                    'avg_memory': metrics['avg_memory_score'],
                    'coverage': metrics['coverage']
                })
        
        # Sort by trust score
        for category in category_leaders:
            category_leaders[category].sort(key=lambda x: x['trust_score'], reverse=True)
        
        return dict(category_leaders)
    
    def generate_routing_recommendations(self, category_leaders: Dict) -> Dict:
        """Generate routing recommendations for each category"""
        routing_map = {}
        
        for category, leaders in category_leaders.items():
            if leaders:
                # Primary choice - highest trust score
                primary = leaders[0]
                
                # Fallback choices - next best options
                fallbacks = [l for l in leaders[1:3] if l['trust_score'] > 0.5]
                
                # Consensus group - all models with B+ or better
                consensus_group = [l for l in leaders if l['grade'] in ['A+', 'A', 'A-', 'B+']]
                
                routing_map[category] = {
                    'primary_model': primary['model'],
                    'primary_trust': primary['trust_score'],
                    'primary_grade': primary['grade'],
                    'fallback_models': [f['model'] for f in fallbacks],
                    'consensus_models': [c['model'] for c in consensus_group],
                    'avoid_models': [l['model'] for l in leaders if l['grade'] in ['D', 'F']],
                    'category_coverage': len([l for l in leaders if l['trust_score'] > 0.6])
                }
        
        return routing_map
    
    def analyze_model_strengths(self, grades: Dict) -> Dict:
        """Analyze what each model is good/bad at"""
        model_profiles = {}
        
        for model in grades:
            categories = grades[model]
            
            # Sort categories by performance
            sorted_categories = sorted(
                categories.items(), 
                key=lambda x: x[1]['trust_score'], 
                reverse=True
            )
            
            # Identify strengths and weaknesses
            strengths = [cat for cat, metrics in sorted_categories if metrics['grade'] in ['A+', 'A', 'A-', 'B+']]
            weaknesses = [cat for cat, metrics in sorted_categories if metrics['grade'] in ['D', 'F']]
            average = [cat for cat, metrics in sorted_categories if metrics['grade'] in ['B', 'B-', 'C+', 'C', 'C-']]
            
            # Calculate model's overall profile
            all_scores = [metrics['trust_score'] for _, metrics in categories.items()]
            
            model_profiles[model] = {
                'strengths': strengths[:5],  # Top 5 categories
                'weaknesses': weaknesses[:5],  # Bottom 5 categories
                'average_areas': average[:3],
                'overall_trust': np.mean(all_scores) if all_scores else 0,
                'consistency': np.std(all_scores) if len(all_scores) > 1 else 0,
                'specialty_score': max(all_scores) if all_scores else 0,  # How good at their best category
                'coverage_breadth': len(categories),  # How many categories they cover
                'profile_type': self._determine_profile_type(strengths, weaknesses, average)
            }
        
        return model_profiles
    
    def _determine_profile_type(self, strengths: List, weaknesses: List, average: List) -> str:
        """Determine the model's profile type"""
        if len(strengths) > 5 and len(weaknesses) < 2:
            return "GENERALIST_STRONG"  # Good at most things
        elif len(strengths) > 3 and len(weaknesses) < len(strengths):
            return "BALANCED_PERFORMER"  # More strengths than weaknesses
        elif len(strengths) >= 2 and len(strengths) < 4:
            return "SPECIALIST"  # Good at specific categories
        elif len(weaknesses) > len(strengths):
            return "NARROW_FOCUS"  # Limited capabilities
        else:
            return "MIXED_PERFORMANCE"  # Inconsistent

def generate_report(grader: LLMCategoryGrader):
    """Generate comprehensive category grading report"""
    
    print("🎯 LLM Category Performance Grading System")
    print("=" * 60)
    
    # Grade LLMs by category
    print("\n📊 Grading LLMs by category performance...")
    grades = grader.grade_llm_category_performance()
    
    # Find category specialists
    print("\n🏆 Finding category specialists...")
    category_leaders = grader.find_category_specialists(grades)
    
    # Generate routing recommendations
    print("\n🔀 Generating routing recommendations...")
    routing_map = grader.generate_routing_recommendations(category_leaders)
    
    # Analyze model strengths
    print("\n💪 Analyzing model strengths and weaknesses...")
    model_profiles = grader.analyze_model_strengths(grades)
    
    # Display results
    print("\n" + "="*60)
    print("📊 CATEGORY LEADERSHIP BOARD")
    print("="*60)
    
    for category, leaders in category_leaders.items():
        if leaders:
            print(f"\n{category}:")
            for i, leader in enumerate(leaders[:3]):
                symbol = "🥇" if i == 0 else "🥈" if i == 1 else "🥉"
                print(f"  {symbol} {leader['model']}: {leader['grade']} "
                      f"(Trust: {leader['trust_score']:.2%}, Memory: {leader['avg_memory']:.1f})")
    
    print("\n" + "="*60)
    print("🧠 MODEL PERSONALITY PROFILES")
    print("="*60)
    
    for model, profile in model_profiles.items():
        print(f"\n{model.upper()} - {profile['profile_type']}")
        print(f"  Overall Trust: {profile['overall_trust']:.2%}")
        print(f"  Best Category Score: {profile['specialty_score']:.2%}")
        
        if profile['strengths']:
            print(f"  💪 Strengths: {', '.join(profile['strengths'][:3])}")
        if profile['weaknesses']:
            print(f"  💩 Weaknesses: {', '.join(profile['weaknesses'][:3])}")
    
    print("\n" + "="*60)
    print("🔀 ROUTING RECOMMENDATIONS")
    print("="*60)
    
    for category, routing in routing_map.items():
        print(f"\n{category}:")
        print(f"  Primary: {routing['primary_model']} ({routing['primary_grade']})")
        if routing['fallback_models']:
            print(f"  Fallbacks: {', '.join(routing['fallback_models'])}")
        if routing['avoid_models']:
            print(f"  ⚠️  Avoid: {', '.join(routing['avoid_models'])}")
    
    # Save results
    results = {
        'timestamp': datetime.now().isoformat(),
        'llm_category_grades': {k: dict(v) for k, v in grades.items()},
        'category_leaders': category_leaders,
        'routing_recommendations': routing_map,
        'model_profiles': model_profiles
    }
    
    with open('llm_category_grades.json', 'w') as f:
        json.dump(results, f, indent=2, default=str)
    
    print(f"\n\n💾 Full analysis saved to llm_category_grades.json")
    
    # Key insights
    print("\n" + "="*60)
    print("🔥 KEY INSIGHTS")
    print("="*60)
    
    # Find category monopolies
    monopolies = [cat for cat, leaders in category_leaders.items() 
                  if leaders and leaders[0]['trust_score'] > 0.8 and 
                  (len(leaders) < 2 or leaders[1]['trust_score'] < 0.6)]
    
    if monopolies:
        print(f"\n🏆 Category Monopolies (one model dominates):")
        for cat in monopolies:
            print(f"  - {cat}: {category_leaders[cat][0]['model']} owns this space")
    
    # Find contested categories
    contested = [cat for cat, leaders in category_leaders.items() 
                 if len(leaders) >= 2 and 
                 abs(leaders[0]['trust_score'] - leaders[1]['trust_score']) < 0.05]
    
    if contested:
        print(f"\n⚔️  Contested Categories (close competition):")
        for cat in contested:
            print(f"  - {cat}: {category_leaders[cat][0]['model']} vs {category_leaders[cat][1]['model']}")
    
    # Find blind spots
    blind_spots = [cat for cat, routing in routing_map.items() 
                   if routing['primary_trust'] < 0.5]
    
    if blind_spots:
        print(f"\n🕳️  Industry Blind Spots (all models struggle):")
        for cat in blind_spots:
            print(f"  - {cat}: Best model only {routing_map[cat]['primary_trust']:.2%} trust")
    
    return results

def main():
    # Database connection
    conn = psycopg2.connect(
        "postgresql://raw_capture_db_user:wjFesUM8ISNEvE2b4kZtRAKgGYJVtKK5@"
        "dpg-d11fqgndiees73fb35dg-a.oregon-postgres.render.com/raw_capture_db",
        sslmode='require'
    )
    
    try:
        grader = LLMCategoryGrader(conn)
        results = generate_report(grader)
        
    finally:
        conn.close()

if __name__ == "__main__":
    main()