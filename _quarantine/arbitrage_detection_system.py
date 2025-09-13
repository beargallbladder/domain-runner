#!/usr/bin/env python3
"""
AI Memory Arbitrage Detection System
Identifies and quantifies arbitrage opportunities from AI perception gaps
"""

import os
import numpy as np
import pandas as pd
from dataclasses import dataclass
from typing import Dict, List, Tuple, Optional
from datetime import datetime, timedelta
import json
from sklearn.cluster import DBSCAN
from sklearn.preprocessing import StandardScaler
from scipy.stats import pearsonr, spearmanr
import psycopg2
from psycopg2.extras import RealDictCursor
from urllib.parse import urlparse

@dataclass
class ArbitrageOpportunity:
    domain: str
    gap_score: float  # |AI_Memory - Reality|
    velocity: float   # Update speed (changes/week)
    persistence: float  # Expected gap duration
    market_size: float  # Domain importance
    risk_score: float  # Regulatory/liability risk
    roi_estimate: float  # Expected return
    confidence: float  # Prediction confidence
    strategy: str  # Recommended action

class ConsensusClusterAnalyzer:
    """Detect which LLMs are 'fading together' in consensus groups"""
    
    def __init__(self, db_connection):
        self.conn = db_connection
        self.model_clusters = {}
        
    def analyze_model_consensus(self, timeframe_days=30):
        """Find which models agree on which topics/categories"""
        query = """
        SELECT 
            dr1.model as model1,
            dr2.model as model2,
            d.domain,
            cat.category,
            AVG(
                1 - ABS(
                    CAST(SUBSTRING(dr1.response FROM '\\d+') AS FLOAT) - 
                    CAST(SUBSTRING(dr2.response FROM '\\d+') AS FLOAT)
                ) / 100
            ) as agreement_score
        FROM domain_responses dr1
        JOIN domain_responses dr2 ON dr1.domain_id = dr2.domain_id 
            AND dr1.model < dr2.model
            AND dr1.prompt_type = dr2.prompt_type
        JOIN domains d ON d.id = dr1.domain_id
        LEFT JOIN domain_categories cat ON cat.domain = d.domain
        WHERE dr1.created_at > NOW() - INTERVAL '%s days'
            AND dr2.created_at > NOW() - INTERVAL '%s days'
            AND dr1.prompt_type = 'memory_analysis'
        GROUP BY dr1.model, dr2.model, d.domain, cat.category
        """
        
        df = pd.read_sql(query, self.conn, params=(timeframe_days, timeframe_days))
        
        # Create model similarity matrix
        models = df['model1'].unique().tolist() + df['model2'].unique().tolist()
        models = list(set(models))
        
        similarity_matrix = pd.DataFrame(
            index=models, 
            columns=models,
            data=np.eye(len(models))
        )
        
        for _, row in df.iterrows():
            similarity_matrix.loc[row['model1'], row['model2']] = row['agreement_score']
            similarity_matrix.loc[row['model2'], row['model1']] = row['agreement_score']
        
        # Cluster models using DBSCAN
        clustering = DBSCAN(eps=0.15, min_samples=2, metric='precomputed')
        distance_matrix = 1 - similarity_matrix.values
        clusters = clustering.fit_predict(distance_matrix)
        
        # Group models by cluster
        self.model_clusters = {}
        for idx, cluster in enumerate(clusters):
            model = models[idx]
            if cluster not in self.model_clusters:
                self.model_clusters[cluster] = []
            self.model_clusters[cluster].append(model)
            
        return self.model_clusters
    
    def find_consensus_divergence(self, domain: str) -> Dict:
        """Find where model consensus breaks down for a specific domain"""
        query = """
        SELECT 
            model,
            prompt_type,
            response,
            created_at
        FROM domain_responses dr
        JOIN domains d ON d.id = dr.domain_id
        WHERE d.domain = %s
        ORDER BY created_at DESC
        """
        
        with self.conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(query, (domain,))
            responses = cur.fetchall()
        
        # Extract memory scores
        model_scores = {}
        for resp in responses:
            if 'memory_analysis' in resp['prompt_type']:
                # Extract numeric score from response
                import re
                score_match = re.search(r'(\d+)\s*(?:out of 100|/100)', resp['response'])
                if score_match:
                    model_scores[resp['model']] = float(score_match.group(1))
        
        # Calculate divergence metrics
        if len(model_scores) > 1:
            scores = list(model_scores.values())
            divergence = {
                'std_dev': np.std(scores),
                'range': max(scores) - min(scores),
                'cv': np.std(scores) / np.mean(scores) if np.mean(scores) > 0 else 0,
                'outliers': self._find_outliers(model_scores),
                'consensus_score': 1 - (np.std(scores) / 50)  # Normalized consensus
            }
        else:
            divergence = {'consensus_score': 0, 'std_dev': 0}
            
        return divergence
    
    def _find_outliers(self, model_scores: Dict) -> List:
        """Identify models that diverge from consensus"""
        scores = list(model_scores.values())
        mean = np.mean(scores)
        std = np.std(scores)
        
        outliers = []
        for model, score in model_scores.items():
            z_score = abs((score - mean) / std) if std > 0 else 0
            if z_score > 1.5:  # 1.5 standard deviations
                outliers.append({
                    'model': model,
                    'score': score,
                    'deviation': score - mean,
                    'z_score': z_score
                })
        
        return outliers

class MemoryVelocityCalculator:
    """Track how fast AI memory updates for different domains"""
    
    def __init__(self, db_connection):
        self.conn = db_connection
        
    def calculate_update_velocity(self, domain: str, window_days=30) -> float:
        """Calculate memory update velocity (changes per week)"""
        query = """
        SELECT 
            DATE(created_at) as date,
            AVG(CAST(SUBSTRING(response FROM '\\d+') AS FLOAT)) as avg_score
        FROM domain_responses dr
        JOIN domains d ON d.id = dr.domain_id
        WHERE d.domain = %s
            AND prompt_type = 'memory_analysis'
            AND created_at > NOW() - INTERVAL '%s days'
        GROUP BY DATE(created_at)
        ORDER BY date
        """
        
        df = pd.read_sql(query, self.conn, params=(domain, window_days))
        
        if len(df) < 2:
            return 0.0
            
        # Calculate daily changes
        df['score_change'] = df['avg_score'].diff().abs()
        
        # Weekly velocity = average daily change * 7
        velocity = df['score_change'].mean() * 7
        
        return velocity
    
    def classify_velocity_tier(self, velocity: float) -> str:
        """Classify domain into velocity tier"""
        if velocity < 1.0:
            return "FROZEN"  # <1 point/week
        elif velocity < 5.0:
            return "SLOW"    # 1-5 points/week
        elif velocity < 10.0:
            return "MEDIUM"  # 5-10 points/week
        else:
            return "FAST"    # >10 points/week

class ArbitrageDetector:
    """Core arbitrage opportunity detection engine"""
    
    def __init__(self, db_connection):
        self.conn = db_connection
        self.consensus_analyzer = ConsensusClusterAnalyzer(db_connection)
        self.velocity_calculator = MemoryVelocityCalculator(db_connection)
        
    def find_arbitrage_opportunities(self, min_gap=10.0, min_roi=2.0) -> List[ArbitrageOpportunity]:
        """Find domains with profitable perception gaps"""
        
        # Get domains with recent activity
        query = """
        SELECT DISTINCT
            d.domain,
            d.status,
            cat.category_name as category,
            NULL as market_position,
            COUNT(dr.id) as response_count
        FROM domains d
        LEFT JOIN domain_categories cat ON cat.domain = d.domain
        JOIN domain_responses dr ON dr.domain_id = d.id
        WHERE dr.created_at > NOW() - INTERVAL '30 days'
        GROUP BY d.domain, d.status, cat.category_name
        HAVING COUNT(dr.id) > 5
        """
        
        domains_df = pd.read_sql(query, self.conn)
        opportunities = []
        
        for _, domain_row in domains_df.iterrows():
            domain = domain_row['domain']
            
            # Calculate perception gap
            gap = self._calculate_perception_gap(domain)
            if gap < min_gap:
                continue
                
            # Calculate velocity
            velocity = self.velocity_calculator.calculate_update_velocity(domain)
            velocity_tier = self.velocity_calculator.classify_velocity_tier(velocity)
            
            # Calculate persistence (inverse of velocity)
            persistence = 1.0 / (velocity + 0.1)  # Avoid division by zero
            
            # Estimate market size (based on category and position)
            market_size = self._estimate_market_size(
                domain_row.get('category', 'OTHER'),
                domain_row.get('market_position', 'AVERAGE')
            )
            
            # Calculate risk score
            risk = self._calculate_risk_score(domain, domain_row.get('category', 'OTHER'))
            
            # ROI = (Gap × Persistence × Market Size) / Risk
            roi = (gap * persistence * market_size) / (risk + 1.0)
            
            if roi >= min_roi:
                # Determine strategy
                if velocity_tier == "FROZEN" and gap > 20:
                    strategy = "LONG_TERM_ARBITRAGE"
                elif velocity_tier == "FAST" and gap > 15:
                    strategy = "SHORT_TERM_MOMENTUM"
                elif persistence > 4 and market_size > 0.7:
                    strategy = "STRATEGIC_POSITIONING"
                else:
                    strategy = "OPPORTUNISTIC"
                    
                opportunity = ArbitrageOpportunity(
                    domain=domain,
                    gap_score=gap,
                    velocity=velocity,
                    persistence=persistence,
                    market_size=market_size,
                    risk_score=risk,
                    roi_estimate=roi,
                    confidence=self._calculate_confidence(domain_row['response_count']),
                    strategy=strategy
                )
                opportunities.append(opportunity)
        
        # Sort by ROI
        opportunities.sort(key=lambda x: x.roi_estimate, reverse=True)
        
        return opportunities
    
    def _calculate_perception_gap(self, domain: str) -> float:
        """Calculate gap between AI memory and recent sentiment"""
        query = """
        WITH memory_scores AS (
            SELECT 
                AVG(CAST(SUBSTRING(response FROM '\\d+') AS FLOAT)) as avg_memory
            FROM domain_responses dr
            JOIN domains d ON d.id = dr.domain_id
            WHERE d.domain = %s
                AND prompt_type = 'memory_analysis'
                AND created_at > NOW() - INTERVAL '7 days'
        ),
        sentiment_scores AS (
            SELECT 
                AVG(CAST(SUBSTRING(response FROM '\\d+') AS FLOAT)) as avg_sentiment
            FROM domain_responses dr
            JOIN domains d ON d.id = dr.domain_id
            WHERE d.domain = %s
                AND prompt_type LIKE '%%sentiment%%'
                AND created_at > NOW() - INTERVAL '7 days'
        )
        SELECT 
            COALESCE(m.avg_memory, 50) as memory,
            COALESCE(s.avg_sentiment, 50) as sentiment
        FROM memory_scores m, sentiment_scores s
        """
        
        with self.conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(query, (domain, domain))
            result = cur.fetchone()
            
        if result:
            return abs(result['memory'] - result['sentiment'])
        return 0.0
    
    def _estimate_market_size(self, category: str, position: str) -> float:
        """Estimate market importance (0-1 scale)"""
        category_weights = {
            'TECH_GIANT': 1.0,
            'FINTECH': 0.9,
            'AI_ML': 0.85,
            'ECOMMERCE': 0.8,
            'MEDIA': 0.7,
            'OTHER': 0.5
        }
        
        position_multipliers = {
            'DOMINANT': 1.2,
            'STRONG': 1.0,
            'COMPETITIVE': 0.8,
            'AVERAGE': 0.6,
            'WEAK': 0.4
        }
        
        base_score = category_weights.get(category, 0.5)
        multiplier = position_multipliers.get(position, 0.6)
        
        return min(base_score * multiplier, 1.0)
    
    def _calculate_risk_score(self, domain: str, category: str) -> float:
        """Calculate regulatory and liability risk (0-10 scale)"""
        # High risk categories
        high_risk_categories = ['FINTECH', 'HEALTHCARE', 'PHARMA', 'INSURANCE']
        
        base_risk = 1.0
        
        if category in high_risk_categories:
            base_risk = 5.0
            
        # Check for regulatory keywords in responses
        query = """
        SELECT COUNT(*) as reg_mentions
        FROM domain_responses dr
        JOIN domains d ON d.id = dr.domain_id
        WHERE d.domain = %s
            AND (
                response ILIKE '%%regulat%%' OR
                response ILIKE '%%complian%%' OR
                response ILIKE '%%legal%%' OR
                response ILIKE '%%lawsuit%%'
            )
        """
        
        with self.conn.cursor() as cur:
            cur.execute(query, (domain,))
            reg_count = cur.fetchone()[0]
            
        # Increase risk based on regulatory mentions
        risk_multiplier = 1 + (reg_count * 0.1)
        
        return min(base_risk * risk_multiplier, 10.0)
    
    def _calculate_confidence(self, response_count: int) -> float:
        """Calculate confidence based on data availability"""
        # Sigmoid function: more data = higher confidence
        return 1 / (1 + np.exp(-0.1 * (response_count - 20)))

class MemoryCliffDetector:
    """Detect dramatic memory score drops"""
    
    def __init__(self, db_connection):
        self.conn = db_connection
        
    def find_memory_cliffs(self, threshold=20.0) -> List[Dict]:
        """Find domains that experienced memory cliffs"""
        query = """
        WITH score_changes AS (
            SELECT 
                d.domain,
                dr.model,
                dr.created_at,
                CAST(SUBSTRING(dr.response FROM '\\d+') AS FLOAT) as score,
                LAG(CAST(SUBSTRING(dr.response FROM '\\d+') AS FLOAT)) 
                    OVER (PARTITION BY d.domain, dr.model ORDER BY dr.created_at) as prev_score
            FROM domain_responses dr
            JOIN domains d ON d.id = dr.domain_id
            WHERE dr.prompt_type = 'memory_analysis'
                AND dr.created_at > NOW() - INTERVAL '30 days'
        )
        SELECT 
            domain,
            model,
            created_at,
            score,
            prev_score,
            ABS(score - prev_score) as drop_size
        FROM score_changes
        WHERE prev_score IS NOT NULL
            AND ABS(score - prev_score) > %s
        ORDER BY drop_size DESC
        """
        
        df = pd.read_sql(query, self.conn, params=(threshold,))
        
        cliffs = []
        for _, row in df.iterrows():
            cliff = {
                'domain': row['domain'],
                'model': row['model'],
                'date': row['created_at'],
                'before_score': row['prev_score'],
                'after_score': row['score'],
                'drop_size': row['drop_size'],
                'direction': 'DOWN' if row['score'] < row['prev_score'] else 'UP'
            }
            cliffs.append(cliff)
            
        return cliffs

def main():
    """Run arbitrage detection system"""
    # Database connection with security
    DATABASE_URL = os.environ.get('DATABASE_URL')
    if not DATABASE_URL:
        raise ValueError("DATABASE_URL environment variable is required")
    
    # Parse and validate database URL
    parsed = urlparse(DATABASE_URL)
    if not all([parsed.scheme, parsed.hostname, parsed.username]):
        raise ValueError("Invalid DATABASE_URL format")
    
    conn = psycopg2.connect(DATABASE_URL, sslmode='require')
    
    try:
        # Initialize detector
        detector = ArbitrageDetector(conn)
        
        print("🎯 AI Memory Arbitrage Detection System")
        print("=" * 50)
        
        # Find arbitrage opportunities
        print("\n📊 Scanning for arbitrage opportunities...")
        opportunities = detector.find_arbitrage_opportunities(min_gap=10, min_roi=1.5)
        
        print(f"\n✅ Found {len(opportunities)} arbitrage opportunities\n")
        
        # Display top opportunities
        for i, opp in enumerate(opportunities[:10]):
            print(f"{i+1}. {opp.domain}")
            print(f"   Gap Score: {opp.gap_score:.1f} | Velocity: {opp.velocity:.1f}/week")
            print(f"   Persistence: {opp.persistence:.1f} | Market Size: {opp.market_size:.2f}")
            print(f"   Risk: {opp.risk_score:.1f} | ROI: {opp.roi_estimate:.2f}x")
            print(f"   Strategy: {opp.strategy}")
            print(f"   Confidence: {opp.confidence:.0%}")
            print()
        
        # Analyze consensus clusters
        print("\n🤝 Analyzing model consensus clusters...")
        consensus = ConsensusClusterAnalyzer(conn)
        clusters = consensus.analyze_model_consensus()
        
        print(f"\nFound {len(clusters)} consensus clusters:")
        for cluster_id, models in clusters.items():
            if cluster_id != -1:  # -1 is noise in DBSCAN
                print(f"\nCluster {cluster_id}: {', '.join(models)}")
        
        # Find memory cliffs
        print("\n📉 Detecting memory cliffs...")
        cliff_detector = MemoryCliffDetector(conn)
        cliffs = cliff_detector.find_memory_cliffs(threshold=20)
        
        print(f"\nFound {len(cliffs)} memory cliffs:")
        for cliff in cliffs[:5]:
            print(f"\n{cliff['domain']} ({cliff['model']})")
            print(f"   {cliff['before_score']:.0f} → {cliff['after_score']:.0f} "
                  f"({cliff['drop_size']:.0f} point {cliff['direction']})")
            print(f"   Date: {cliff['date']}")
            
        # Save results
        results = {
            'timestamp': datetime.now().isoformat(),
            'opportunities': [
                {
                    'domain': opp.domain,
                    'gap_score': opp.gap_score,
                    'velocity': opp.velocity,
                    'persistence': opp.persistence,
                    'market_size': opp.market_size,
                    'risk_score': opp.risk_score,
                    'roi_estimate': opp.roi_estimate,
                    'confidence': opp.confidence,
                    'strategy': opp.strategy
                }
                for opp in opportunities
            ],
            'consensus_clusters': clusters,
            'memory_cliffs': cliffs[:20]
        }
        
        with open('arbitrage_opportunities.json', 'w') as f:
            json.dump(results, f, indent=2, default=str)
            
        print("\n💾 Results saved to arbitrage_opportunities.json")
        
    finally:
        conn.close()

if __name__ == "__main__":
    try:
        main()
    except Exception as e:
        print(f"Error: {e}")
        import sys
        sys.exit(1)