# Mathematical Framework Review - LLMRank.io
## AI Brand Intelligence Platform

### Executive Summary
This review analyzes the mathematical foundations of LLMRank.io's AI brand intelligence system, focusing on memory decay modeling, LLM consensus calculations, and temporal tensor implementations.

---

## 1. Memory Decay Framework

### Current Implementation (MemoryTensor.ts)

#### Recency Score Calculation
```typescript
// Time decay with weekly half-life
const hoursSinceLatest = (Date.now() - latestMemory) / (1000 * 60 * 60);
const timeDecay = Math.exp(-hoursSinceLatest / 168); // 168 hours = 1 week

// Activity-weighted score
const activityScore = (
  recent_24h * 1.0 +
  recent_7d * 0.5 +
  recent_30d * 0.25
) / (recent_30d || 1);

// Final recency: 60% time decay + 40% activity
recencyScore = Math.min(1, timeDecay * 0.6 + activityScore * 0.4);
```

**Strengths:**
- Exponential decay models natural memory fading
- Weekly half-life is reasonable for brand perception
- Activity weighting prevents stale domains from high scores

**Improvements Needed:**
- Add configurable decay rates per industry
- Implement "memory spikes" for viral events
- Consider multi-exponential decay for different memory types

### Composite Memory Score
```typescript
// Non-linear weighted combination
const weightedSum = 
  Math.pow(recency, 1.2) * 0.25 +
  Math.pow(frequency, 1.1) * 0.25 +
  Math.pow(significance, 1.3) * 0.3 +
  Math.pow(persistence, 1.15) * 0.2;

// Sigmoid for bounded [0,1] output
memoryScore = 1 / (1 + Math.exp(-4 * (weightedSum - 0.5)));
```

**Analysis:**
- Power scaling emphasizes high-performing components
- Sigmoid ensures smooth, bounded scores
- Weights prioritize significance (30%) and recency/frequency (25% each)

---

## 2. LLM Consensus Calculations

### Model Agreement Matrix
```typescript
// Pairwise similarity calculation
agreement_score = CASE 
  WHEN hash_match THEN 1.0
  WHEN similarity > 0.8 THEN 0.8
  WHEN similarity > 0.6 THEN 0.6
  WHEN similarity > 0.4 THEN 0.4
  ELSE 0.0
END
```

**Strengths:**
- Hash matching for exact agreement
- Graduated similarity scoring
- Confidence-weighted agreements

**Mathematical Enhancement Opportunities:**
1. **Semantic Distance Metrics**: Replace simple similarity with cosine distance in embedding space
2. **Weighted Voting**: Weight by model performance/specialization
3. **Bayesian Consensus**: P(truth|agreements) using prior model accuracies

### Temporal Consistency
```typescript
// Variance-based consistency
confidenceConsistency = 1 / (1 + confidence_variance)
responseConsistency = 1 / avg_response_diversity
temporalCoverage = weeks_active / 13
```

**Issues:**
- Linear temporal coverage doesn't capture patterns
- Missing seasonal adjustments
- No trend detection

### Proposed Enhancement: Dynamic Time Warping
```python
def temporal_alignment_score(series1, series2):
    """Calculate alignment using DTW"""
    distance_matrix = cdist(series1, series2)
    path = dtw_path(distance_matrix)
    return 1 / (1 + normalized_dtw_distance)
```

---

## 3. Neural Pattern Detection

### Current Gap: No Neural Pattern Implementation Found

**Recommended Framework:**

#### 1. Attention-Based Pattern Detection
```python
class BrandAttentionNetwork:
    def __init__(self, embedding_dim=768):
        self.attention = MultiHeadAttention(
            embed_dim=embedding_dim,
            num_heads=8
        )
        
    def detect_patterns(self, domain_embeddings):
        # Self-attention to find patterns
        attn_output, attn_weights = self.attention(
            domain_embeddings, 
            domain_embeddings,
            domain_embeddings
        )
        
        # Extract top attention patterns
        patterns = extract_top_k_patterns(attn_weights, k=10)
        return patterns
```

#### 2. Temporal Pattern Mining
```python
def mine_temporal_patterns(time_series, min_support=0.1):
    """Sequential pattern mining for brand perception"""
    # Convert to symbolic representation
    sax_data = sax_transform(time_series)
    
    # Mine frequent patterns
    patterns = PrefixSpan(sax_data, min_support)
    
    # Score by predictive power
    scored_patterns = []
    for pattern in patterns:
        score = calculate_pattern_score(pattern)
        scored_patterns.append((pattern, score))
    
    return sorted(scored_patterns, key=lambda x: x[1], reverse=True)
```

---

## 4. Time Tensor Visualizations

### Proposed 3D Tensor Structure
```python
class BrandTimeTensor:
    def __init__(self):
        # Dimensions: [time, models, features]
        self.tensor = np.zeros((365, 21, 768))  # 1 year, 21 LLMs, 768 features
        
    def update(self, day, model_id, embedding):
        # Exponential smoothing update
        alpha = 0.3  # smoothing factor
        self.tensor[day, model_id] = (
            alpha * embedding + 
            (1 - alpha) * self.tensor[day-1, model_id]
        )
    
    def compute_consensus_surface(self):
        """Generate 3D consensus visualization"""
        # Reduce model dimension via consensus
        consensus = np.mean(self.tensor, axis=1)
        
        # Apply UMAP for 2D projection
        umap_model = UMAP(n_components=2)
        trajectories = []
        
        for t in range(len(consensus)):
            point = umap_model.fit_transform(consensus[t].reshape(1, -1))
            trajectories.append(point[0])
        
        return np.array(trajectories)
```

### Memory Decay Visualization
```javascript
// D3.js implementation for interactive decay curves
function renderMemoryDecay(domainData) {
    const decayChart = d3.select("#decay-viz")
        .append("svg")
        .attr("width", 800)
        .attr("height", 400);
    
    // Time axis (log scale for better decay visibility)
    const xScale = d3.scaleLog()
        .domain([1, 365])  // 1 day to 1 year
        .range([50, 750]);
    
    // Memory score axis
    const yScale = d3.scaleLinear()
        .domain([0, 1])
        .range([350, 50]);
    
    // Multiple decay curves
    const decayTypes = [
        {name: "Viral", halfLife: 24, color: "#ff6b6b"},     // 1 day
        {name: "News", halfLife: 168, color: "#4ecdc4"},     // 1 week  
        {name: "Brand", halfLife: 2160, color: "#45b7d1"},   // 90 days
        {name: "Reputation", halfLife: 8760, color: "#96ceb4"} // 1 year
    ];
    
    decayTypes.forEach(type => {
        const decayLine = d3.line()
            .x(d => xScale(d))
            .y(d => yScale(Math.exp(-d / type.halfLife)))
            .curve(d3.curveMonotoneX);
        
        decayChart.append("path")
            .datum(d3.range(1, 365))
            .attr("d", decayLine)
            .attr("stroke", type.color)
            .attr("stroke-width", 2)
            .attr("fill", "none");
    });
}
```

---

## 5. Mathematical Improvements Roadmap

### Phase 1: Enhanced Decay Models (Q1 2025)
1. **Multi-component Decay**
   ```python
   memory_score = (
       0.4 * exp(-t/τ_short) +    # Short-term (viral)
       0.4 * exp(-t/τ_medium) +    # Medium-term (news)
       0.2 * exp(-t/τ_long)        # Long-term (reputation)
   )
   ```

2. **Adaptive Decay Rates**
   - Learn τ parameters from historical data
   - Industry-specific decay profiles
   - Event-triggered decay acceleration

### Phase 2: Advanced Consensus (Q2 2025)
1. **Weighted Ensemble Consensus**
   ```python
   def weighted_consensus(responses, model_weights):
       # Weight by model expertise
       weighted_sum = sum(r * w for r, w in zip(responses, model_weights))
       return weighted_sum / sum(model_weights)
   ```

2. **Hierarchical Agreement**
   - Cluster models by response similarity
   - Compute intra-cluster and inter-cluster agreement
   - Identify "schools of thought" among LLMs

### Phase 3: Neural Pattern Engine (Q3 2025)
1. **Transformer-based Pattern Detection**
   - Fine-tune BERT for brand perception patterns
   - Attention visualization for interpretability

2. **Causal Pattern Discovery**
   - Granger causality for brand influence networks
   - Intervention analysis for campaign impact

### Phase 4: Advanced Visualizations (Q4 2025)
1. **4D Tensor Visualization**
   - Time + 3D brand space
   - WebGL implementation for smooth interaction

2. **Memory Decay Heatmaps**
   - Industry × Time decay matrices
   - Interactive parameter adjustment

---

## 6. Implementation Priorities

### Immediate (Next Sprint)
1. Fix memory score inflation (cap at 92%)
2. Add exponential smoothing to consensus calculations
3. Implement basic pattern detection

### Short-term (Next Month)
1. Multi-exponential decay model
2. Consensus confidence intervals
3. Time series anomaly detection

### Medium-term (Next Quarter)
1. Neural pattern detection framework
2. 3D tensor visualizations
3. Causal analysis pipeline

---

## 7. Validation Metrics

### Memory Decay Validation
- Compare predicted vs actual brand recall surveys
- A/B test decay parameters
- Correlation with Google Trends data

### Consensus Validation
- Inter-rater reliability (Krippendorff's α)
- Prediction accuracy for brand outcomes
- Stability over time windows

### Pattern Detection Validation
- Pattern predictive power (F1 score)
- Human expert agreement
- Cross-validation across industries

---

## Conclusion

The current mathematical framework provides a solid foundation with:
- ✅ Exponential decay modeling
- ✅ Multi-factor consensus scoring
- ✅ Bounded, interpretable outputs

Key improvements needed:
- 🔧 More sophisticated decay models
- 🔧 Neural pattern detection
- 🔧 Advanced time tensor visualizations
- 🔧 Causal analysis capabilities

The framework is production-ready but has significant room for mathematical sophistication that would provide competitive advantage and deeper insights.