# Domain Processor v2 - Modular Architecture

A clean, modular domain processing system designed for scalability, maintainability, and testability.

## Architecture Overview

```
src/
├── api/                    # REST API layer
│   └── routes/            # Route handlers
├── core/                   # Core application setup
│   └── container.ts       # Dependency injection container
├── modules/               # Business logic modules
│   ├── database/          # Database operations
│   ├── llm-providers/     # LLM API integrations
│   ├── domain-processor/  # Domain processing logic
│   ├── queue/            # Job queue management
│   └── monitoring/       # Metrics and health checks
├── config/               # Configuration management
├── types/                # TypeScript type definitions
└── utils/                # Utility functions
```

## Key Features

### 1. **Modular Design**
- Clear separation of concerns
- Each module has well-defined interfaces
- Easy to test, maintain, and extend

### 2. **Dependency Injection**
- Centralized container for dependency management
- Easy to swap implementations
- Simplified testing with mock implementations

### 3. **Provider Registry**
- Flexible LLM provider management
- Support for multiple providers and API keys
- Automatic key rotation and failure handling

### 4. **Queue Management**
- Scalable job processing
- Priority-based scheduling
- Configurable concurrency

### 5. **Monitoring & Observability**
- Built-in health checks
- Metrics collection
- Alert system
- Performance tracking

### 6. **Configuration Management**
- Environment-based configuration
- Configuration validation
- Support for multiple environments

## API Endpoints

### Domain Processing
- `POST /api/v2/process-pending-domains` - Process domains with queue
- `POST /api/v2/ultra-fast-process` - Direct batch processing
- `GET /api/v2/domains/:id` - Get domain information
- `POST /api/v2/domains/:id/retry` - Retry failed domain
- `GET /api/v2/stats` - Domain and queue statistics

### Health & Monitoring
- `GET /api/v2/health` - System health status
- `GET /api/v2/api-keys` - API key availability
- `GET /api/v2/provider-usage` - Provider metrics
- `GET /api/v2/metrics` - System metrics
- `GET /api/v2/alerts` - Active alerts

## Configuration

### Environment Variables

```bash
# Database
DATABASE_URL=postgresql://user:pass@host/db

# Queue Configuration
QUEUE_CONCURRENCY=10
QUEUE_BATCH_SIZE=50

# LLM Provider API Keys
OPENAI_API_KEY=sk-...
OPENAI_API_KEY_2=sk-...
ANTHROPIC_API_KEY=sk-ant-...
DEEPSEEK_API_KEY=...
# ... more providers

# Server
PORT=3003
NODE_ENV=production
```

## Deployment

### Build
```bash
npm install
npm run build
```

### Run
```bash
npm start
```

### Development
```bash
npm run dev
```

## Scaling Considerations

1. **Horizontal Scaling**
   - Stateless design allows multiple instances
   - Queue-based processing distributes load
   - Database connection pooling

2. **Provider Management**
   - Multiple API keys per provider
   - Automatic key rotation
   - Rate limiting per provider

3. **Monitoring**
   - Real-time metrics
   - Alert thresholds
   - Performance tracking

## Testing

```bash
# Run all tests
npm test

# Watch mode
npm run test:watch

# Coverage report
npm run test:coverage
```

## Module Descriptions

### Database Module
- Handles all database operations
- Connection pooling
- Transaction support
- Query optimization

### LLM Providers Module
- Provider abstraction
- Rate limiting
- Retry logic
- Response parsing

### Domain Processor Module
- Core business logic
- Processing strategies
- Error handling
- Retry policies

### Queue Module
- Job scheduling
- Priority management
- Concurrency control
- Progress tracking

### Monitoring Module
- Health checks
- Metrics collection
- Alert management
- Performance analysis# Restart Sat Aug  9 09:34:54 PDT 2025
# Force deployment Sat Aug  9 10:20:09 PDT 2025
