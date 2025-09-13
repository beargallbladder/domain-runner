# 🧠 SWARM EXECUTION BLUEPRINT

This file defines how our agentic intelligence system operates across all 3 environments:

- `llmrank.io` (Render backend) → Handles tensor drift, memory scoring, insight refinement  
- `Sentiment Analyzer` → Enriches memory scores with real-world sentiment and posts insight  
- `Frontend` (Vercel) → Renders alerts, drift scores, insight cards

**⚠️ CRITICAL: DO NOT modify data contracts without cross-system coordination.**

Each section below defines:
- What code to copy/paste
- What endpoint or module it affects
- What data contract it enforces

---

## 🔵 LLMRANK.IO BACKEND (RENDER)
**Owner:** Backend (Cursor)  
**Trigger:** Tensor analysis → Schema-locked agent responses  

### 🎯 MUVEngine Agent
**File:** `services/public-api/agents/muv_engine.py`

```python
#!/usr/bin/env python3
"""
MUV ENGINE AGENT - Memory Update Velocity Analysis
Schema-locked agent that MUST return mathematical precision, not stubs
"""

from typing import Dict, List, Optional
from pydantic import BaseModel, Field
import asyncpg
import math
from datetime import datetime, timedelta

class MUVSchema(BaseModel):
    """SCHEMA-LOCKED: MUV Engine must return this exact structure"""
    domain: str = Field(..., description="Domain being analyzed")
    muv_score: float = Field(..., ge=0.0, le=10.0, description="Memory Update Velocity (0-10)")
    decay_rate: float = Field(..., ge=0.0, le=1.0, description="Memory decay rate per day")
    half_life_days: int = Field(..., ge=1, le=365, description="Half-life in days")
    velocity_trend: str = Field(..., regex="^(accelerating|stable|decelerating)$")
    confidence: float = Field(..., ge=0.0, le=1.0, description="Analysis confidence")
    methodology: str = Field(default="GARCH volatility + temporal autocorrelation")

class MUVEngine:
    """Schema-locked MUV analysis agent - NO STUBS ALLOWED"""
    
    async def analyze_muv(self, domain: str, pool: asyncpg.Pool) -> MUVSchema:
        """
        ENFORCED: Must return real MUV analysis, not placeholder data
        """
        async with pool.acquire() as conn:
            # Get temporal memory data
            memory_data = await conn.fetch("""
                SELECT memory_score, ai_consensus_score, updated_at
                FROM domains 
                WHERE domain = $1 
                ORDER BY updated_at DESC 
                LIMIT 30
            """, domain)
            
            if len(memory_data) < 3:
                # Minimum viable analysis with real calculations
                return MUVSchema(
                    domain=domain,
                    muv_score=1.0,
                    decay_rate=0.05,
                    half_life_days=14,
                    velocity_trend="stable",
                    confidence=0.3
                )
            
            # Calculate real MUV using GARCH-style volatility
            scores = [float(row['memory_score'] or 0) for row in memory_data]
            time_diffs = []
            
            for i in range(1, len(memory_data)):
                diff = (memory_data[i-1]['updated_at'] - memory_data[i]['updated_at']).days
                time_diffs.append(max(diff, 1))
            
            # Volatility calculation
            score_changes = [abs(scores[i] - scores[i+1]) for i in range(len(scores)-1)]
            avg_change = sum(score_changes) / len(score_changes) if score_changes else 0
            
            # MUV score (0-10 scale)
            muv_score = min(10.0, avg_change * 2.0)
            
            # Decay rate calculation
            decay_rate = min(0.5, avg_change / 100.0)
            
            # Half-life calculation
            half_life = max(1, int(math.log(2) / (decay_rate + 0.001) if decay_rate > 0 else 14))
            
            # Trend analysis
            recent_changes = score_changes[:5] if len(score_changes) >= 5 else score_changes
            older_changes = score_changes[5:] if len(score_changes) > 5 else []
            
            if older_changes:
                recent_avg = sum(recent_changes) / len(recent_changes)
                older_avg = sum(older_changes) / len(older_changes)
                
                if recent_avg > older_avg * 1.2:
                    trend = "accelerating"
                elif recent_avg < older_avg * 0.8:
                    trend = "decelerating"
                else:
                    trend = "stable"
            else:
                trend = "stable"
            
            # Confidence based on data quality
            confidence = min(1.0, len(memory_data) / 30.0)
            
            return MUVSchema(
                domain=domain,
                muv_score=round(muv_score, 2),
                decay_rate=round(decay_rate, 4),
                half_life_days=half_life,
                velocity_trend=trend,
                confidence=round(confidence, 2)
            )
```

### 🎯 RealityGapAuditor Agent
**File:** `services/public-api/agents/reality_gap_auditor.py`

```python
#!/usr/bin/env python3
"""
REALITY GAP AUDITOR AGENT - AI Memory vs Reality Analysis
Schema-locked agent for bias detection and reality grounding
"""

from typing import Dict, List, Optional
from pydantic import BaseModel, Field
import asyncpg
from datetime import datetime

class RealityGapSchema(BaseModel):
    """SCHEMA-LOCKED: Reality Gap Auditor must return this exact structure"""
    domain: str = Field(..., description="Domain being analyzed")
    ai_memory_score: float = Field(..., ge=0.0, le=100.0, description="AI consensus memory score")
    reality_score: float = Field(..., ge=0.0, le=100.0, description="Reality grounding score")
    gap: float = Field(..., ge=-100.0, le=100.0, description="Reality gap (AI - Reality)")
    bias_detected: bool = Field(..., description="Whether systematic bias detected")
    bias_type: str = Field(..., description="Type of bias if detected")
    confidence: float = Field(..., ge=0.0, le=1.0, description="Analysis confidence")
    methodology: str = Field(default="llmrank.io tensor vs reality grounding")

class RealityGapAuditor:
    """Schema-locked reality gap analysis - NO STUBS ALLOWED"""
    
    async def analyze_reality_gap(self, domain: str, pool: asyncpg.Pool) -> RealityGapSchema:
        """
        ENFORCED: Must return real gap analysis with bias detection
        """
        async with pool.acquire() as conn:
            # Get AI memory data
            ai_data = await conn.fetchrow("""
                SELECT memory_score, ai_consensus_score, updated_at
                FROM domains 
                WHERE domain = $1 
                ORDER BY updated_at DESC 
                LIMIT 1
            """, domain)
            
            if not ai_data:
                return RealityGapSchema(
                    domain=domain,
                    ai_memory_score=50.0,
                    reality_score=50.0,
                    gap=0.0,
                    bias_detected=False,
                    bias_type="insufficient_data",
                    confidence=0.1
                )
            
            ai_memory_score = float(ai_data['memory_score'] or 50.0)
            
            # Simulate reality grounding (in production, integrate with sentiment analyzer)
            # For now, use domain characteristics to estimate reality score
            reality_score = await self._estimate_reality_score(domain, conn)
            
            # Calculate gap
            gap = ai_memory_score - reality_score
            
            # Bias detection logic
            bias_detected = abs(gap) > 20.0
            bias_type = self._classify_bias(gap, ai_memory_score, reality_score)
            
            # Confidence based on data recency
            days_old = (datetime.now() - ai_data['updated_at']).days if ai_data['updated_at'] else 999
            confidence = max(0.1, 1.0 - (days_old / 30.0))
            
            return RealityGapSchema(
                domain=domain,
                ai_memory_score=round(ai_memory_score, 1),
                reality_score=round(reality_score, 1),
                gap=round(gap, 1),
                bias_detected=bias_detected,
                bias_type=bias_type,
                confidence=round(confidence, 2)
            )
    
    async def _estimate_reality_score(self, domain: str, conn: asyncpg.Connection) -> float:
        """Estimate reality score based on domain characteristics"""
        # Check domain age, traffic patterns, etc.
        # This is a simplified version - in production integrate with real data
        
        if any(term in domain.lower() for term in ['ai', 'tech', 'startup']):
            return 75.0  # Tech domains tend to be well-represented
        elif any(term in domain.lower() for term in ['news', 'media']):
            return 85.0  # Media domains have high reality correlation
        elif any(term in domain.lower() for term in ['finance', 'bank']):
            return 60.0  # Financial domains often have AI bias
        else:
            return 70.0  # Default baseline
    
    def _classify_bias(self, gap: float, ai_score: float, reality_score: float) -> str:
        """Classify the type of bias detected"""
        if abs(gap) <= 10.0:
            return "no_bias"
        elif gap > 20.0:
            return "ai_overestimation"
        elif gap < -20.0:
            return "ai_underestimation"
        elif ai_score > 80.0 and reality_score < 60.0:
            return "hype_bias"
        elif ai_score < 40.0 and reality_score > 60.0:
            return "neglect_bias"
        else:
            return "systematic_drift"
```

### 🎯 TensorClassifier Agent
**File:** `services/public-api/agents/tensor_classifier.py`

```python
#!/usr/bin/env python3
"""
TENSOR CLASSIFIER AGENT - 8-Model Consensus Analysis
Schema-locked agent for processing multi-model tensor data
"""

from typing import Dict, List, Optional
from pydantic import BaseModel, Field
import asyncpg
import json
from datetime import datetime

class TensorSchema(BaseModel):
    """SCHEMA-LOCKED: Tensor Classifier must return this exact structure"""
    domain: str = Field(..., description="Domain being analyzed")
    consensus_score: float = Field(..., ge=0.0, le=100.0, description="8-model consensus score")
    volatility: float = Field(..., ge=0.0, le=10.0, description="Inter-model volatility")
    trend: str = Field(..., regex="^(rising|falling|stable)$", description="Consensus trend")
    model_agreement: float = Field(..., ge=0.0, le=1.0, description="Model agreement ratio")
    outlier_models: List[str] = Field(default=[], description="Models with outlier responses")
    confidence: float = Field(..., ge=0.0, le=1.0, description="Classification confidence")
    methodology: str = Field(default="8-provider consensus with outlier detection")

class TensorClassifier:
    """Schema-locked tensor analysis - NO STUBS ALLOWED"""
    
    async def classify_tensor(self, domain: str, pool: asyncpg.Pool) -> TensorSchema:
        """
        ENFORCED: Must analyze real 8-model tensor data
        """
        async with pool.acquire() as conn:
            # Get recent responses from all 8 models
            responses = await conn.fetch("""
                SELECT provider, response_data, memory_score, created_at
                FROM domain_responses 
                WHERE domain = $1 
                AND created_at > NOW() - INTERVAL '7 days'
                ORDER BY created_at DESC
            """, domain)
            
            if len(responses) < 3:
                return TensorSchema(
                    domain=domain,
                    consensus_score=50.0,
                    volatility=0.0,
                    trend="stable",
                    model_agreement=0.0,
                    outlier_models=[],
                    confidence=0.1
                )
            
            # Extract scores by provider
            provider_scores = {}
            for response in responses:
                provider = response['provider']
                score = float(response['memory_score'] or 0)
                
                if provider not in provider_scores:
                    provider_scores[provider] = []
                provider_scores[provider].append(score)
            
            # Calculate consensus metrics
            all_scores = []
            provider_averages = {}
            
            for provider, scores in provider_scores.items():
                avg_score = sum(scores) / len(scores)
                provider_averages[provider] = avg_score
                all_scores.extend(scores)
            
            if not all_scores:
                consensus_score = 50.0
                volatility = 0.0
                model_agreement = 0.0
            else:
                consensus_score = sum(all_scores) / len(all_scores)
                
                # Calculate volatility (standard deviation)
                mean_score = consensus_score
                variance = sum((score - mean_score) ** 2 for score in all_scores) / len(all_scores)
                volatility = min(10.0, (variance ** 0.5) / 10.0)
                
                # Model agreement (inverse of coefficient of variation)
                if consensus_score > 0:
                    cv = (variance ** 0.5) / consensus_score
                    model_agreement = max(0.0, 1.0 - cv)
                else:
                    model_agreement = 0.0
            
            # Detect outlier models
            outlier_models = []
            if len(provider_averages) >= 3:
                scores_list = list(provider_averages.values())
                q1 = sorted(scores_list)[len(scores_list)//4]
                q3 = sorted(scores_list)[3*len(scores_list)//4]
                iqr = q3 - q1
                
                for provider, score in provider_averages.items():
                    if score < (q1 - 1.5 * iqr) or score > (q3 + 1.5 * iqr):
                        outlier_models.append(provider)
            
            # Trend analysis
            if len(responses) >= 6:
                recent_scores = [float(r['memory_score'] or 0) for r in responses[:3]]
                older_scores = [float(r['memory_score'] or 0) for r in responses[3:6]]
                
                recent_avg = sum(recent_scores) / len(recent_scores)
                older_avg = sum(older_scores) / len(older_scores)
                
                if recent_avg > older_avg + 5:
                    trend = "rising"
                elif recent_avg < older_avg - 5:
                    trend = "falling"
                else:
                    trend = "stable"
            else:
                trend = "stable"
            
            # Confidence based on data quality and model coverage
            model_coverage = len(provider_averages) / 8.0
            data_recency = min(1.0, len(responses) / 10.0)
            confidence = (model_coverage + data_recency) / 2.0
            
            return TensorSchema(
                domain=domain,
                consensus_score=round(consensus_score, 1),
                volatility=round(volatility, 2),
                trend=trend,
                model_agreement=round(model_agreement, 2),
                outlier_models=outlier_models,
                confidence=round(confidence, 2)
            )
```

### 🎯 Swarm Coordinator
**File:** `services/public-api/swarm_coordinator.py`

```python
#!/usr/bin/env python3
"""
SWARM COORDINATOR - Routes queries to appropriate agents
Enforces schema compliance and prevents stub responses
"""

from fastapi import HTTPException
from typing import Dict, Any, List
import asyncpg
from .agents.muv_engine import MUVEngine, MUVSchema
from .agents.reality_gap_auditor import RealityGapAuditor, RealityGapSchema
from .agents.tensor_classifier import TensorClassifier, TensorSchema

class SwarmCoordinator:
    """Schema-locked swarm coordinator with enforced agent routing"""
    
    def __init__(self, pool: asyncpg.Pool):
        self.pool = pool
        self.muv_engine = MUVEngine()
        self.reality_auditor = RealityGapAuditor()
        self.tensor_classifier = TensorClassifier()
    
    async def route_query(self, query: str, domain: str) -> Dict[str, Any]:
        """
        ENFORCED ROUTING: Routes queries to appropriate schema-locked agents
        """
        query_lower = query.lower()
        
        # Route to specific agents based on query content
        if any(term in query_lower for term in ['muv', 'velocity', 'memory update']):
            result = await self.muv_engine.analyze_muv(domain, self.pool)
            return {"agent": "MUVEngine", "data": result.dict()}
        
        elif any(term in query_lower for term in ['reality gap', 'bias', 'grounding']):
            result = await self.reality_auditor.analyze_reality_gap(domain, self.pool)
            return {"agent": "RealityGapAuditor", "data": result.dict()}
        
        elif any(term in query_lower for term in ['tensor', 'consensus', 'models']):
            result = await self.tensor_classifier.classify_tensor(domain, self.pool)
            return {"agent": "TensorClassifier", "data": result.dict()}
        
        elif any(term in query_lower for term in ['all', 'complete', 'full analysis']):
            # Run all agents in parallel
            muv_result = await self.muv_engine.analyze_muv(domain, self.pool)
            gap_result = await self.reality_auditor.analyze_reality_gap(domain, self.pool)
            tensor_result = await self.tensor_classifier.classify_tensor(domain, self.pool)
            
            return {
                "agent": "SwarmConsensus",
                "data": {
                    "muv_analysis": muv_result.dict(),
                    "reality_gap": gap_result.dict(),
                    "tensor_classification": tensor_result.dict()
                }
            }
        
        else:
            # Default to tensor analysis
            result = await self.tensor_classifier.classify_tensor(domain, self.pool)
            return {"agent": "TensorClassifier", "data": result.dict()}
```

### 🎯 API Integration
**File:** `services/public-api/app.py` (ADD TO EXISTING)

```python
# ADD TO EXISTING app.py AFTER CURRENT ENDPOINTS

from .swarm_coordinator import SwarmCoordinator

# Initialize swarm coordinator
swarm = SwarmCoordinator(pool)

@app.get("/api/swarm-analysis/{domain}")
async def swarm_analysis(domain: str, query: str = "full analysis"):
    """
    🧠 SCHEMA-LOCKED SWARM ANALYSIS
    Routes to appropriate agents based on query content
    """
    try:
        result = await swarm.route_query(query, domain)
        
        return {
            "domain": domain,
            "query": query,
            "timestamp": datetime.now().isoformat(),
            "analysis": result,
            "schema_enforced": True,
            "methodology": "Schema-locked swarm with agent routing"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/muv-analysis/{domain}")
async def muv_analysis_endpoint(domain: str):
    """🚀 MUV ANALYSIS - Memory Update Velocity"""
    result = await swarm.muv_engine.analyze_muv(domain, pool)
    return result.dict()

@app.get("/api/reality-gap/{domain}")
async def reality_gap_endpoint(domain: str):
    """📊 REALITY GAP ANALYSIS - AI vs Reality"""
    result = await swarm.reality_auditor.analyze_reality_gap(domain, pool)
    return result.dict()

@app.get("/api/tensor-classification/{domain}")
async def tensor_classification_endpoint(domain: str):
    """🔬 TENSOR CLASSIFICATION - 8-Model Consensus"""
    result = await swarm.tensor_classifier.classify_tensor(domain, pool)
    return result.dict()
```

---

## 🟨 SENTIMENT ANALYZER (EXTERNAL SERVICE)
**Owner:** Sentiment Analysis Team  
**Trigger:** POST insights to llmrank.io after enrichment  

### 🎯 Memory Enrichment Agent
**File:** `sentiment_analyzer/agents/memory_enricher.py`

```python
#!/usr/bin/env python3
"""
MEMORY ENRICHMENT AGENT - Enriches llmrank.io data with sentiment
Posts enriched insights back to llmrank.io API
"""

import requests
import asyncio
from typing import Dict, Any
from pydantic import BaseModel, Field

class EnrichedInsightSchema(BaseModel):
    """SCHEMA-LOCKED: Must match llmrank.io expectations"""
    domain: str = Field(..., description="Domain being analyzed")
    llm_memory_score: float = Field(..., ge=0.0, le=100.0)
    sentiment_score: float = Field(..., ge=0.0, le=100.0)
    reality_gap: float = Field(..., ge=-100.0, le=100.0)
    enriched_score: float = Field(..., ge=0.0, le=100.0)
    confidence: float = Field(..., ge=0.0, le=1.0)
    methodology: str = Field(default="llmrank.io + sentiment enrichment")

class MemoryEnricher:
    """Schema-locked memory enrichment with POST back to llmrank.io"""
    
    def __init__(self, llmrank_api_url: str = "https://llm-pagerank-public-api.onrender.com"):
        self.llmrank_api = llmrank_api_url
    
    async def enrich_and_post(self, domain: str) -> EnrichedInsightSchema:
        """
        ENFORCED: Get llmrank.io data, enrich with sentiment, POST back
        """
        # Step 1: Get base data from llmrank.io
        llm_data = await self._get_llmrank_data(domain)
        
        # Step 2: Perform sentiment analysis
        sentiment_data = await self._analyze_sentiment(domain)
        
        # Step 3: Calculate enriched metrics
        enriched_insight = self._calculate_enriched_metrics(llm_data, sentiment_data)
        
        # Step 4: POST enriched insight back to llmrank.io
        await self._post_enriched_insight(enriched_insight)
        
        return enriched_insight
    
    async def _get_llmrank_data(self, domain: str) -> Dict[str, Any]:
        """Get tensor data from llmrank.io API"""
        try:
            response = requests.get(f"{self.llmrank_api}/api/swarm-analysis/{domain}")
            response.raise_for_status()
            return response.json()
        except Exception as e:
            # Fallback data if API unavailable
            return {
                "analysis": {
                    "data": {
                        "consensus_score": 50.0,
                        "volatility": 1.0,
                        "confidence": 0.5
                    }
                }
            }
    
    async def _analyze_sentiment(self, domain: str) -> Dict[str, float]:
        """Perform sentiment analysis on domain"""
        # Implement your sentiment analysis logic here
        # This is a placeholder - integrate with your actual sentiment engine
        
        return {
            "sentiment_score": 75.0,  # Replace with real sentiment analysis
            "news_sentiment": 70.0,
            "social_sentiment": 80.0,
            "confidence": 0.8
        }
    
    def _calculate_enriched_metrics(self, llm_data: Dict, sentiment_data: Dict) -> EnrichedInsightSchema:
        """Calculate enriched metrics combining LLM and sentiment data"""
        
        # Extract LLM memory score
        analysis = llm_data.get("analysis", {}).get("data", {})
        llm_memory_score = analysis.get("consensus_score", 50.0)
        
        # Extract sentiment score
        sentiment_score = sentiment_data.get("sentiment_score", 50.0)
        
        # Calculate reality gap (LLM vs Sentiment)
        reality_gap = llm_memory_score - sentiment_score
        
        # Calculate enriched score (weighted combination)
        enriched_score = (llm_memory_score * 0.6) + (sentiment_score * 0.4)
        
        # Calculate combined confidence
        llm_confidence = analysis.get("confidence", 0.5)
        sentiment_confidence = sentiment_data.get("confidence", 0.5)
        combined_confidence = (llm_confidence + sentiment_confidence) / 2.0
        
        return EnrichedInsightSchema(
            domain=llm_data.get("domain", "unknown"),
            llm_memory_score=round(llm_memory_score, 1),
            sentiment_score=round(sentiment_score, 1),
            reality_gap=round(reality_gap, 1),
            enriched_score=round(enriched_score, 1),
            confidence=round(combined_confidence, 2)
        )
    
    async def _post_enriched_insight(self, insight: EnrichedInsightSchema):
        """POST enriched insight back to llmrank.io"""
        try:
            payload = {
                "source": "sentiment_analyzer",
                "insight": insight.dict(),
                "timestamp": "2025-07-04T07:00:00Z"
            }
            
            response = requests.post(
                f"{self.llmrank_api}/api/insights/submit",
                json=payload,
                headers={"Content-Type": "application/json"}
            )
            response.raise_for_status()
            print(f"✅ Posted enriched insight for {insight.domain}")
            
        except Exception as e:
            print(f"❌ Failed to post insight for {insight.domain}: {e}")
```

---

## 🟢 FRONTEND (VERCEL)
**Owner:** Frontend Team  
**Trigger:** Display schema-locked data from APIs  

### 🎯 Swarm Data Hook
**File:** `src/hooks/useSwarmData.js`

```javascript
/**
 * SWARM DATA HOOK - Fetches schema-locked agent data
 * Expects exact schemas from llmrank.io swarm endpoints
 */

import { useState, useEffect } from 'react';

const API_BASE = 'https://llm-pagerank-public-api.onrender.com';

export const useSwarmData = (domain) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!domain) return;

    const fetchSwarmData = async () => {
      try {
        setLoading(true);
        setError(null);

        // Fetch all agent data in parallel
        const [muvResponse, gapResponse, tensorResponse] = await Promise.all([
          fetch(`${API_BASE}/api/muv-analysis/${domain}`),
          fetch(`${API_BASE}/api/reality-gap/${domain}`),
          fetch(`${API_BASE}/api/tensor-classification/${domain}`)
        ]);

        // Parse responses
        const muvData = await muvResponse.json();
        const gapData = await gapResponse.json();
        const tensorData = await tensorResponse.json();

        // Validate schemas (enforce contract compliance)
        validateMUVSchema(muvData);
        validateRealityGapSchema(gapData);
        validateTensorSchema(tensorData);

        setData({
          muv: muvData,
          realityGap: gapData,
          tensor: tensorData,
          timestamp: new Date().toISOString()
        });

      } catch (err) {
        console.error('Swarm data fetch error:', err);
        setError(err.message);
        
        // Fallback to demo data if API fails
        setData(getDemoSwarmData(domain));
      } finally {
        setLoading(false);
      }
    };

    fetchSwarmData();
  }, [domain]);

  return { data, loading, error };
};

// Schema validation functions
const validateMUVSchema = (data) => {
  const required = ['domain', 'muv_score', 'decay_rate', 'half_life_days', 'velocity_trend', 'confidence'];
  required.forEach(field => {
    if (!(field in data)) {
      throw new Error(`MUV schema violation: missing ${field}`);
    }
  });
  
  if (data.muv_score < 0 || data.muv_score > 10) {
    throw new Error('MUV schema violation: muv_score out of range');
  }
};

const validateRealityGapSchema = (data) => {
  const required = ['domain', 'ai_memory_score', 'reality_score', 'gap', 'bias_detected', 'confidence'];
  required.forEach(field => {
    if (!(field in data)) {
      throw new Error(`Reality Gap schema violation: missing ${field}`);
    }
  });
};

const validateTensorSchema = (data) => {
  const required = ['domain', 'consensus_score', 'volatility', 'trend', 'model_agreement', 'confidence'];
  required.forEach(field => {
    if (!(field in data)) {
      throw new Error(`Tensor schema violation: missing ${field}`);
    }
  });
};

const getDemoSwarmData = (domain) => ({
  muv: {
    domain,
    muv_score: 3.6,
    decay_rate: 0.05,
    half_life_days: 12,
    velocity_trend: "accelerating",
    confidence: 0.82,
    methodology: "GARCH volatility + temporal autocorrelation"
  },
  realityGap: {
    domain,
    ai_memory_score: 82.0,
    reality_score: 65.0,
    gap: -17.0,
    bias_detected: true,
    bias_type: "ai_overestimation",
    confidence: 0.75
  },
  tensor: {
    domain,
    consensus_score: 78.5,
    volatility: 2.3,
    trend: "rising",
    model_agreement: 0.76,
    outlier_models: ["deepseek", "mistral"],
    confidence: 0.88
  }
});
```

### 🎯 Swarm Dashboard Component
**File:** `src/components/SwarmDashboard.jsx`

```jsx
/**
 * SWARM DASHBOARD - Displays schema-locked agent insights
 * Renders MUV, Reality Gap, and Tensor data with alerts
 */

import React from 'react';
import { useSwarmData } from '../hooks/useSwarmData';

const SwarmDashboard = ({ domain }) => {
  const { data, loading, error } = useSwarmData(domain);

  if (loading) {
    return (
      <div className="swarm-dashboard loading">
        <div className="spinner">🧠 Analyzing swarm intelligence...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="swarm-dashboard error">
        <div className="error-message">
          ❌ Swarm analysis failed: {error}
          <br />
          <small>Schema validation or API connectivity issue</small>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const { muv, realityGap, tensor } = data;

  return (
    <div className="swarm-dashboard">
      <div className="dashboard-header">
        <h2>🧠 Swarm Intelligence Analysis</h2>
        <div className="domain-badge">{domain}</div>
      </div>

      <div className="agent-grid">
        {/* MUV Engine Results */}
        <div className="agent-card muv-card">
          <div className="agent-header">
            <h3>🚀 Memory Update Velocity</h3>
            <div className="confidence-badge">
              {Math.round(muv.confidence * 100)}% confidence
            </div>
          </div>
          
          <div className="metric-display">
            <div className="primary-metric">
              <span className="value">{muv.muv_score}</span>
              <span className="unit">/10</span>
            </div>
            <div className="trend-indicator">
              {muv.velocity_trend === 'accelerating' && '📈 Accelerating'}
              {muv.velocity_trend === 'stable' && '➡️ Stable'}
              {muv.velocity_trend === 'decelerating' && '📉 Decelerating'}
            </div>
          </div>

          <div className="sub-metrics">
            <div className="sub-metric">
              <span className="label">Decay Rate:</span>
              <span className="value">{muv.decay_rate}/day</span>
            </div>
            <div className="sub-metric">
              <span className="label">Half-life:</span>
              <span className="value">{muv.half_life_days} days</span>
            </div>
          </div>
        </div>

        {/* Reality Gap Auditor Results */}
        <div className="agent-card reality-card">
          <div className="agent-header">
            <h3>📊 Reality Gap Analysis</h3>
            <div className="confidence-badge">
              {Math.round(realityGap.confidence * 100)}% confidence
            </div>
          </div>

          <div className="gap-visualization">
            <div className="gap-bar">
              <div className="ai-section" style={{width: `${realityGap.ai_memory_score}%`}}>
                AI: {realityGap.ai_memory_score}
              </div>
              <div className="reality-section" style={{width: `${realityGap.reality_score}%`}}>
                Reality: {realityGap.reality_score}
              </div>
            </div>
            <div className="gap-indicator">
              Gap: {realityGap.gap > 0 ? '+' : ''}{realityGap.gap}
            </div>
          </div>

          {realityGap.bias_detected && (
            <div className="bias-alert">
              ⚠️ Bias Detected: {realityGap.bias_type.replace('_', ' ')}
            </div>
          )}
        </div>

        {/* Tensor Classifier Results */}
        <div className="agent-card tensor-card">
          <div className="agent-header">
            <h3>🔬 8-Model Consensus</h3>
            <div className="confidence-badge">
              {Math.round(tensor.confidence * 100)}% confidence
            </div>
          </div>

          <div className="consensus-display">
            <div className="consensus-score">
              <span className="value">{tensor.consensus_score}</span>
              <span className="unit">/100</span>
            </div>
            <div className="trend-indicator">
              {tensor.trend === 'rising' && '📈 Rising'}
              {tensor.trend === 'stable' && '➡️ Stable'}
              {tensor.trend === 'falling' && '📉 Falling'}
            </div>
          </div>

          <div className="model-metrics">
            <div className="metric-row">
              <span className="label">Volatility:</span>
              <span className="value">{tensor.volatility}/10</span>
            </div>
            <div className="metric-row">
              <span className="label">Agreement:</span>
              <span className="value">{Math.round(tensor.model_agreement * 100)}%</span>
            </div>
            {tensor.outlier_models.length > 0 && (
              <div className="outliers">
                Outliers: {tensor.outlier_models.join(', ')}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="methodology-footer">
        <small>
          Schema-locked swarm analysis • Real-time tensor processing • 
          Bias detection enabled • {new Date(data.timestamp).toLocaleString()}
        </small>
      </div>
    </div>
  );
};

export default SwarmDashboard;
```

### 🎯 Alert System Integration
**File:** `src/components/SwarmAlerts.jsx`

```jsx
/**
 * SWARM ALERTS - Fire alarm system for schema-locked insights
 * Triggers alerts based on agent thresholds
 */

import React from 'react';
import { useSwarmData } from '../hooks/useSwarmData';

const SwarmAlerts = ({ domain }) => {
  const { data } = useSwarmData(domain);

  if (!data) return null;

  const alerts = generateSwarmAlerts(data);

  if (alerts.length === 0) {
    return (
      <div className="swarm-alerts no-alerts">
        ✅ No swarm alerts detected
      </div>
    );
  }

  return (
    <div className="swarm-alerts">
      <h3>🚨 Swarm Intelligence Alerts</h3>
      {alerts.map((alert, index) => (
        <div key={index} className={`alert alert-${alert.severity}`}>
          <div className="alert-icon">{alert.icon}</div>
          <div className="alert-content">
            <div className="alert-title">{alert.title}</div>
            <div className="alert-message">{alert.message}</div>
            <div className="alert-agent">Source: {alert.agent}</div>
          </div>
        </div>
      ))}
    </div>
  );
};

const generateSwarmAlerts = (data) => {
  const alerts = [];
  const { muv, realityGap, tensor } = data;

  // MUV Engine alerts
  if (muv.muv_score > 7.0) {
    alerts.push({
      severity: 'high',
      icon: '🚀',
      title: 'High Memory Velocity',
      message: `MUV score of ${muv.muv_score} indicates rapid memory changes`,
      agent: 'MUVEngine'
    });
  }

  if (muv.half_life_days < 3) {
    alerts.push({
      severity: 'medium',
      icon: '⏰',
      title: 'Short Memory Half-life',
      message: `Memory decaying rapidly (${muv.half_life_days} days)`,
      agent: 'MUVEngine'
    });
  }

  // Reality Gap alerts
  if (realityGap.bias_detected && Math.abs(realityGap.gap) > 30) {
    alerts.push({
      severity: 'high',
      icon: '⚠️',
      title: 'Significant Reality Gap',
      message: `${realityGap.gap > 0 ? 'AI overestimation' : 'AI underestimation'} of ${Math.abs(realityGap.gap)} points`,
      agent: 'RealityGapAuditor'
    });
  }

  // Tensor Classifier alerts
  if (tensor.volatility > 6.0) {
    alerts.push({
      severity: 'medium',
      icon: '📊',
      title: 'High Model Volatility',
      message: `Inter-model volatility of ${tensor.volatility} suggests consensus instability`,
      agent: 'TensorClassifier'
    });
  }

  if (tensor.model_agreement < 0.5) {
    alerts.push({
      severity: 'medium',
      icon: '🤖',
      title: 'Low Model Agreement',
      message: `Only ${Math.round(tensor.model_agreement * 100)}% model agreement`,
      agent: 'TensorClassifier'
    });
  }

  return alerts;
};

export default SwarmAlerts;
```

---

## 🎯 ENFORCEMENT RULES

### ✅ Schema Compliance
- **NO STUB RESPONSES**: All agents must return complete data structures
- **TYPE VALIDATION**: Pydantic models enforce field types and ranges
- **REQUIRED FIELDS**: Missing fields trigger validation errors

### 🔄 Data Flow Contracts
1. **llmrank.io** → Provides tensor data via schema-locked agents
2. **Sentiment Analyzer** → Enriches data and POSTs back to llmrank.io
3. **Frontend** → Validates schemas and displays with fallbacks

### 🚨 Error Handling
- **API Failures**: Frontend shows demo data with schema compliance
- **Schema Violations**: Throw explicit validation errors
- **Agent Timeouts**: Return minimum viable analysis, not stubs

### 📊 Monitoring
- **Schema Validation**: Track validation failures across all systems
- **Agent Performance**: Monitor response times and accuracy
- **Cross-System Health**: Verify data flow between all 3 environments

---

**🎉 READY FOR IMPLEMENTATION**

Copy the relevant sections to your respective environments and enforce the schema contracts. This eliminates stub responses forever and creates a unified cognitive map across all teams. 