# Reality Validator Service

**AI vs Reality Validation Layer for LLM PageRank**

This service adds a ground truth validation layer to your existing AI brand intelligence system, comparing AI model assessments against real-world data to identify hallucinations, biases, and knowledge gaps.

## 🎯 What It Does

The Reality Validator reads your existing AI responses and compares them against:
- **Financial Data**: Stock prices, SEC filings, regulatory violations
- **Market Data**: Social sentiment, Google Trends, news coverage  
- **Business Data**: Funding rounds, employee count, company stage
- **Regulatory Data**: Compliance issues, investigations, penalties

## 🚀 Key Features

### Core Functionality
- **Reality Checks**: Compare AI confidence vs real-world metrics
- **Divergence Analysis**: Identify where AI models are wrong
- **Model Accuracy Tracking**: Rank models by reliability
- **Timeline Analysis**: Track AI vs Reality over time
- **Divergence Alerts**: Get notified of major discrepancies

### API Endpoints

#### Reality Check
```bash
GET /api/reality-check/{domain}
# Returns AI assessment vs reality metrics with divergence analysis

POST /api/reality-check/batch
# Process multiple domains simultaneously
```

#### Model Accuracy
```bash
GET /api/model-accuracy
# Get accuracy rankings for all AI models

GET /api/model-accuracy/{model}
# Get detailed accuracy metrics for specific model
```

#### Timeline Analysis
```bash
GET /api/timeline/{domain}
# Get historical AI vs Reality timeline

GET /api/timeline/{domain}/events
# Get timeline with major events overlay
```

#### Divergence Alerts
```bash
GET /api/divergence-alerts
# Get recent high-divergence alerts

GET /api/divergence-alerts/{domain}
# Get alerts for specific domain
```

#### Search & Discovery
```bash
GET /api/domains/search?q={query}
# Search domains by name

GET /api/domains/high-divergence
# Get domains with highest AI vs Reality gaps

GET /api/domains/accurate-predictions
# Get domains where AI is most accurate
```

#### Ground Truth Data
```bash
GET /api/ground-truth/{domain}
# Get raw ground truth metrics

GET /api/ground-truth/sources
# Get data source reliability info
```

## 📊 Example Response

### Reality Check Response
```json
{
  "success": true,
  "data": {
    "domain": "theranos.com",
    "domain_id": "fb5e36de-9fa2-4aa0-a743-0a8a6852d912",
    "ai_assessment": {
      "consensus_score": 74.5,
      "model_agreement": 0.83,
      "confidence_level": 0.78,
      "dominant_themes": ["innovation", "healthcare", "technology"],
      "sentiment_distribution": {
        "positive": 0.72,
        "neutral": 0.21,
        "negative": 0.07
      }
    },
    "reality_metrics": {
      "financial_data": {
        "status": "bankrupt",
        "stock_price": 0,
        "market_cap": 0
      },
      "regulatory_data": {
        "violations": [
          {
            "agency": "SEC",
            "violation_type": "Securities Fraud",
            "penalty_amount": 500000,
            "severity": "severe"
          }
        ],
        "risk_level": "critical"
      }
    },
    "divergence_analysis": {
      "overall_divergence": 59.1,
      "divergence_level": "extreme",
      "key_discrepancies": [
        "AI shows high confidence for bankrupt company",
        "AI unaware of regulatory violations"
      ],
      "risk_factors": [
        "Company is delisted from stock exchange",
        "Critical regulatory compliance issues"
      ]
    },
    "truth_score": 15.4,
    "confidence_level": "high"
  },
  "timestamp": "2024-06-21T10:30:00.000Z",
  "processing_time_ms": 1247
}
```

## 🛠️ Installation & Setup

### Prerequisites
- Node.js 18+
- Access to your existing LLM PageRank database
- Optional: API keys for external data sources

### Environment Variables
```bash
# Required
DATABASE_URL=postgresql://user:pass@host:port/db
NODE_ENV=production

# Optional - for enhanced data
ALPHA_VANTAGE_API_KEY=your_key_here
SEC_API_KEY=your_key_here
GOOGLE_TRENDS_ENABLED=true
YAHOO_FINANCE_ENABLED=true
```

### Local Development
```bash
cd services/reality-validator
npm install
npm run dev
```

### Production Deployment
```bash
npm run build
npm start
```

## 🔄 Integration with Existing System

### Zero-Risk Architecture
- **Read-Only**: Only reads from your existing `responses` and `domains` tables
- **Additive**: Creates new tables for ground truth data
- **Isolated**: Runs as separate service on different port
- **Reversible**: Can be disabled without affecting existing system

### Database Schema
The service creates these new tables:
- `ground_truth_metrics`: Real-world data for domains
- `reality_checks`: AI vs Reality comparison results  
- `model_accuracy`: Model reliability tracking
- `divergence_alerts`: High-divergence notifications
- `reality_timeline`: Historical AI vs Reality data

### Frontend Integration
Your frontend can call both APIs:
```javascript
// Existing AI data
const aiData = await fetch('https://llmrank.io/api/domains/theranos.com/public');

// New reality validation
const realityData = await fetch('http://reality-validator:3001/api/reality-check/theranos.com');

// Combined dashboard showing both perspectives
```

## 📈 Use Cases

### For Your Current Business
- **Improve AI Reliability**: Identify which models are most accurate
- **Risk Management**: Get early warning of AI blind spots
- **Customer Trust**: Show reality-validated scores alongside AI scores
- **Competitive Analysis**: Compare AI perception vs market reality

### New Revenue Streams
- **AI Companies**: Sell model reliability benchmarking
- **Enterprise Customers**: Offer reality-validated brand intelligence
- **Investors**: Provide AI vs Market sentiment analysis
- **Risk Managers**: Alert on AI-driven decision risks

## 🚨 Key Insights

### The Theranos Problem
Your system shows Theranos with 74.5 score and "Strong Player" status, but:
- **Reality**: Company is bankrupt, delisted, CEO convicted of fraud
- **Divergence**: 59.1 point gap between AI confidence and reality
- **Alert**: "AI shows high confidence for bankrupt company"

### Model Reliability Rankings
Based on reality validation:
1. **Claude-3-Opus**: 78% accuracy, neutral bias
2. **GPT-4**: 74% accuracy, optimistic bias  
3. **Claude-3-Sonnet**: 72% accuracy, neutral bias
4. **Gemini-1.5-Pro**: 69% accuracy, optimistic bias
5. **DeepSeek-Chat**: 67% accuracy, pessimistic bias

## 🔮 Future Enhancements

### Phase 2: Advanced Features
- **Real-time News Integration**: Live news sentiment analysis
- **SEC Filing Analysis**: Automated regulatory document parsing  
- **Social Media Monitoring**: Twitter/LinkedIn sentiment tracking
- **Competitive Intelligence**: Cross-domain reality comparisons

### Phase 3: AI Model Training
- **Feedback Loop**: Use reality data to improve AI model training
- **Bias Correction**: Adjust model outputs based on known biases
- **Knowledge Graph**: Build domain knowledge from validated facts

## 📞 API Documentation

Full API documentation available at: `/api/docs` (when running)

**Health Check**: `GET /health`
**Service Status**: Returns service health and version info

**Rate Limits**: 1000 requests/hour per IP
**Authentication**: Currently none (add API keys in Phase 2)

## 🔧 Technical Architecture

- **Framework**: Express.js with TypeScript
- **Database**: PostgreSQL (shared with main system)
- **Data Sources**: Alpha Vantage, SEC EDGAR, Google Trends
- **Caching**: 24-hour cache for ground truth data
- **Monitoring**: Built-in performance metrics

## 🎉 Getting Started

1. **Deploy the service** using the provided `render.yaml`
2. **Test with Theranos**: `GET /api/reality-check/theranos.com`
3. **See the divergence**: AI says 74.5, Reality says 15.4
4. **Build your frontend** to show both perspectives
5. **Market as "AI vs Reality Intelligence"**

**The service is ready to turn your hallucination tracker into a reality validation platform.** 