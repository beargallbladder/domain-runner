# Domain Runner Platform Architecture

## Executive Summary

The Domain Runner platform is a sophisticated microservices-based AI brand intelligence system that processes domains through multiple LLM providers to generate comprehensive brand perception data. The architecture is designed for scalability, reliability, and real-time insights.

## System Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────┐
│                          DOMAIN RUNNER PLATFORM                         │
├─────────────────────────────────────────────────────────────────────────┤
│                              Frontend Layer                             │
├─────────────────────────────────────────────────────────────────────────┤
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐          │
│  │   React SPA     │  │   Next.js App   │  │  Admin Panel    │          │
│  │   (Vercel)      │  │   (Vercel)      │  │  (Internal)     │          │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘          │
├─────────────────────────────────────────────────────────────────────────┤
│                               API Gateway                               │
├─────────────────────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────────────────────────┐│
│  │                     Public API (FastAPI)                            ││
│  │                    llmrank.io / Render.com                          ││
│  │  • Domain Intelligence  • Rankings  • Categories  • Stats           ││
│  └─────────────────────────────────────────────────────────────────────┘│
├─────────────────────────────────────────────────────────────────────────┤
│                          Microservices Layer                           │
├─────┬─────────┬─────────┬─────────┬─────────┬─────────┬─────────┬───────┤
│ ┌───▼───┐ ┌───▼───┐ ┌───▼───┐ ┌───▼───┐ ┌───▼───┐ ┌───▼───┐ ┌───▼───┐ │
│ │Domain │ │Embed  │ │Cohort │ │News   │ │Reality│ │SEO    │ │Swarm  │ │
│ │Proc.  │ │Engine │ │Intel  │ │Corr.  │ │Valid. │ │Metrics│ │Intel  │ │
│ │v2     │ │(Py)   │ │(TS)   │ │(TS)   │ │(TS)   │ │(TS)   │ │(TS)   │ │
│ └───────┘ └───────┘ └───────┘ └───────┘ └───────┘ └───────┘ └───────┘ │
├─────────────────────────────────────────────────────────────────────────┤
│                          Processing Layer                              │
├─────────────────────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────────────────────────┐│
│  │              Sophisticated Runner (TypeScript)                      ││
│  │  • Multi-LLM Processing  • Rate Limiting  • Error Handling          ││
│  │  • Tiered Processing (Fast/Medium/Slow)  • Load Balancing           ││
│  └─────────────────────────────────────────────────────────────────────┘│
├─────────────────────────────────────────────────────────────────────────┤
│                            LLM Providers                               │
├─────────────────────────────────────────────────────────────────────────┤
│ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐ │
│ │ OpenAI  │ │Anthropic│ │DeepSeek │ │Together │ │Mistral  │ │ XAI     │ │
│ │ GPT-4o  │ │ Claude  │ │  Chat   │ │ Llama   │ │  AI     │ │ Grok    │ │
│ └─────────┘ └─────────┘ └─────────┘ └─────────┘ └─────────┘ └─────────┘ │
│ ┌─────────┐ ┌─────────┐                                                 │
│ │Perplexity│ │ Google  │                                                │
│ │ Sonar   │ │ Gemini  │                                                 │
│ └─────────┘ └─────────┘                                                 │
├─────────────────────────────────────────────────────────────────────────┤
│                            Data Layer                                  │
├─────────────────────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────────────────────────┐│
│  │                PostgreSQL Database (Render.com)                     ││
│  │  • Domains  • Responses  • Cache  • Analytics  • Monitoring         ││
│  │  • High Performance Indexes  • Connection Pooling                   ││
│  └─────────────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────────────┘
```

## Service Details

### 1. Frontend Services

#### React SPA (`/services/frontend`)
- **Technology**: React 18, Vite, TypeScript
- **Deployment**: Vercel
- **Purpose**: Main user interface for domain intelligence
- **Features**:
  - Real-time domain rankings
  - Interactive dashboards
  - Category-based browsing
  - Risk monitoring
  - Search and filtering

#### Next.js Application (`/src`)
- **Technology**: Next.js 15, TypeScript, Tailwind CSS
- **Deployment**: Vercel
- **Purpose**: Marketing site and additional interfaces
- **Features**:
  - SEO-optimized pages
  - Server-side rendering
  - Static site generation

### 2. API Gateway

#### Public API (`/services/public-api`)
- **Technology**: FastAPI (Python)
- **Deployment**: Render.com
- **Domain**: llmrank.io
- **Purpose**: Main public-facing API
- **Key Endpoints**:
  - `/api/domains/{domain}/public` - Domain intelligence
  - `/api/rankings` - Paginated rankings
  - `/api/categories` - Category analytics
  - `/api/stats` - Platform statistics
  - `/health` - Health monitoring

**Performance Characteristics**:
- Sub-200ms response times
- 15-connection database pool
- Aggressive caching (30-minute TTL)
- CORS-enabled for web applications

### 3. Core Processing Services

#### Sophisticated Runner (`/services/sophisticated-runner`)
- **Technology**: TypeScript, Express.js
- **Deployment**: Render.com
- **Purpose**: Primary domain processing engine
- **Capabilities**:
  - Multi-LLM orchestration (8 providers)
  - Tiered processing strategy
  - Load balancing across API keys
  - Rate limiting and error handling
  - Batch processing (50-100 domains)

**Processing Tiers**:
1. **Fast Tier**: DeepSeek, Together AI, XAI, Perplexity
2. **Medium Tier**: OpenAI GPT-4o-mini, Mistral
3. **Slow Tier**: Anthropic Claude, Google Gemini

#### Domain Processor v2 (`/services/domain-processor-v2`)
- **Technology**: TypeScript with dependency injection
- **Purpose**: Next-generation domain processing
- **Architecture**:
  - Modular design with interfaces
  - Strategy pattern for processing
  - Comprehensive error handling
  - Monitoring and metrics

**Key Modules**:
- `LLMProviderRegistry`: Manages AI provider connections
- `DomainProcessor`: Orchestrates processing workflows
- `JobQueue`: Handles asynchronous processing
- `MonitoringService`: Tracks performance metrics

### 4. Intelligence Services

#### Cohort Intelligence (`/services/cohort-intelligence`)
- **Technology**: TypeScript
- **Purpose**: Group domain analysis and competitive insights
- **Features**:
  - Industry benchmarking
  - Competitive positioning
  - Market trend analysis

#### Industry Intelligence (`/services/industry-intelligence`)
- **Technology**: TypeScript
- **Purpose**: Industry-specific analysis and benchmarks
- **Features**:
  - JOLT framework implementation
  - Industry mapping
  - Sector performance tracking

#### Swarm Intelligence (`/services/swarm-intelligence`)
- **Technology**: TypeScript
- **Purpose**: Coordinated multi-agent analysis
- **Features**:
  - Agent coordination
  - Distributed processing
  - Collective intelligence algorithms

### 5. Data Services

#### Embedding Engine (`/services/embedding-engine`)
- **Technology**: Python
- **Purpose**: Vector embeddings and similarity analysis
- **Features**:
  - Text embedding generation
  - Similarity calculations
  - Drift detection
  - Caching optimization

#### SEO Metrics Runner (`/services/seo-metrics-runner`)
- **Technology**: TypeScript
- **Purpose**: SEO performance tracking
- **Features**:
  - Technical SEO analysis
  - Performance metrics
  - Search visibility tracking

### 6. Monitoring Services

#### News Correlation Service (`/services/news-correlation-service`)
- **Technology**: TypeScript
- **Purpose**: News impact analysis
- **Features**:
  - News event correlation
  - Tesla JOLT monitoring
  - Market impact analysis

#### Reality Validator (`/services/reality-validator`)
- **Technology**: TypeScript
- **Purpose**: Data validation and quality assurance
- **Features**:
  - Business data validation
  - Financial metrics verification
  - Market data cross-referencing

### 7. Legacy Services

#### Raw Capture Runner (`/services/raw-capture-runner`)
- **Technology**: TypeScript
- **Purpose**: Legacy domain processing (being phased out)
- **Status**: Maintenance mode

#### Sophisticated Runner Rust (`/services/sophisticated-runner-rust`)
- **Technology**: Rust
- **Purpose**: High-performance processing experiment
- **Status**: Experimental

## Database Schema

### Core Tables

#### Domains Table
```sql
CREATE TABLE domains (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    domain TEXT NOT NULL UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_processed_at TIMESTAMP WITH TIME ZONE,
    process_count INTEGER DEFAULT 0,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'error')),
    error_count INTEGER DEFAULT 0,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

#### Responses Table
```sql
CREATE TABLE responses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    domain_id UUID NOT NULL REFERENCES domains(id),
    model TEXT NOT NULL,
    prompt_id TEXT NOT NULL,
    raw_response TEXT NOT NULL,
    token_count INTEGER,
    latency_ms INTEGER,
    error TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

#### Public Domain Cache
```sql
CREATE TABLE public_domain_cache (
    domain TEXT PRIMARY KEY,
    memory_score DECIMAL(5,2),
    ai_consensus_percentage DECIMAL(5,2),
    cohesion_score DECIMAL(4,3),
    drift_delta DECIMAL(5,2),
    reputation_risk TEXT,
    business_category TEXT,
    market_position TEXT,
    key_themes TEXT[],
    response_count INTEGER,
    unique_models INTEGER,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

### Performance Optimization

#### Indexes
```sql
-- Primary query indexes
CREATE INDEX idx_domains_status ON domains(status);
CREATE INDEX idx_domains_last_processed ON domains(last_processed_at);
CREATE INDEX idx_responses_domain_time ON responses(domain_id, created_at);
CREATE INDEX idx_cache_memory_score ON public_domain_cache(memory_score DESC);
CREATE INDEX idx_cache_reputation_risk ON public_domain_cache(reputation_risk);

-- Composite indexes for complex queries
CREATE INDEX idx_cache_score_consensus ON public_domain_cache(memory_score DESC, ai_consensus_percentage DESC);
CREATE INDEX idx_responses_model_time ON responses(model, created_at);
```

## Deployment Architecture

### Production Environment (Render.com)

```yaml
# render.yaml configuration
services:
  - type: web
    name: llm-pagerank-public-api
    env: python
    buildCommand: "pip install -r requirements.txt"
    startCommand: "uvicorn production_api:app --host 0.0.0.0 --port $PORT"
    domains:
      - llmrank.io
    healthCheckPath: /health
    
  - type: web
    name: sophisticated-runner
    runtime: node
    buildCommand: "npm install && npm run build"
    startCommand: "npm start"
    healthCheckPath: /health
    
  - type: web
    name: seo-metrics-runner
    runtime: node
    buildCommand: "npm install"
    startCommand: "npm run start:graceful"
    healthCheckPath: /health
```

### Database Configuration

**Primary Database**: PostgreSQL on Render.com
- **Connection String**: Managed via environment variables
- **Pool Configuration**: 
  - Min connections: 5
  - Max connections: 100
  - Connection timeout: 30 seconds
  - Idle timeout: 30 seconds

**Database Features**:
- Automatic backups
- High availability
- Connection pooling
- Performance monitoring

### Environment Variables

#### Shared Configuration
```bash
DATABASE_URL=postgresql://user:pass@host:port/db
NODE_ENV=production
PORT=8000
```

#### LLM Provider Keys
```bash
# OpenAI
OPENAI_API_KEY=sk-...
OPENAI_API_KEY_2=sk-...
OPENAI_API_KEY_3=sk-...
OPENAI_API_KEY_4=sk-...

# Anthropic
ANTHROPIC_API_KEY=sk-ant-...
ANTHROPIC_API_KEY_2=sk-ant-...

# DeepSeek
DEEPSEEK_API_KEY=sk-...
DEEPSEEK_API_KEY_2=sk-...
DEEPSEEK_API_KEY_3=sk-...

# Together AI
TOGETHER_API_KEY=...
TOGETHER_API_KEY_2=...
TOGETHER_API_KEY_3=...

# Mistral
MISTRAL_API_KEY=...
MISTRAL_API_KEY_2=...

# XAI
XAI_API_KEY=xai-...
XAI_API_KEY_2=xai-...

# Perplexity
PERPLEXITY_API_KEY=pplx-...
PERPLEXITY_API_KEY_2=pplx-...

# Google
GOOGLE_API_KEY=...
GOOGLE_API_KEY_2=...
```

## Data Flow

### Domain Processing Pipeline

```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│   Domain    │    │  Status:    │    │ LLM Batch   │    │  Response   │
│   Added     │───►│  Pending    │───►│ Processing  │───►│ Collection  │
└─────────────┘    └─────────────┘    └─────────────┘    └─────────────┘
                                             │                    │
                                             ▼                    ▼
┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│ Public API  │◄───│   Cache     │◄───│   Data      │◄───│   Analysis  │
│   Serving   │    │  Updated    │    │ Processing  │    │ & Scoring   │
└─────────────┘    └─────────────┘    └─────────────┘    └─────────────┘
```

### Processing Steps

1. **Domain Ingestion**
   - Domains added to `domains` table with `pending` status
   - Validation and deduplication
   - Priority assignment

2. **Batch Processing**
   - Sophisticated Runner queries for pending domains
   - Batch size optimization (50-100 domains)
   - Parallel processing across workers

3. **LLM Orchestration**
   - Tiered processing (Fast → Medium → Slow)
   - Multi-provider redundancy
   - Rate limiting and error handling
   - Response collection and validation

4. **Data Analysis**
   - Response aggregation and scoring
   - Consensus calculation
   - Risk assessment
   - Trend analysis

5. **Cache Population**
   - `public_domain_cache` table updates
   - Performance metric calculation
   - Index optimization

6. **API Serving**
   - Fast cache-based responses
   - Real-time metrics
   - Pagination and filtering

## Performance Characteristics

### Throughput Metrics

- **Domain Processing**: 50-100 domains per batch
- **API Response Time**: <200ms (cached), <2s (uncached)
- **Database Connections**: 100 max concurrent
- **LLM Provider Calls**: 30 concurrent workers
- **Total Daily Capacity**: 10,000+ domain analyses

### Scalability Features

- **Horizontal Scaling**: Independent service scaling
- **Database Pooling**: Connection pool optimization
- **Caching Strategy**: Multi-layer caching
- **Load Balancing**: API key rotation across providers
- **Queue Management**: Async processing queues

### Reliability Features

- **Health Monitoring**: Comprehensive health checks
- **Error Handling**: Graceful degradation
- **Circuit Breakers**: Provider failure isolation
- **Retry Logic**: Exponential backoff strategies
- **Data Consistency**: Transaction management

## Security Architecture

### API Security

- **CORS Configuration**: Controlled cross-origin access
- **Rate Limiting**: Per-IP and per-endpoint limits
- **Input Validation**: Comprehensive parameter validation
- **SQL Injection Prevention**: Parameterized queries
- **Error Handling**: Secure error messages

### Infrastructure Security

- **TLS Encryption**: All API communications
- **Environment Variables**: Secure secret management
- **Database Security**: Connection encryption
- **API Key Management**: Rotation and monitoring
- **Access Control**: Service-level permissions

### Monitoring and Alerting

- **Health Checks**: Automated service monitoring
- **Performance Metrics**: Response time tracking
- **Error Tracking**: Comprehensive logging
- **Usage Analytics**: API usage monitoring
- **Capacity Planning**: Resource utilization tracking

## Future Architecture Considerations

### Planned Enhancements

1. **Event-Driven Architecture**
   - Message queues (Redis/RabbitMQ)
   - Event sourcing
   - Real-time notifications

2. **Advanced Caching**
   - Redis cache layer
   - CDN integration
   - Edge computing

3. **Machine Learning Pipeline**
   - Model training infrastructure
   - A/B testing framework
   - Automated model deployment

4. **Analytics Platform**
   - Real-time dashboards
   - Business intelligence
   - Predictive analytics

5. **Global Distribution**
   - Multi-region deployment
   - Edge locations
   - Geographic optimization

---

*Architecture documentation version 2.1 - Last updated: July 20, 2025*