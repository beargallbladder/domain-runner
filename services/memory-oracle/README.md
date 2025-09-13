# Memory Oracle Tensor Service

Advanced memory scoring and intelligence system for Domain Runner using multi-dimensional tensor analysis.

## Overview

The Memory Oracle service implements a sophisticated tensor-based scoring system that analyzes domains across multiple dimensions:

- **Memory Tensor**: Tracks recency, frequency, significance, and persistence of domain memories
- **Sentiment Tensor**: Analyzes emotional profiles and market sentiment
- **Grounding Tensor**: Measures factual accuracy, data consistency, and source reliability
- **Drift Detection**: Identifies concept, data, model, and temporal drift
- **Consensus Scoring**: Evaluates agreement levels across models and time

## Architecture

### Core Components

1. **Tensor Implementations** (`/src/tensors/`)
   - `MemoryTensor.ts`: Memory retention and decay algorithms
   - `SentimentTensor.ts`: Sentiment analysis and emotional profiling
   - `GroundingTensor.ts`: Data validation and reliability scoring

2. **Algorithm Implementations** (`/src/algorithms/`)
   - `DriftDetector.ts`: Multi-dimensional drift detection
   - `ConsensusScorer.ts`: Model agreement and consensus analysis

3. **Service Core** (`/src/`)
   - `MemoryOracleService.ts`: Main service orchestration
   - `index.ts`: Service entry point

## API Endpoints

### Health & Status
- `GET /health` - Service health check

### Tensor Computation
- `POST /tensors/compute` - Compute all tensors for a domain
- `POST /tensors/query` - Query specific tensor types

### Memory Tensor
- `GET /tensors/memory/:domainId` - Compute memory tensor
- `POST /tensors/memory/track-access` - Track memory access
- `GET /tensors/memory/top/:limit?` - Get top memories by score

### Sentiment Tensor
- `GET /tensors/sentiment/:domainId` - Compute sentiment tensor
- `GET /tensors/sentiment/:domainId/trends/:days?` - Get sentiment trends
- `GET /tensors/sentiment/market/distribution` - Market sentiment distribution

### Grounding Tensor
- `GET /tensors/grounding/:domainId` - Compute grounding tensor
- `POST /tensors/grounding/verify-fact` - Verify factual claims
- `GET /tensors/grounding/ungrounded/:threshold?` - Find ungrounded domains

### Drift Detection
- `GET /drift/detect/:domainId` - Detect drift for domain
- `GET /drift/alerts` - Get active drift alerts
- `POST /drift/alerts/:alertId/acknowledge` - Acknowledge alert
- `GET /drift/sectors/:threshold?` - Find drifting sectors

### Consensus Scoring
- `GET /consensus/compute/:domainId` - Compute consensus score
- `GET /consensus/insights/:domainId?` - Get consensus insights
- `GET /consensus/conflicted/:limit?` - Find conflicted domains
- `GET /consensus/sectors` - Sector consensus analysis

### Composite Analysis
- `GET /analysis/domain/:domainId` - Comprehensive domain analysis
- `POST /analysis/batch` - Batch tensor computation

## Configuration

Environment variables:
- `DATABASE_URL` - PostgreSQL connection string
- `PORT` - Service port (default: 3006)
- `LOG_LEVEL` - Logging level (default: info)
- `TENSOR_COMPUTE_INTERVAL` - Minutes between tensor computations (default: 60)
- `DRIFT_DETECTION_INTERVAL` - Minutes between drift detections (default: 120)
- `CONSENSUS_COMPUTE_INTERVAL` - Minutes between consensus computations (default: 90)

## Development

```bash
# Install dependencies
npm install

# Run in development
npm run dev

# Build for production
npm run build

# Start production server
npm start
```

## Deployment

The service is configured for deployment on Render.com:

```bash
# Deploy using Render CLI
render deploy

# Or push to main branch for auto-deploy
git push origin main
```

## Tensor Scoring Details

### Memory Tensor Components
- **Recency**: Time-based decay of memory importance
- **Frequency**: Access patterns and usage density
- **Significance**: Alert priorities and synthesis counts
- **Persistence**: Long-term stability and continuity

### Sentiment Components
- **Distribution**: Positive, negative, neutral, mixed ratios
- **Emotions**: Confidence, excitement, concern, urgency, opportunity
- **Market Sentiment**: Bullish, bearish, neutral, volatile classifications

### Grounding Components
- **Factual Accuracy**: Verified vs disputed facts ratio
- **Data Consistency**: Cross-response agreement levels
- **Source Reliability**: Model performance tracking
- **Temporal Stability**: Consistency over time
- **Cross Validation**: Multi-model agreement

### Drift Types
- **Concept Drift**: Changes in semantic patterns
- **Data Drift**: Distribution and characteristic changes
- **Model Drift**: Performance degradation
- **Temporal Drift**: Time-based pattern changes

### Consensus Levels
- **Strong**: High agreement, minimal dissensus
- **Moderate**: Good agreement with some variance
- **Weak**: Limited agreement, notable differences
- **Conflicted**: Significant disagreement across models

## Database Schema

The service creates and manages several tables:
- `memory_tensors` - Memory tensor computations
- `sentiment_tensors` - Sentiment analysis results
- `grounding_tensors` - Grounding scores
- `drift_detection_results` - Drift detection outcomes
- `consensus_scores` - Model consensus metrics
- Plus supporting tables for time series, alerts, and insights

## Monitoring

The service provides comprehensive monitoring through:
- Scheduled tensor computations
- Real-time drift detection
- Consensus tracking
- Performance metrics
- Alert generation

## Integration

The Memory Oracle service integrates with:
- Domain Runner core database
- Domain response processing
- Competitive intelligence systems
- Alert management platforms