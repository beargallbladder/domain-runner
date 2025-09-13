# 🔧 FIXING SYSTEMIC ISSUES: From Broken to Brilliant

## The Core Problem Statement

After 2 months, you have:
- ✅ Sophisticated architecture
- ✅ 128,983 raw responses collected  
- ❌ No automated weekly crawls
- ❌ No tensor computations
- ❌ 3 of 11 LLMs not working
- ❌ No intelligence extraction

## 🎯 The Fix: 4-Phase Implementation

### Phase 1: Fix the Foundation (TODAY)
```bash
# 1. Add missing API keys in Render
AI21_API_KEY=your_key_here
AI21_API_KEY_2=backup_key
PERPLEXITY_API_KEY=your_key_here  
PERPLEXITY_API_KEY_2=backup_key
XAI_API_KEY=your_key_here
XAI_API_KEY_2=backup_key

# 2. Test all 11 LLMs
curl -X POST https://domain-runner.onrender.com/api/test-all-llms

# 3. Verify responses in database
SELECT model, COUNT(*) FROM domain_responses 
WHERE created_at > NOW() - INTERVAL '1 hour'
GROUP BY model;
```

### Phase 2: Deploy Memory Oracle Service (WEEK 1)

Create and deploy the missing service:

```typescript
// services/memory-oracle/src/index.ts
import { calculateMemoryScore, computeDrift, detectConsensus } from './tensor-engine';

// Process raw responses into memory scores
async function processResponses() {
    const rawResponses = await getRawResponses();
    
    for (const response of rawResponses) {
        const memoryScore = calculateMemoryScore(response);
        await updateMemoryScore(response.id, memoryScore);
    }
}

// Compute weekly tensors
async function computeWeeklyTensors() {
    const weekData = await getWeekData();
    
    const memoryTensor = buildMemoryTensor(weekData);
    const driftTensor = computeDriftTensor(weekData, previousWeek);
    const consensusTensor = computeConsensusTensor(weekData);
    
    await storeTensors({ memoryTensor, driftTensor, consensusTensor });
}
```

### Phase 3: Implement Weekly Automation (WEEK 1)

**Option A: Render Cron Jobs**
```yaml
# render.yaml addition
cronJobs:
  - name: weekly-crawl
    runtime: node
    schedule: "0 0 * * 0"  # Every Sunday midnight
    buildCommand: npm install
    startCommand: node scripts/weekly-crawl.js
    envVars:
      - key: DATABASE_URL
        fromDatabase:
          name: raw-capture-db
          property: connectionString
```

**Option B: GitHub Actions**
```yaml
# .github/workflows/weekly-crawl.yml
name: Weekly Domain Crawl
on:
  schedule:
    - cron: '0 0 * * 0'  # Every Sunday
  workflow_dispatch:  # Manual trigger

jobs:
  crawl:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Trigger crawl
        run: |
          curl -X POST https://domain-runner.onrender.com/api/process-all-domains \
            -H "Authorization: Bearer ${{ secrets.CRAWL_TOKEN }}"
```

### Phase 4: Build Intelligence Layer (WEEK 2)

**Memory Score Calculation**:
```typescript
function calculateMemoryScore(response: string): number {
    let score = 0;
    
    // Brand prominence (how central is the brand)
    const brandMentions = (response.match(/tesla/gi) || []).length;
    score += Math.min(brandMentions * 5, 25);
    
    // Information richness
    const factCount = extractFacts(response).length;
    score += Math.min(factCount * 3, 30);
    
    // Recency awareness
    if (response.includes('2024') || response.includes('recent')) {
        score += 20;
    }
    
    // Sentiment strength
    const sentiment = analyzeSentiment(response);
    score += Math.abs(sentiment) * 15;
    
    // Competitive context
    if (mentionsCompetitors(response)) {
        score += 10;
    }
    
    return Math.min(score, 100);
}
```

## 🚀 Quick Wins Script

```bash
#!/bin/bash
# fix-everything.sh

echo "🔧 Fixing Domain Runner System"

# 1. Reset all domains to pending
psql $DATABASE_URL -c "UPDATE domains SET status='pending'"

# 2. Add memory score columns
psql $DATABASE_URL -c "
ALTER TABLE domain_responses 
ADD COLUMN IF NOT EXISTS memory_score DECIMAL(5,2),
ADD COLUMN IF NOT EXISTS computed_at TIMESTAMP;"

# 3. Test all LLMs
for llm in openai anthropic deepseek mistral xai together perplexity google cohere ai21 groq; do
    echo "Testing $llm..."
    curl -X POST https://domain-runner.onrender.com/api/test-llm/$llm
done

# 4. Process a test batch
curl -X POST https://domain-runner.onrender.com/api/process-domains \
    -d '{"limit": 10}'

echo "✅ System check complete"
```

## 📊 Success Metrics

### Week 1 Success:
- [ ] All 11 LLMs responding
- [ ] Memory scores computed for new responses
- [ ] Weekly automation triggered successfully

### Week 2 Success:
- [ ] First complete tensor computed
- [ ] Drift detection working
- [ ] Consensus scores available

### Week 4 Success:
- [ ] 4 weekly crawls completed
- [ ] Trend analysis available
- [ ] Memory decay patterns visible

## 🎯 The Endgame

When this is working, you'll have:

```sql
-- Weekly intelligence ready
SELECT 
    d.domain,
    AVG(dr.memory_score) as avg_memory,
    STDDEV(dr.memory_score) as consensus,
    MAX(dr.memory_score) - MIN(dr.memory_score) as divergence,
    AVG(dr.memory_score) - LAG(AVG(dr.memory_score)) OVER (ORDER BY week) as drift
FROM domains d
JOIN domain_responses dr ON d.id = dr.domain_id
WHERE dr.created_at >= DATE_TRUNC('week', NOW())
GROUP BY d.domain, DATE_TRUNC('week', dr.created_at);
```

## The Critical Path

1. **Today**: Fix the 3 missing LLMs
2. **Tomorrow**: Deploy memory scoring
3. **This Week**: Automate weekly crawls
4. **Next Week**: See first tensor outputs

The system is 80% built. It just needs the final 20% to become operational.