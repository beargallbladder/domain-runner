#!/usr/bin/env python3
"""
🎯 FACEBOOK AD TARGET FINDER
Find competitive pairs where we can send targeted ads to the losing company
"""

import asyncio
import asyncpg
import os
import sys

async def find_competitive_pairs():
    try:
        db_url = os.getenv('DATABASE_URL', 'postgresql://llmpagerank_user:llmpagerank2024@localhost:5432/llmpagerank')
        conn = await asyncpg.connect(db_url)
        
        # Get companies with competitive gaps we can target
        pairs = await conn.fetch('''
            WITH ranked_domains AS (
                SELECT domain, memory_score, business_focus,
                       ROW_NUMBER() OVER (PARTITION BY business_focus ORDER BY memory_score DESC) as rank
                FROM public_domain_cache 
                WHERE memory_score > 0 AND business_focus IS NOT NULL
            )
            SELECT 
                d1.domain as leader_domain, d1.memory_score as leader_score,
                d2.domain as follower_domain, d2.memory_score as follower_score,
                d1.business_focus as category,
                ROUND(d1.memory_score - d2.memory_score, 1) as score_gap
            FROM ranked_domains d1
            JOIN ranked_domains d2 ON d1.business_focus = d2.business_focus 
            WHERE d1.rank = 1 AND d2.rank = 2 AND (d1.memory_score - d2.memory_score) > 5
            ORDER BY score_gap DESC
            LIMIT 10
        ''')
        
        print('🎯 TOP COMPETITIVE AD TARGETS:')
        print('=' * 60)
        for pair in pairs:
            leader = pair['leader_domain'].replace('.com', '').title()
            follower = pair['follower_domain'].replace('.com', '').title()
            
            print(f'📈 {pair["leader_domain"]} (Score: {pair["leader_score"]:.1f})')
            print(f'📉 TARGET: {pair["follower_domain"]} (Score: {pair["follower_score"]:.1f})')
            print(f'🏷️  Category: {pair["category"]}')
            print(f'📊 Gap: {pair["score_gap"]}%')
            print(f'💡 Ad to {follower}: "{leader} appears in {pair["score_gap"]}% more AI responses than your brand"')
            print(f'🔗 Landing: llmpagerank.com/{pair["follower_domain"].replace(".com", "")}-competitive-analysis')
            print('-' * 60)
        
        await conn.close()
        
    except Exception as e:
        print(f'Error: {e}')
        # Try alternative connection for local development
        try:
            print("Trying local database...")
            conn = await asyncpg.connect('postgresql://localhost/llmpagerank')
            pairs = await conn.fetch('''
                SELECT domain, memory_score, business_focus 
                FROM public_domain_cache 
                WHERE memory_score > 50 
                ORDER BY memory_score DESC 
                LIMIT 5
            ''')
            print("Sample domains in database:")
            for pair in pairs:
                print(f"- {pair['domain']}: {pair['memory_score']:.1f} ({pair['business_focus']})")
            await conn.close()
        except:
            print("No database connection available")

if __name__ == "__main__":
    asyncio.run(find_competitive_pairs()) 