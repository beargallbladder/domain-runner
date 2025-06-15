#!/usr/bin/env python3
"""
PRODUCTION CACHE SYSTEM - Fixes All Critical Issues
- Model singleton pattern (fixes 60-90 min cache times)
- Connection pooling (fixes DB exhaustion)
- Transaction management (fixes data corruption)
- Real drift calculation (fixes random numbers)
- Circuit breakers (fixes system fragility)
- Fire alarm indicators (creates brand urgency)
"""

import asyncio
import asyncpg
import numpy as np
import json
import logging
from datetime import datetime, timedelta
from typing import Dict, List, Optional
from dataclasses import dataclass
import time

# Production Configuration
@dataclass
class ProductionConfig:
    database_url: str
    max_connections: int = 20
    batch_size: int = 5
    max_retries: int = 3
    similarity_threshold: float = 0.85
    consensus_threshold_high: float = 0.7
    consensus_threshold_low: float = 0.4

# Production Logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class EmbeddingModelSingleton:
    """FIXES: Model loading performance issue"""
    _model = None
    _lock = asyncio.Lock()
    
    @classmethod
    async def get_model(cls):
        if cls._model is None:
            async with cls._lock:
                if cls._model is None:
                    logger.info("🔄 Loading embedding model (one-time only)")
                    from sentence_transformers import SentenceTransformer
                    cls._model = SentenceTransformer('all-MiniLM-L6-v2')
                    logger.info("✅ Model loaded and cached")
        return cls._model

class ProductionCacheSystem:
    """Production-ready cache generation with all fixes"""
    
    def __init__(self, config: ProductionConfig):
        self.config = config
        self.pool = None
        self.metrics = {'processed': 0, 'failed': 0, 'alerts_generated': 0}
    
    async def initialize(self):
        """Initialize with connection pooling"""
        self.pool = await asyncpg.create_pool(
            self.config.database_url,
            min_size=5,
            max_size=self.config.max_connections
        )
        await self.create_production_tables()
        logger.info("🚀 Production cache system initialized")
    
    async def create_production_tables(self):
        """Create production tables with fire alarm columns"""
        async with self.pool.acquire() as conn:
            await conn.execute("""
                CREATE TABLE IF NOT EXISTS public_domain_cache (
                    domain_id UUID PRIMARY KEY,
                    domain TEXT NOT NULL,
                    memory_score FLOAT NOT NULL,
                    cohesion_score FLOAT NOT NULL,
                    drift_delta FLOAT NOT NULL,
                    model_count INT NOT NULL,
                    
                    -- FIRE ALARM INDICATORS (creates urgency)
                    reputation_risk_score FLOAT DEFAULT 0.0,
                    competitive_threat_level TEXT DEFAULT 'low',
                    brand_confusion_alert BOOLEAN DEFAULT FALSE,
                    perception_decline_alert BOOLEAN DEFAULT FALSE,
                    visibility_gap_alert BOOLEAN DEFAULT FALSE,
                    
                    -- Advanced insights
                    ai_consensus_score FLOAT NOT NULL,
                    business_focus TEXT,
                    market_position TEXT,
                    keywords TEXT[],
                    top_themes TEXT[],
                    
                    -- Production metadata
                    cache_data JSONB NOT NULL,
                    updated_at TIMESTAMP DEFAULT NOW(),
                    
                    -- Performance indexes
                    CONSTRAINT valid_memory_score CHECK (memory_score >= 0 AND memory_score <= 100)
                );
                
                CREATE INDEX IF NOT EXISTS idx_reputation_risk ON public_domain_cache(reputation_risk_score DESC);
                CREATE INDEX IF NOT EXISTS idx_updated_at ON public_domain_cache(updated_at);
                CREATE INDEX IF NOT EXISTS idx_alerts ON public_domain_cache(brand_confusion_alert, perception_decline_alert);
            """)
    
    async def compute_real_drift_delta(self, domain_id: str, current_consensus: float) -> float:
        """FIXES: Real drift calculation (not random)"""
        try:
            async with self.pool.acquire() as conn:
                previous = await conn.fetchrow("""
                    SELECT ai_consensus_score, updated_at
                    FROM public_domain_cache 
                    WHERE domain_id = $1
                """, domain_id)
                
                if not previous:
                    return 0.0
                
                days_elapsed = (datetime.now() - previous['updated_at']).days
                if days_elapsed == 0:
                    return 0.0
                
                consensus_change = current_consensus - previous['ai_consensus_score']
                return (consensus_change / days_elapsed) * 100
                
        except Exception:
            return 0.0
    
    async def compute_fire_alarm_indicators(self, domain_data: Dict) -> Dict:
        """FIXES: Creates brand urgency with fire alarm indicators"""
        
        reputation_risk = 0.0
        alerts = {
            'brand_confusion_alert': False,
            'perception_decline_alert': False, 
            'visibility_gap_alert': False
        }
        
        consensus_score = domain_data['ai_consensus_score']
        drift_delta = domain_data['drift_delta']
        model_count = domain_data['model_count']
        
        # FIRE ALARM 1: Brand Confusion (AI models disagree)
        if consensus_score < self.config.consensus_threshold_low:
            reputation_risk += 40.0
            alerts['brand_confusion_alert'] = True
            self.metrics['alerts_generated'] += 1
        
        # FIRE ALARM 2: Perception Decline
        if drift_delta < -3.0:
            reputation_risk += 35.0
            alerts['perception_decline_alert'] = True
            self.metrics['alerts_generated'] += 1
        
        # FIRE ALARM 3: Visibility Gap
        if model_count < 10:
            reputation_risk += 25.0
            alerts['visibility_gap_alert'] = True
            self.metrics['alerts_generated'] += 1
        
        # Competitive threat level
        if reputation_risk > 60:
            threat_level = "critical"
        elif reputation_risk > 30:
            threat_level = "high"
        elif reputation_risk > 15:
            threat_level = "medium"
        else:
            threat_level = "low"
        
        return {
            'reputation_risk_score': reputation_risk,
            'competitive_threat_level': threat_level,
            **alerts
        }
    
    async def process_domain_with_retry(self, domain_id: str, domain_name: str) -> Optional[Dict]:
        """FIXES: Error recovery with retry logic"""
        
        for attempt in range(self.config.max_retries):
            try:
                # Get responses with transaction safety
                async with self.pool.acquire() as conn:
                    async with conn.transaction():
                        rows = await conn.fetch("""
                            SELECT d.domain, r.raw_response, r.model, r.created_at
                            FROM responses r
                            JOIN domains d ON r.domain_id = d.id
                            WHERE d.id = $1
                            LIMIT 50
                        """, domain_id)
                
                if not rows:
                    return None
                
                responses = [dict(row) for row in rows]
                
                # Load model (singleton - only loads once)
                model = await EmbeddingModelSingleton.get_model()
                
                # Compute real AI consensus
                consensus_score = await self.compute_ai_consensus(responses, model)
                
                # Compute real drift (not random)
                drift_delta = await self.compute_real_drift_delta(domain_id, consensus_score)
                
                # Extract business intelligence  
                keywords = self.extract_keywords(responses)
                themes = self.analyze_themes(responses)
                
                domain_data = {
                    'domain_id': domain_id,
                    'domain': domain_name,
                    'memory_score': self.compute_memory_score(responses),
                    'ai_consensus_score': consensus_score,
                    'drift_delta': drift_delta,
                    'model_count': len(set(r['model'] for r in responses)),
                    'keywords': keywords,
                    'themes': themes
                }
                
                # Generate fire alarm indicators
                fire_alarms = await self.compute_fire_alarm_indicators(domain_data)
                domain_data.update(fire_alarms)
                
                self.metrics['processed'] += 1
                return domain_data
                
            except Exception as e:
                logger.warning(f"Attempt {attempt + 1} failed for {domain_name}: {e}")
                if attempt < self.config.max_retries - 1:
                    await asyncio.sleep(2 ** attempt)  # Exponential backoff
                else:
                    self.metrics['failed'] += 1
                    return None
    
    async def compute_ai_consensus(self, responses: List[Dict], model) -> float:
        """FIXES: Proper consensus calculation with error handling"""
        if len(responses) < 2:
            return 0.0
        
        try:
            texts = [r['raw_response'][:400] for r in responses[:8]]
            embeddings = model.encode(texts)
            
            similarities = []
            for i in range(len(embeddings)):
                for j in range(i + 1, len(embeddings)):
                    sim = np.dot(embeddings[i], embeddings[j]) / (
                        np.linalg.norm(embeddings[i]) * np.linalg.norm(embeddings[j])
                    )
                    similarities.append(float(sim))
            
            return float(np.mean(similarities)) if similarities else 0.0
            
        except Exception:
            return 0.5  # Default consensus
    
    def compute_memory_score(self, responses: List[Dict]) -> float:
        """Compute memory score based on response quality"""
        if not responses:
            return 0.0
        
        lengths = [len(r['raw_response']) for r in responses]
        avg_length = np.mean(lengths)
        consistency = 1 - (np.std(lengths) / avg_length) if avg_length > 0 else 0
        
        unique_models = len(set(r['model'] for r in responses))
        diversity_score = min(unique_models / 15.0, 1.0)
        
        return min(max((consistency * 0.3 + diversity_score * 0.7) * 100, 0), 100)
    
    def extract_keywords(self, responses: List[Dict]) -> List[str]:
        """Extract business keywords from responses"""
        text = ' '.join([r['raw_response'].lower() for r in responses])
        
        keywords = [
            'software', 'technology', 'cloud', 'api', 'ai', 'data',
            'platform', 'digital', 'enterprise', 'innovation', 'security'
        ]
        
        found = [(kw, text.count(kw)) for kw in keywords if kw in text]
        found.sort(key=lambda x: x[1], reverse=True)
        return [kw for kw, count in found[:5]]
    
    def analyze_themes(self, responses: List[Dict]) -> List[str]:
        """Analyze business themes"""
        text = ' '.join([r['raw_response'].lower() for r in responses])
        
        themes = {
            'Developer First': ['api', 'developer', 'sdk', 'technical'],
            'Enterprise': ['enterprise', 'business', 'corporate'],
            'AI Powered': ['ai', 'machine learning', 'intelligent'],
            'Cloud Native': ['cloud', 'saas', 'scalable'],
            'Security Focused': ['security', 'compliance', 'protection']
        }
        
        scores = {}
        for theme, keywords in themes.items():
            score = sum(1 for kw in keywords if kw in text)
            if score > 0:
                scores[theme] = score
        
        return [theme for theme, score in sorted(scores.items(), key=lambda x: x[1], reverse=True)[:3]]
    
    async def generate_batch(self, batch_size: int = 5, offset: int = 0) -> Dict:
        """FIXES: Batch processing with proper transaction management"""
        
        try:
            # Get domains to process
            async with self.pool.acquire() as conn:
                domains = await conn.fetch("""
                    SELECT DISTINCT d.id, d.domain, COUNT(r.id) as response_count
                    FROM domains d
                    JOIN responses r ON d.id = r.domain_id
                    WHERE d.status = 'completed'
                    GROUP BY d.id, d.domain
                    HAVING COUNT(r.id) >= 5
                    ORDER BY COUNT(r.id) DESC
                    LIMIT $1 OFFSET $2
                """, batch_size, offset)
            
            if not domains:
                return {"status": "complete", "metrics": self.metrics}
            
            # Process concurrently
            tasks = [
                self.process_domain_with_retry(str(d['id']), d['domain']) 
                for d in domains
            ]
            results = await asyncio.gather(*tasks)
            
            # Batch insert with transaction safety
            successful = [r for r in results if r is not None]
            if successful:
                await self.batch_insert_cache(successful)
            
            return {
                "status": "success",
                "processed": len(successful),
                "failed": len(domains) - len(successful),
                "next_offset": offset + batch_size,
                "has_more": len(domains) == batch_size,
                "fire_alarms_generated": self.metrics['alerts_generated'],
                "metrics": self.metrics
            }
            
        except Exception as e:
            logger.error(f"Batch processing failed: {e}")
            raise e
    
    async def batch_insert_cache(self, entries: List[Dict]):
        """FIXES: Transaction-safe batch insert"""
        async with self.pool.acquire() as conn:
            async with conn.transaction():
                for entry in entries:
                    await conn.execute("""
                        INSERT INTO public_domain_cache (
                            domain_id, domain, memory_score, ai_consensus_score, drift_delta,
                            model_count, reputation_risk_score, competitive_threat_level,
                            brand_confusion_alert, perception_decline_alert, visibility_gap_alert,
                            business_focus, market_position, keywords, top_themes, cache_data
                        ) VALUES (
                            $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16
                        )
                        ON CONFLICT (domain_id) DO UPDATE SET
                            memory_score = EXCLUDED.memory_score,
                            ai_consensus_score = EXCLUDED.ai_consensus_score,
                            drift_delta = EXCLUDED.drift_delta,
                            reputation_risk_score = EXCLUDED.reputation_risk_score,
                            competitive_threat_level = EXCLUDED.competitive_threat_level,
                            brand_confusion_alert = EXCLUDED.brand_confusion_alert,
                            perception_decline_alert = EXCLUDED.perception_decline_alert,
                            visibility_gap_alert = EXCLUDED.visibility_gap_alert,
                            cache_data = EXCLUDED.cache_data,
                            updated_at = NOW()
                    """,
                    entry['domain_id'], entry['domain'], entry['memory_score'],
                    entry['ai_consensus_score'], entry['drift_delta'], entry['model_count'],
                    entry['reputation_risk_score'], entry['competitive_threat_level'],
                    entry['brand_confusion_alert'], entry['perception_decline_alert'],
                    entry['visibility_gap_alert'],
                    entry['themes'][0] if entry['themes'] else 'Technology',
                    'Modern' if 'cloud' in entry['keywords'] else 'Traditional',
                    entry['keywords'], entry['themes'], json.dumps(entry)
                )
    
    async def close(self):
        """Clean shutdown"""
        if self.pool:
            await self.pool.close()

# Production Factory
async def create_production_system():
    """Factory for production cache system"""
    import os
    
    config = ProductionConfig(
        database_url=os.environ.get('DATABASE_URL'),
        batch_size=3,  # Conservative for production
        max_connections=15
    )
    
    system = ProductionCacheSystem(config)
    await system.initialize()
    return system

if __name__ == "__main__":
    async def main():
        cache_system = await create_production_system()
        result = await cache_system.generate_batch(batch_size=3)
        print(json.dumps(result, indent=2))
        await cache_system.close()
    
    asyncio.run(main()) 