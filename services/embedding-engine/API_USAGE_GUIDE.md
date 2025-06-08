# 📚 EMBEDDING ENGINE V1 - API USAGE GUIDE

## 🚀 BASE URL
```
https://embedding-engine.onrender.com
```

## 🔍 SYSTEM STATUS

### Health Check
```bash
curl https://embedding-engine.onrender.com/health
```

### System Overview
```bash
curl https://embedding-engine.onrender.com/
```

## 📊 LAYER 1: DATA ACCESS

### Get Dataset Count
```bash
curl https://embedding-engine.onrender.com/data/count
```

### Discover Database Tables
```bash
curl https://embedding-engine.onrender.com/data/tables
```

## 🧠 LAYER 2: EMBEDDINGS

### Single Text Embedding
```bash
curl -X POST https://embedding-engine.onrender.com/embed \
  -H "Content-Type: application/json" \
  -d '{"text": "Your text to analyze"}'
```

### Batch Text Embeddings (up to 50 texts)
```bash
curl -X POST https://embedding-engine.onrender.com/embed/batch \
  -H "Content-Type: application/json" \
  -d '{
    "texts": [
      "First text to analyze",
      "Second text to analyze", 
      "Third text to analyze"
    ]
  }'
```

## 📈 LAYER 3: ANALYSIS

### Similarity Analysis
```bash
curl -X POST https://embedding-engine.onrender.com/analyze/similarity \
  -H "Content-Type: application/json" \
  -d '{
    "texts": [
      "Machine learning is powerful",
      "AI technology is revolutionary",
      "The weather is nice today"
    ]
  }'
```

### Drift Detection
```bash
curl -X POST https://embedding-engine.onrender.com/analyze/drift \
  -H "Content-Type: application/json" \
  -d '{
    "baseline_texts": [
      "Traditional approach works",
      "Old methods are reliable"
    ],
    "comparison_texts": [
      "Modern AI is better",
      "New ML approaches excel"
    ]
  }'
```

### Clustering Analysis
```bash
curl -X POST https://embedding-engine.onrender.com/analyze/clusters \
  -H "Content-Type: application/json" \
  -d '{
    "texts": [
      "Machine learning is amazing",
      "AI technology rocks",
      "Weather is cold today",
      "Temperature dropped",
      "Neural networks are powerful"
    ],
    "similarity_threshold": 0.6
  }'
```

## 🎯 LAYER 4: REAL DATA INSIGHTS

### Model Performance Analysis
```bash
# Get top models by usage
curl "https://embedding-engine.onrender.com/insights/models?limit=100"
```

### Domain Analysis
```bash
# Analyze domain cohesion and patterns
curl "https://embedding-engine.onrender.com/insights/domains?limit=100"
```

### Model Comparison
```bash
# Compare specific model vs others
curl -X POST https://embedding-engine.onrender.com/insights/compare \
  -H "Content-Type: application/json" \
  -d '{
    "comparison_type": "model",
    "model": "gpt-4o"
  }'
```

### Random Segment Comparison
```bash
# Compare random segments of dataset
curl -X POST https://embedding-engine.onrender.com/insights/compare \
  -H "Content-Type: application/json" \
  -d '{
    "comparison_type": "random"
  }'
```

## 💡 USAGE PATTERNS

### 1. Quick Text Similarity
Use `/analyze/similarity` for comparing 2-10 texts instantly.

### 2. Content Drift Monitoring
Use `/analyze/drift` to track how content changes over time.

### 3. Automatic Grouping
Use `/analyze/clusters` to find natural groupings in your text data.

### 4. Model Performance Insights
Use `/insights/models` to understand which AI models perform best.

### 5. Domain Analysis
Use `/insights/domains` to analyze consistency across different domains.

## 🚨 RATE LIMITS & BEST PRACTICES

- **Batch Processing**: Use `/embed/batch` for multiple texts (up to 50)
- **Response Time**: Most operations complete in 1-5 seconds
- **Error Handling**: All endpoints return proper HTTP status codes
- **JSON Format**: All responses are valid JSON (numpy bool issues fixed)

## 🔧 TROUBLESHOOTING

### Common Issues
1. **500 Error**: Check JSON format of request body
2. **400 Error**: Missing required fields (texts, baseline_texts, etc.)
3. **503 Error**: Embedding model loading (rare, service auto-recovers)

### Support
- **Test Suite**: Run `./test_all_layers.sh` to verify all functionality
- **Health Check**: Monitor `/health` endpoint for system status

## 🎉 PRODUCTION READY!
All endpoints tested with 17,722 real responses across 21 AI models and 20 domains. 