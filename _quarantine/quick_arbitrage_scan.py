#!/usr/bin/env python3
"""
Quick arbitrage opportunity scanner
Simplified version that works with current schema
"""

import psycopg2
from psycopg2.extras import RealDictCursor
import json
from datetime import datetime

# Database connection
conn = psycopg2.connect(
    "postgresql://raw_capture_db_user:wjFesUM8ISNEvE2b4kZtRAKgGYJVtKK5@"
    "dpg-d11fqgndiees73fb35dg-a.oregon-postgres.render.com/raw_capture_db",
    sslmode='require'
)

def find_consensus_divergence():
    """Find domains where models disagree significantly"""
    query = """
    WITH model_scores AS (
        SELECT 
            d.domain,
            dr.model,
            CAST(SUBSTRING(dr.response FROM '\d+') AS FLOAT) as score,
            dr.created_at
        FROM domain_responses dr
        JOIN domains d ON d.id = dr.domain_id
        WHERE dr.prompt_type = 'memory_analysis'
            AND dr.created_at > NOW() - INTERVAL '30 days'
            AND SUBSTRING(dr.response FROM '\d+') IS NOT NULL
    ),
    domain_consensus AS (
        SELECT 
            domain,
            COUNT(DISTINCT model) as model_count,
            AVG(score) as avg_score,
            STDDEV(score) as std_dev,
            MAX(score) - MIN(score) as score_range,
            MAX(score) as max_score,
            MIN(score) as min_score
        FROM model_scores
        WHERE score > 0 AND score <= 100
        GROUP BY domain
        HAVING COUNT(DISTINCT model) >= 3
            AND STDDEV(score) > 10
    )
    SELECT * FROM domain_consensus
    ORDER BY std_dev DESC
    LIMIT 20
    """
    
    with conn.cursor(cursor_factory=RealDictCursor) as cur:
        cur.execute(query)
        return cur.fetchall()

def find_memory_cliffs():
    """Find dramatic score changes"""
    query = """
    WITH score_timeline AS (
        SELECT 
            d.domain,
            dr.model,
            dr.created_at::date as score_date,
            AVG(CAST(SUBSTRING(dr.response FROM '\d+') AS FLOAT)) as daily_score
        FROM domain_responses dr
        JOIN domains d ON d.id = dr.domain_id
        WHERE dr.prompt_type = 'memory_analysis'
            AND dr.created_at > NOW() - INTERVAL '30 days'
            AND SUBSTRING(dr.response FROM '\d+') IS NOT NULL
        GROUP BY d.domain, dr.model, dr.created_at::date
    ),
    score_changes AS (
        SELECT 
            domain,
            model,
            score_date,
            daily_score,
            LAG(daily_score) OVER (PARTITION BY domain, model ORDER BY score_date) as prev_score,
            daily_score - LAG(daily_score) OVER (PARTITION BY domain, model ORDER BY score_date) as change
        FROM score_timeline
        WHERE daily_score > 0 AND daily_score <= 100
    )
    SELECT 
        domain,
        model,
        score_date,
        prev_score,
        daily_score,
        change,
        ABS(change) as cliff_size
    FROM score_changes
    WHERE ABS(change) > 20
    ORDER BY ABS(change) DESC
    LIMIT 20
    """
    
    with conn.cursor(cursor_factory=RealDictCursor) as cur:
        cur.execute(query)
        return cur.fetchall()

def find_frozen_perceptions():
    """Find domains with static scores (low velocity)"""
    query = """
    WITH score_history AS (
        SELECT 
            d.domain,
            dr.created_at::date as score_date,
            AVG(CAST(SUBSTRING(dr.response FROM '\d+') AS FLOAT)) as daily_score
        FROM domain_responses dr
        JOIN domains d ON d.id = dr.domain_id
        WHERE dr.prompt_type = 'memory_analysis'
            AND dr.created_at > NOW() - INTERVAL '30 days'
            AND SUBSTRING(dr.response FROM '\d+') IS NOT NULL
        GROUP BY d.domain, dr.created_at::date
    ),
    velocity_calc AS (
        SELECT 
            domain,
            COUNT(DISTINCT score_date) as data_points,
            STDDEV(daily_score) as score_volatility,
            MAX(daily_score) - MIN(daily_score) as score_range,
            AVG(daily_score) as avg_score
        FROM score_history
        WHERE daily_score > 0 AND daily_score <= 100
        GROUP BY domain
        HAVING COUNT(DISTINCT score_date) >= 5
    )
    SELECT 
        domain,
        data_points,
        score_volatility,
        score_range,
        avg_score,
        CASE 
            WHEN score_volatility < 2 THEN 'FROZEN'
            WHEN score_volatility < 5 THEN 'SLOW'
            WHEN score_volatility < 10 THEN 'MEDIUM'
            ELSE 'FAST'
        END as velocity_tier
    FROM velocity_calc
    WHERE score_volatility < 5  -- Focus on frozen/slow domains
    ORDER BY score_volatility ASC
    LIMIT 20
    """
    
    with conn.cursor(cursor_factory=RealDictCursor) as cur:
        cur.execute(query)
        return cur.fetchall()

def find_model_clusters():
    """Identify which models tend to agree"""
    query = """
    WITH model_pairs AS (
        SELECT 
            dr1.model as model1,
            dr2.model as model2,
            d.domain,
            ABS(
                CAST(SUBSTRING(dr1.response FROM '\d+') AS FLOAT) - 
                CAST(SUBSTRING(dr2.response FROM '\d+') AS FLOAT)
            ) as score_diff
        FROM domain_responses dr1
        JOIN domain_responses dr2 ON dr1.domain_id = dr2.domain_id 
            AND dr1.model < dr2.model
            AND dr1.prompt_type = dr2.prompt_type
        JOIN domains d ON d.id = dr1.domain_id
        WHERE dr1.prompt_type = 'memory_analysis'
            AND dr1.created_at > NOW() - INTERVAL '7 days'
            AND dr2.created_at > NOW() - INTERVAL '7 days'
            AND SUBSTRING(dr1.response FROM '\d+') IS NOT NULL
            AND SUBSTRING(dr2.response FROM '\d+') IS NOT NULL
    )
    SELECT 
        model1,
        model2,
        COUNT(*) as comparisons,
        AVG(score_diff) as avg_difference,
        STDDEV(score_diff) as diff_volatility
    FROM model_pairs
    WHERE score_diff >= 0
    GROUP BY model1, model2
    HAVING COUNT(*) > 10
    ORDER BY avg_difference ASC
    LIMIT 20
    """
    
    with conn.cursor(cursor_factory=RealDictCursor) as cur:
        cur.execute(query)
        return cur.fetchall()

def main():
    print("🎯 AI Memory Arbitrage Quick Scan")
    print("=" * 50)
    
    # 1. Consensus Divergence
    print("\n📊 CONSENSUS DIVERGENCE (Models Disagree)")
    divergences = find_consensus_divergence()
    
    if divergences:
        print(f"Found {len(divergences)} domains with high model disagreement:\n")
        for d in divergences[:10]:
            print(f"  {d['domain']}")
            print(f"    Models: {d['model_count']} | Avg: {d['avg_score']:.1f} | StdDev: {d['std_dev']:.1f}")
            print(f"    Range: {d['min_score']:.0f}-{d['max_score']:.0f} ({d['score_range']:.0f} points)")
            print()
    
    # 2. Memory Cliffs
    print("\n📉 MEMORY CLIFFS (Dramatic Changes)")
    cliffs = find_memory_cliffs()
    
    if cliffs:
        print(f"Found {len(cliffs)} memory cliff events:\n")
        for c in cliffs[:10]:
            direction = "↑" if c['change'] > 0 else "↓"
            print(f"  {c['domain']} ({c['model']})")
            print(f"    {c['prev_score']:.0f} → {c['daily_score']:.0f} {direction} ({c['cliff_size']:.0f} points)")
            print(f"    Date: {c['score_date']}")
            print()
    
    # 3. Frozen Perceptions
    print("\n🧊 FROZEN PERCEPTIONS (Low Velocity)")
    frozen = find_frozen_perceptions()
    
    if frozen:
        print(f"Found {len(frozen)} domains with frozen/slow memory:\n")
        for f in frozen[:10]:
            print(f"  {f['domain']}")
            print(f"    Velocity: {f['velocity_tier']} | Volatility: {f['score_volatility']:.2f}")
            print(f"    Avg Score: {f['avg_score']:.1f} | Range: {f['score_range']:.1f}")
            print()
    
    # 4. Model Clusters
    print("\n🤝 MODEL CONSENSUS CLUSTERS")
    clusters = find_model_clusters()
    
    if clusters:
        print("Models that tend to agree (low avg difference):\n")
        for c in clusters[:10]:
            print(f"  {c['model1']} ↔ {c['model2']}")
            print(f"    Avg Difference: {c['avg_difference']:.1f} points")
            print(f"    Comparisons: {c['comparisons']}")
            print()
    
    # Save results
    results = {
        'timestamp': datetime.now().isoformat(),
        'consensus_divergences': divergences,
        'memory_cliffs': cliffs,
        'frozen_perceptions': frozen,
        'model_clusters': clusters
    }
    
    with open('quick_arbitrage_scan_results.json', 'w') as f:
        json.dump(results, f, indent=2, default=str)
    
    print("\n💾 Full results saved to quick_arbitrage_scan_results.json")
    
    # Key insights
    print("\n🔍 KEY INSIGHTS:")
    if divergences:
        print(f"  • Found {len(divergences)} domains with >10 point model disagreement")
    if cliffs:
        print(f"  • Detected {len(cliffs)} memory cliff events (>20 point changes)")
    if frozen:
        frozen_count = len([f for f in frozen if f['velocity_tier'] == 'FROZEN'])
        print(f"  • {frozen_count} domains have FROZEN memory (volatility <2)")
    if clusters:
        tight_clusters = [c for c in clusters if c['avg_difference'] < 5]
        print(f"  • {len(tight_clusters)} model pairs show tight consensus (<5 point avg diff)")

if __name__ == "__main__":
    try:
        main()
    finally:
        conn.close()