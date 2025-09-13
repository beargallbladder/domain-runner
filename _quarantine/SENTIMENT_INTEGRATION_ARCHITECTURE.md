# Sentiment Analyzer Integration Architecture

## System Overview

### Core Services
1. **llmrank.io** - AI Memory Tensor Engine (3,200+ domains × 8 AI models)
2. **Sentiment Analyzer Service** - Reality Grounding Engine
3. **Integration Layer** - Data fusion and API orchestration
4. **SaaS Portal** - User interface and analytics dashboard

## Architecture Options

### Option 1: Push-Back Integration (Recommended)
```
┌─────────────────┐    ┌──────────────────────┐    ┌─────────────────┐
│   llmrank.io    │───▶│  Sentiment Analyzer  │───▶│  Push Results   │
│  (AI Memory)    │    │     Service          │    │  Back to DB     │
└─────────────────┘    └──────────────────────┘    └─────────────────┘
         │                                                    │
         ▼                                                    ▼
┌─────────────────┐    ┌──────────────────────┐    ┌─────────────────┐
│   Enhanced      │◀───│   Integration API    │◀───│   PostgreSQL    │
│   SaaS Portal   │    │   (Unified Data)     │    │   + Sentiment   │
└─────────────────┘    └──────────────────────┘    └─────────────────┘
```

### Option 2: Real-time Federation
```
┌─────────────────┐    ┌──────────────────────┐
│   SaaS Portal   │───▶│  Integration API     │
│   (Frontend)    │    │  (Orchestrator)      │
└─────────────────┘    └──────────────────────┘
                                │
                ┌───────────────┼───────────────┐
                ▼               ▼               ▼
        ┌──────────────┐ ┌──────────────┐ ┌──────────────┐
        │ llmrank.io   │ │  Sentiment   │ │   Cache      │
        │     API      │ │  Analyzer    │ │   Layer      │
        └──────────────┘ └──────────────┘ └──────────────┘
```

## Recommended Implementation: Push-Back Integration

### Why This Approach?
1. **Performance**: Pre-computed sentiment gaps, no real-time API calls
2. **Reliability**: Cached results, no dependency on external service uptime
3. **Cost**: Batch processing vs real-time API calls
4. **Scalability**: Can handle thousands of concurrent users

### Implementation Steps

#### Step 1: Extend Database Schema
```sql
-- Add sentiment analysis table
CREATE TABLE domain_sentiment_analysis (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    domain VARCHAR(255) NOT NULL,
    ai_memory_score DECIMAL(5,2),
    sentiment_score DECIMAL(5,2),
    reality_gap DECIMAL(5,2),
    muv_category VARCHAR(50), -- Fast/Slow memory category
    decay_adjusted_gap DECIMAL(5,2),
    arbitrage_opportunity_score DECIMAL(5,2),
    data_sources JSONB, -- Reddit, news, social, etc.
    analysis_metadata JSONB,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    FOREIGN KEY (domain) REFERENCES domains(domain)
);

-- Add indexes for performance
CREATE INDEX idx_domain_sentiment_domain ON domain_sentiment_analysis(domain);
CREATE INDEX idx_domain_sentiment_gap ON domain_sentiment_analysis(reality_gap DESC);
CREATE INDEX idx_domain_sentiment_arbitrage ON domain_sentiment_analysis(arbitrage_opportunity_score DESC);
```

#### Step 2: Sentiment Service Webhook Integration
```javascript
// In Sentiment Analyzer Service - push results back
async function pushResultsToLLMRank(analysisResults) {
    const payload = {
        domain: analysisResults.domain,
        ai_memory_score: analysisResults.aiMemoryScore,
        sentiment_score: analysisResults.sentimentScore,
        reality_gap: analysisResults.realityGap,
        muv_category: analysisResults.muvCategory,
        decay_adjusted_gap: analysisResults.decayAdjustedGap,
        arbitrage_opportunity_score: analysisResults.arbitrageScore,
        data_sources: analysisResults.dataSources,
        analysis_metadata: analysisResults.metadata
    };
    
    await fetch('https://llm-pagerank-public-api.onrender.com/api/sentiment-analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    });
}
```

#### Step 3: Enhanced API Endpoints
```javascript
// New endpoints in llmrank.io API
app.post('/api/sentiment-analysis', async (req, res) => {
    // Receive sentiment analysis from external service
    const analysis = req.body;
    await saveSentimentAnalysis(analysis);
    res.json({ status: 'success' });
});

app.get('/api/domains/:domain/enhanced', async (req, res) => {
    // Return combined AI memory + sentiment data
    const domain = req.params.domain;
    const aiData = await getDomainAIData(domain);
    const sentimentData = await getDomainSentimentData(domain);
    
    res.json({
        domain,
        ai_memory: aiData,
        sentiment_analysis: sentimentData,
        reality_gap: sentimentData?.reality_gap,
        arbitrage_score: sentimentData?.arbitrage_opportunity_score,
        muv_category: sentimentData?.muv_category
    });
});

app.get('/api/arbitrage-opportunities', async (req, res) => {
    // Return top arbitrage opportunities
    const opportunities = await getTopArbitrageOpportunities();
    res.json(opportunities);
});
```

#### Step 4: SaaS Portal Integration
```javascript
// Enhanced frontend components
const EnhancedDomainCard = ({ domain }) => {
    const [enhancedData, setEnhancedData] = useState(null);
    
    useEffect(() => {
        fetch(`/api/domains/${domain}/enhanced`)
            .then(res => res.json())
            .then(setEnhancedData);
    }, [domain]);
    
    return (
        <div className="domain-card">
            <h3>{domain}</h3>
            <div className="ai-memory">
                AI Memory Score: {enhancedData?.ai_memory?.score}
            </div>
            <div className="sentiment">
                Reality Score: {enhancedData?.sentiment_analysis?.sentiment_score}
            </div>
            <div className="reality-gap">
                Reality Gap: {enhancedData?.reality_gap}
                {enhancedData?.reality_gap > 20 && <span className="arbitrage">🎯 ARBITRAGE</span>}
            </div>
            <div className="muv-category">
                Memory Type: {enhancedData?.muv_category}
            </div>
        </div>
    );
};
```

## Data Flow Architecture

### 1. Initial Data Collection
```
llmrank.io → [AI Memory Tensor] → Database
```

### 2. Sentiment Analysis Trigger
```
Scheduler → Sentiment Analyzer → llmrank.io API → Reality Data
Sentiment Analyzer → External APIs → Reddit/News/Social → Sentiment Scores
```

### 3. Analysis & Push-Back
```
Sentiment Analyzer → [Compute Reality Gap] → POST /api/sentiment-analysis
llmrank.io → [Store Enhanced Data] → PostgreSQL
```

### 4. SaaS Portal Consumption
```
Frontend → GET /api/domains/{domain}/enhanced → Combined Data
Frontend → GET /api/arbitrage-opportunities → Top Opportunities
```

## Benefits of This Architecture

### 1. **Performance**
- Pre-computed sentiment gaps
- No real-time external API dependencies
- Fast dashboard loading

### 2. **Reliability**
- Cached sentiment data
- Graceful degradation if sentiment service is down
- Historical sentiment tracking

### 3. **Scalability**
- Batch processing of sentiment analysis
- Can handle thousands of concurrent users
- Efficient database queries

### 4. **Monetization**
- Enhanced API endpoints for premium features
- Arbitrage opportunity alerts
- MUV category insights

## Implementation Priority

### Phase 1: Database & API (Week 1)
1. Extend database schema
2. Create sentiment analysis endpoints
3. Test push-back integration

### Phase 2: Frontend Integration (Week 2)
1. Enhanced domain cards
2. Reality gap visualizations
3. Arbitrage opportunity dashboard

### Phase 3: Advanced Features (Week 3)
1. MUV category analysis
2. Decay-adjusted scoring
3. Predictive arbitrage alerts

## Monitoring & Analytics

### Key Metrics to Track
1. **Sentiment Analysis Coverage**: % of domains with sentiment data
2. **Reality Gap Distribution**: Histogram of gap sizes by industry
3. **Arbitrage Success Rate**: How often gaps close as predicted
4. **MUV Accuracy**: Validation of memory update velocity categories

---

**This architecture transforms llmrank.io from an AI ranking service into a comprehensive "AI Memory vs Reality Intelligence Platform"** 