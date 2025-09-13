# 📊 API DATA FOR CHARTS & VISUALIZATIONS

## 🎯 RICH DATA STRUCTURES FOR FRONTEND GRAPHS

Each API endpoint returns structured data perfect for creating compelling visualizations in your memory theater interface.

## 🎭 CORE ENDPOINT: `/api/reality-check/{domain}`

### **Complete Response Structure**
```json
{
  "domain": "theranos.com",
  "domain_id": "uuid-123",
  "ai_assessment": {
    "consensus_score": 74.5,
    "model_agreement": 0.89,
    "confidence_level": 0.92,
    "dominant_themes": ["innovation", "healthcare", "technology", "disruption"],
    "sentiment_distribution": {
      "positive": 0.73,
      "neutral": 0.21,
      "negative": 0.06
    },
    "model_breakdown": [
      {
        "model": "gpt-4",
        "score": 78.2,
        "confidence": 0.94,
        "key_themes": ["innovation", "healthcare"],
        "sentiment": "positive"
      },
      {
        "model": "claude-3",
        "score": 71.8,
        "confidence": 0.87,
        "key_themes": ["technology", "startup"],
        "sentiment": "positive"
      },
      // ... 17 more models for Enterprise tier
    ]
  },
  "reality_metrics": {
    "financial_data": {
      "status": "bankrupt",
      "stock_price": 0,
      "market_cap": 0,
      "profit_margin": -0.95,
      "debt_to_equity": null,
      "bankruptcy_date": "2022-01-01",
      "sec_violations": [
        {
          "date": "2018-03-14",
          "type": "fraud",
          "fine_amount": 945000000,
          "description": "Massive fraud scheme"
        }
      ]
    },
    "regulatory_data": {
      "compliance_score": 5.2,
      "risk_level": "critical",
      "violations": [
        {
          "agency": "SEC",
          "date": "2018-03-14",
          "severity": "critical",
          "description": "Securities fraud"
        },
        {
          "agency": "FDA",
          "date": "2016-07-08", 
          "severity": "high",
          "description": "Medical device violations"
        }
      ],
      "sec_filings": [],
      "ongoing_investigations": 0
    },
    "market_data": {
      "social_sentiment": -0.87,
      "news_sentiment": -0.92,
      "google_trends": {
        "current_interest": 15,
        "peak_interest": 100,
        "trend_direction": "declining"
      },
      "media_mentions": {
        "positive": 2,
        "negative": 847,
        "neutral": 23
      }
    },
    "business_data": {
      "business_stage": "defunct",
      "employee_count": 0,
      "funding_rounds": [
        {
          "date": "2015-12-01",
          "amount": 945000000,
          "round": "Series C"
        }
      ],
      "company_age": 19,
      "industry": "healthcare"
    }
  },
  "divergence_analysis": {
    "overall_divergence": 59.1,
    "financial_divergence": 74.5,
    "regulatory_divergence": 69.3,
    "market_divergence": 45.8,
    "divergence_level": "extreme",
    "key_discrepancies": [
      "AI shows high confidence for bankrupt company",
      "AI unaware of regulatory violations",
      "AI positive sentiment despite criminal convictions"
    ],
    "risk_factors": [
      "Company is bankrupt",
      "Critical regulatory compliance issues",
      "Business is defunct"
    ]
  },
  "truth_score": 15.4,
  "confidence_level": "high",
  "last_updated": "2024-01-15T10:30:00Z"
}
```

## 📈 CHART-READY DATA STRUCTURES

### **1. AI Consensus Radar Chart**
```jsx
// Perfect for tier-based model visualization
const radarData = response.ai_assessment.model_breakdown.map(model => ({
  model: model.model,
  score: model.score,
  confidence: model.confidence * 100,
  tier: getModelTier(model.model) // 'free', 'pro', 'enterprise'
}));

// Example Chart:
<RadarChart data={radarData}>
  <PolarGrid />
  <PolarAngleAxis dataKey="model" />
  <PolarRadiusAxis domain={[0, 100]} />
  <Radar name="AI Score" dataKey="score" stroke="#8884d8" fill="#8884d8" fillOpacity={0.6} />
</RadarChart>
```

### **2. AI vs Reality Divergence Chart**
```jsx
// Perfect for showing the "truth gap"
const divergenceData = [
  {
    category: "Overall",
    ai_score: response.ai_assessment.consensus_score,
    reality_score: response.truth_score,
    divergence: response.divergence_analysis.overall_divergence
  },
  {
    category: "Financial", 
    ai_score: extractFinancialSentiment(response.ai_assessment),
    reality_score: calculateFinancialScore(response.reality_metrics.financial_data),
    divergence: response.divergence_analysis.financial_divergence
  },
  {
    category: "Regulatory",
    ai_score: extractRegulatorySentiment(response.ai_assessment),
    reality_score: response.reality_metrics.regulatory_data.compliance_score,
    divergence: response.divergence_analysis.regulatory_divergence
  },
  {
    category: "Market",
    ai_score: response.ai_assessment.sentiment_distribution.positive * 100,
    reality_score: (response.reality_metrics.market_data.social_sentiment + 1) * 50,
    divergence: response.divergence_analysis.market_divergence
  }
];

// Example Chart:
<ResponsiveContainer width="100%" height={400}>
  <BarChart data={divergenceData}>
    <CartesianGrid strokeDasharray="3 3" />
    <XAxis dataKey="category" />
    <YAxis />
    <Tooltip />
    <Bar dataKey="ai_score" fill="#8884d8" name="AI Assessment" />
    <Bar dataKey="reality_score" fill="#82ca9d" name="Reality Score" />
    <Bar dataKey="divergence" fill="#ff7300" name="Divergence" />
  </BarChart>
</ResponsiveContainer>
```

### **3. Sentiment Distribution Pie Chart**
```jsx
// Perfect for showing AI sentiment breakdown
const sentimentData = [
  { name: 'Positive', value: response.ai_assessment.sentiment_distribution.positive * 100, color: '#00C49F' },
  { name: 'Neutral', value: response.ai_assessment.sentiment_distribution.neutral * 100, color: '#FFBB28' },
  { name: 'Negative', value: response.ai_assessment.sentiment_distribution.negative * 100, color: '#FF8042' }
];

<PieChart width={400} height={400}>
  <Pie
    data={sentimentData}
    cx={200}
    cy={200}
    labelLine={false}
    label={({name, percent}) => `${name} ${(percent * 100).toFixed(0)}%`}
    outerRadius={80}
    fill="#8884d8"
    dataKey="value"
  >
    {sentimentData.map((entry, index) => (
      <Cell key={`cell-${index}`} fill={entry.color} />
    ))}
  </Pie>
</PieChart>
```

## 🎯 ENTERPRISE ENDPOINT: `/api/model-accuracy`

### **Model Accuracy Tracking Data**
```json
{
  "overall_accuracy": {
    "average_accuracy": 0.73,
    "accuracy_trend": "declining",
    "total_assessments": 15847,
    "accurate_predictions": 11568
  },
  "model_performance": [
    {
      "model": "gpt-4",
      "accuracy_score": 0.78,
      "total_assessments": 3241,
      "accurate_predictions": 2528,
      "avg_confidence": 0.89,
      "specialties": ["technology", "business"],
      "weakness_areas": ["healthcare", "finance"],
      "trend": "stable"
    },
    {
      "model": "claude-3",
      "accuracy_score": 0.82,
      "total_assessments": 3156,
      "accurate_predictions": 2588,
      "avg_confidence": 0.76,
      "specialties": ["healthcare", "regulations"],
      "weakness_areas": ["startups", "crypto"],
      "trend": "improving"
    }
    // ... all 19+ models
  ],
  "accuracy_by_category": {
    "financial": 0.45,
    "regulatory": 0.32,
    "market": 0.78,
    "business": 0.69
  },
  "hallucination_patterns": [
    {
      "pattern": "Overconfidence in failed companies",
      "frequency": 0.23,
      "affected_models": ["gpt-4", "gemini-pro"],
      "examples": ["theranos", "ftx", "wirecard"]
    },
    {
      "pattern": "Missing regulatory violations",
      "frequency": 0.31,
      "affected_models": ["claude-3", "llama-2"],
      "examples": ["wells-fargo", "volkswagen"]
    }
  ]
}
```

### **Model Performance Charts**
```jsx
// Model accuracy comparison
const accuracyData = response.model_performance.map(model => ({
  model: model.model,
  accuracy: model.accuracy_score * 100,
  confidence: model.avg_confidence * 100,
  assessments: model.total_assessments,
  tier: getModelTier(model.model)
}));

<ScatterChart width={800} height={400} data={accuracyData}>
  <CartesianGrid />
  <XAxis dataKey="confidence" name="Confidence" />
  <YAxis dataKey="accuracy" name="Accuracy" />
  <Tooltip cursor={{ strokeDasharray: '3 3' }} />
  <Scatter name="Models" dataKey="accuracy" fill="#8884d8" />
</ScatterChart>
```

## 🎯 ENTERPRISE ENDPOINT: `/api/timeline/{domain}`

### **Historical Divergence Data**
```json
{
  "domain": "theranos.com",
  "timeline_data": [
    {
      "date": "2014-01-01",
      "ai_score": 89.2,
      "reality_score": 65.3,
      "divergence": 23.9,
      "major_events": ["Series C funding"],
      "ai_themes": ["innovation", "breakthrough"],
      "reality_indicators": ["early_stage", "unproven"]
    },
    {
      "date": "2015-10-01", 
      "ai_score": 91.5,
      "reality_score": 45.2,
      "divergence": 46.3,
      "major_events": ["WSJ investigation begins"],
      "ai_themes": ["revolutionary", "healthcare"],
      "reality_indicators": ["media_scrutiny", "regulatory_concerns"]
    },
    {
      "date": "2018-03-01",
      "ai_score": 76.8,
      "reality_score": 12.1,
      "divergence": 64.7,
      "major_events": ["SEC charges filed"],
      "ai_themes": ["troubled", "scandal"],
      "reality_indicators": ["fraud_charges", "criminal_investigation"]
    },
    {
      "date": "2022-01-01",
      "ai_score": 25.4,
      "reality_score": 0.0,
      "divergence": 25.4,
      "major_events": ["Company dissolved"],
      "ai_themes": ["failed", "cautionary"],
      "reality_indicators": ["bankrupt", "defunct"]
    }
  ],
  "divergence_trends": {
    "peak_divergence": 64.7,
    "peak_date": "2018-03-01",
    "current_divergence": 25.4,
    "trend_direction": "converging"
  }
}
```

### **Timeline Visualization**
```jsx
// Perfect for showing how AI vs Reality evolved over time
<LineChart width={1000} height={400} data={response.timeline_data}>
  <CartesianGrid strokeDasharray="3 3" />
  <XAxis dataKey="date" />
  <YAxis />
  <Tooltip />
  <Legend />
  <Line type="monotone" dataKey="ai_score" stroke="#8884d8" name="AI Assessment" strokeWidth={3} />
  <Line type="monotone" dataKey="reality_score" stroke="#82ca9d" name="Reality Score" strokeWidth={3} />
  <Line type="monotone" dataKey="divergence" stroke="#ff7300" name="Divergence" strokeDasharray="5 5" />
</LineChart>
```

## 🚨 ENTERPRISE ENDPOINT: `/api/divergence-alerts`

### **Alert Dashboard Data**
```json
{
  "active_alerts": [
    {
      "domain": "theranos.com",
      "alert_type": "extreme_divergence",
      "severity": "critical",
      "message": "AI assessment 59 points higher than reality score",
      "ai_score": 74.5,
      "reality_score": 15.4,
      "divergence": 59.1,
      "recommended_action": "Immediate reality validation required",
      "created_at": "2024-01-15T10:30:00Z"
    }
  ],
  "alert_summary": {
    "total_alerts": 23,
    "critical": 3,
    "high": 7,
    "medium": 13,
    "trends": {
      "new_alerts_24h": 5,
      "resolved_alerts_24h": 2,
      "avg_divergence": 34.2
    }
  },
  "top_divergent_domains": [
    { "domain": "theranos.com", "divergence": 59.1, "trend": "stable" },
    { "domain": "ftx.com", "divergence": 52.3, "trend": "increasing" },
    { "domain": "wirecard.com", "divergence": 47.8, "trend": "decreasing" }
  ]
}
```

## 🎨 VISUAL COMPONENTS FOR MEMORY THEATER

### **1. AI Voice Visualization (Tier-Aware)**
```jsx
// Shows available vs locked AI models
const AIVoiceGrid = ({ models, userTier }) => {
  const availableModels = getAvailableModels(userTier);
  const lockedModels = models.filter(m => !availableModels.includes(m.id));
  
  return (
    <div className="ai-voice-grid">
      {availableModels.map(model => (
        <AIVoice 
          key={model.id}
          model={model}
          glowing={true}
          score={model.score}
          confidence={model.confidence}
        />
      ))}
      {lockedModels.map(model => (
        <AIVoice 
          key={model.id}
          model={model}
          locked={true}
          opacity={0.3}
          upgradePrompt={true}
        />
      ))}
    </div>
  );
};
```

### **2. Reality Shadow Visualization**
```jsx
// Shows reality validation data as "shadows"
const RealityShadows = ({ realityData, userTier }) => {
  if (userTier === 'free') return <LockedRealityPlaceholder />;
  
  return (
    <div className="reality-shadows">
      <FinancialShadow data={realityData.financial_data} />
      <RegulatoryShadow data={realityData.regulatory_data} />
      <MarketShadow data={realityData.market_data} />
      {userTier === 'enterprise' && (
        <BusinessShadow data={realityData.business_data} />
      )}
    </div>
  );
};
```

### **3. Divergence Alert System**
```jsx
// Real-time alerts for extreme divergences
const DivergenceAlerts = ({ alerts }) => (
  <div className="divergence-alerts">
    {alerts.map(alert => (
      <AlertCard 
        key={alert.domain}
        severity={alert.severity}
        message={alert.message}
        divergence={alert.divergence}
        animated={alert.severity === 'critical'}
      />
    ))}
  </div>
);
```

## 🎯 SUMMARY: RICH VISUALIZATION DATA

**YES! The API endpoints provide extensive data for creating:**

✅ **Radar charts** for AI model consensus by tier  
✅ **Bar/line charts** for AI vs Reality comparisons  
✅ **Timeline charts** for historical divergence tracking  
✅ **Pie charts** for sentiment distribution  
✅ **Scatter plots** for model accuracy analysis  
✅ **Heat maps** for divergence patterns  
✅ **Alert dashboards** for real-time monitoring  
✅ **Tier-aware visualizations** with upgrade prompts  

The data structures are specifically designed to power your **memory theater** concept with compelling, interactive visualizations that drive tier upgrades! 📊🎭 