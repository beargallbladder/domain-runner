# Developer Setup Guide

## Overview

This guide helps new developers get up and running with the Domain Runner platform quickly. The platform is a microservices-based AI brand intelligence system that requires multiple technologies and configurations.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Quick Setup](#quick-setup)
3. [Detailed Setup](#detailed-setup)
4. [IDE Configuration](#ide-configuration)
5. [Development Workflow](#development-workflow)
6. [Testing](#testing)
7. [Common Tasks](#common-tasks)
8. [Troubleshooting](#troubleshooting)

## Prerequisites

### System Requirements

- **Operating System**: macOS, Linux, or Windows with WSL2
- **RAM**: 8GB minimum, 16GB recommended
- **Storage**: 10GB free space
- **CPU**: 4 cores recommended
- **Internet**: Stable connection for API calls

### Required Software

#### Core Tools

```bash
# Node.js 18+ and npm
# macOS
brew install node

# Ubuntu/Debian
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Windows
# Download from https://nodejs.org/

# Verify installation
node --version  # Should be 18+
npm --version   # Should be 8+
```

```bash
# Python 3.9+
# macOS
brew install python@3.9

# Ubuntu/Debian
sudo apt update
sudo apt install python3.9 python3.9-pip python3.9-venv

# Windows
# Download from https://python.org/

# Verify installation
python3 --version  # Should be 3.9+
pip3 --version
```

```bash
# PostgreSQL 14+
# macOS
brew install postgresql@14
brew services start postgresql@14

# Ubuntu/Debian
sudo apt update
sudo apt install postgresql-14 postgresql-client-14

# Windows
# Download from https://postgresql.org/
```

```bash
# Git
# macOS
brew install git

# Ubuntu/Debian
sudo apt install git

# Windows
# Download from https://git-scm.com/
```

#### Optional but Recommended

```bash
# Docker and Docker Compose
# macOS
brew install docker
# Or use Docker Desktop

# Ubuntu/Debian
sudo apt install docker.io docker-compose

# Windows
# Download Docker Desktop
```

```bash
# Redis (for future caching features)
# macOS
brew install redis

# Ubuntu/Debian
sudo apt install redis-server
```

## Quick Setup

### 1. Clone and Setup

```bash
# Clone the repository
git clone https://github.com/your-org/domain-runner.git
cd domain-runner

# Run the setup script
./scripts/setup-dev.sh
```

### 2. Environment Configuration

```bash
# Copy environment template
cp .env.example .env

# Edit with your configuration
nano .env  # or your preferred editor
```

### 3. Start Development Environment

```bash
# Using Docker (recommended)
docker-compose up -d

# Or start services individually (see Detailed Setup)
```

### 4. Verify Setup

```bash
# Check all services are running
./scripts/health-check-local.sh

# Should show all services as healthy
```

## Detailed Setup

### 1. Repository Setup

```bash
# Clone the repository
git clone https://github.com/your-org/domain-runner.git
cd domain-runner

# Install global dependencies
npm install -g typescript ts-node nodemon

# Install Python tools
pip3 install --user virtualenv black flake8 pytest
```

### 2. Database Setup

#### Option A: Docker (Recommended)

```bash
# Start PostgreSQL container
docker run --name domain-runner-db \
  -e POSTGRES_DB=domain_runner \
  -e POSTGRES_USER=admin \
  -e POSTGRES_PASSWORD=devpassword \
  -p 5432:5432 \
  -d postgres:14

# Verify connection
docker exec -it domain-runner-db psql -U admin -d domain_runner -c "SELECT version();"
```

#### Option B: Local PostgreSQL

```bash
# Start PostgreSQL service
# macOS
brew services start postgresql@14

# Ubuntu/Linux
sudo systemctl start postgresql

# Create database and user
sudo -u postgres psql
```

```sql
-- In PostgreSQL shell
CREATE DATABASE domain_runner;
CREATE USER admin WITH PASSWORD 'devpassword';
GRANT ALL PRIVILEGES ON DATABASE domain_runner TO admin;
\q
```

#### Database Initialization

```bash
# Set database URL
export DATABASE_URL="postgresql://admin:devpassword@localhost:5432/domain_runner"

# Run initial schema
psql $DATABASE_URL -f schemas/init.sql

# Run migrations
for migration in migrations/*.sql; do
  echo "Running $migration..."
  psql $DATABASE_URL -f "$migration"
done

# Seed test data (optional)
psql $DATABASE_URL -f scripts/seed-test-data.sql
```

### 3. Environment Configuration

Create `.env` file in the project root:

```bash
# Core Configuration
NODE_ENV=development
LOG_LEVEL=debug
PORT=3000

# Database
DATABASE_URL=postgresql://admin:devpassword@localhost:5432/domain_runner

# API Keys (Get from respective providers)
OPENAI_API_KEY=sk-your-openai-key-here
ANTHROPIC_API_KEY=sk-ant-your-anthropic-key-here
DEEPSEEK_API_KEY=sk-your-deepseek-key-here
MISTRAL_API_KEY=your-mistral-key-here
XAI_API_KEY=xai-your-xai-key-here
TOGETHER_API_KEY=your-together-key-here
PERPLEXITY_API_KEY=pplx-your-perplexity-key-here
GOOGLE_API_KEY=your-google-key-here

# Development Settings
BATCH_SIZE=5
MAX_CONCURRENT_REQUESTS=3
RATE_LIMIT_DELAY=2000
ENABLE_DEBUG_LOGGING=true

# Frontend
VITE_API_BASE_URL=http://localhost:8000
```

### 4. Service Setup

#### Public API (Python/FastAPI)

```bash
cd services/public-api

# Create virtual environment
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Run development server
uvicorn production_api:app --reload --port 8000

# Test endpoint
curl http://localhost:8000/health
```

#### Sophisticated Runner (TypeScript)

```bash
cd services/sophisticated-runner

# Install dependencies
npm install

# Build TypeScript
npm run build

# Run in development mode
npm run dev

# Test endpoint
curl http://localhost:3003/health
```

#### Frontend (React)

```bash
cd services/frontend

# Install dependencies
npm install

# Start development server
npm run dev

# Open browser to http://localhost:3000
```

#### Additional Services

```bash
# SEO Metrics Runner
cd services/seo-metrics-runner
npm install
npm run dev

# Embedding Engine
cd services/embedding-engine
pip install -r requirements.txt
python embedding_runner.py

# Cohort Intelligence
cd services/cohort-intelligence
npm install
npm run dev
```

### 5. Docker Development Environment

#### Docker Compose Setup

```yaml
# docker-compose.dev.yml
version: '3.8'

services:
  database:
    image: postgres:14
    environment:
      POSTGRES_DB: domain_runner
      POSTGRES_USER: admin
      POSTGRES_PASSWORD: devpassword
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./schemas/init.sql:/docker-entrypoint-initdb.d/init.sql

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"

  public-api:
    build: 
      context: ./services/public-api
      dockerfile: Dockerfile.dev
    ports:
      - "8000:8000"
    environment:
      DATABASE_URL: postgresql://admin:devpassword@database:5432/domain_runner
      REDIS_URL: redis://redis:6379
    volumes:
      - ./services/public-api:/app
    depends_on:
      - database
      - redis

  sophisticated-runner:
    build:
      context: ./services/sophisticated-runner  
      dockerfile: Dockerfile.dev
    ports:
      - "3003:3003"
    environment:
      DATABASE_URL: postgresql://admin:devpassword@database:5432/domain_runner
      NODE_ENV: development
    volumes:
      - ./services/sophisticated-runner:/app
      - /app/node_modules
    depends_on:
      - database

  frontend:
    build:
      context: ./services/frontend
      dockerfile: Dockerfile.dev
    ports:
      - "3000:3000"
    environment:
      VITE_API_BASE_URL: http://localhost:8000
    volumes:
      - ./services/frontend:/app
      - /app/node_modules

volumes:
  postgres_data:
```

#### Start Docker Environment

```bash
# Start all services
docker-compose -f docker-compose.dev.yml up -d

# View logs
docker-compose -f docker-compose.dev.yml logs -f

# Stop services
docker-compose -f docker-compose.dev.yml down
```

## IDE Configuration

### Visual Studio Code

#### Recommended Extensions

```json
{
  "recommendations": [
    "ms-python.python",
    "ms-vscode.vscode-typescript-next",
    "bradlc.vscode-tailwindcss",
    "ms-vscode.vscode-json",
    "ms-vscode.vscode-eslint",
    "ms-python.flake8",
    "ms-python.black-formatter",
    "ms-vscode.vscode-docker",
    "ms-vscode-remote.remote-containers"
  ]
}
```

#### Workspace Settings

```json
{
  "typescript.preferences.importModuleSpecifier": "relative",
  "editor.formatOnSave": true,
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  },
  "python.defaultInterpreterPath": "./services/public-api/venv/bin/python",
  "python.formatting.provider": "black",
  "python.linting.flake8Enabled": true,
  "eslint.workingDirectories": [
    "services/sophisticated-runner",
    "services/frontend",
    "services/seo-metrics-runner"
  ]
}
```

#### Debug Configuration

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Debug Public API",
      "type": "python",
      "request": "launch",
      "program": "${workspaceFolder}/services/public-api/production_api.py",
      "console": "integratedTerminal",
      "cwd": "${workspaceFolder}/services/public-api"
    },
    {
      "name": "Debug Sophisticated Runner",
      "type": "node",
      "request": "launch",
      "program": "${workspaceFolder}/services/sophisticated-runner/src/index.ts",
      "outFiles": ["${workspaceFolder}/services/sophisticated-runner/dist/**/*.js"],
      "runtimeArgs": ["-r", "ts-node/register"]
    }
  ]
}
```

### WebStorm/IntelliJ

#### Configuration

1. Open project root directory
2. Mark directories:
   - `services/*/src` as Source Roots
   - `services/*/tests` as Test Roots
   - `services/*/node_modules` as Excluded

3. Configure interpreters:
   - Node.js: Point to local Node installation
   - Python: Point to virtual environment

## Development Workflow

### Branch Strategy

```bash
# Main branches
main         # Production-ready code
staging      # Pre-production testing
develop      # Integration branch

# Feature branches
feature/new-llm-provider
feature/dashboard-improvements
bugfix/memory-leak-fix
hotfix/critical-security-patch
```

### Git Workflow

```bash
# 1. Create feature branch
git checkout develop
git pull origin develop
git checkout -b feature/your-feature-name

# 2. Make changes and commit
git add .
git commit -m "feat: add new LLM provider support"

# 3. Push and create PR
git push origin feature/your-feature-name
# Create Pull Request via GitHub/GitLab

# 4. Merge and cleanup
git checkout develop
git pull origin develop
git branch -d feature/your-feature-name
```

### Commit Message Convention

```bash
# Format: type(scope): description

# Types:
feat      # New feature
fix       # Bug fix
docs      # Documentation changes
style     # Code style changes
refactor  # Code refactoring
test      # Adding/updating tests
chore     # Maintenance tasks

# Examples:
feat(api): add domain intelligence endpoint
fix(db): resolve connection pool leak
docs(readme): update setup instructions
test(runner): add integration tests
```

### Code Style

#### TypeScript/JavaScript

```bash
# Install ESLint and Prettier
npm install -g eslint prettier

# Run linting
npm run lint

# Auto-fix issues
npm run lint:fix

# Format code
npm run format
```

#### Python

```bash
# Install formatters and linters
pip install black flake8 isort

# Format code
black services/public-api/
isort services/public-api/

# Check style
flake8 services/public-api/
```

## Testing

### Unit Tests

#### TypeScript Services

```bash
cd services/sophisticated-runner

# Run tests
npm test

# Run tests in watch mode
npm run test:watch

# Generate coverage report
npm run test:coverage
```

#### Python Services

```bash
cd services/public-api

# Activate virtual environment
source venv/bin/activate

# Run tests
pytest

# Run with coverage
pytest --cov=.

# Run specific test file
pytest tests/test_api.py
```

### Integration Tests

```bash
# Start test environment
docker-compose -f docker-compose.test.yml up -d

# Run integration tests
npm run test:integration

# Run end-to-end tests
npm run test:e2e
```

### Manual Testing

```bash
# Health checks
curl http://localhost:8000/health
curl http://localhost:3003/health

# API endpoints
curl "http://localhost:8000/api/domains/google.com/public"
curl "http://localhost:8000/api/rankings?limit=5"

# Process domains
curl -X POST http://localhost:3003/process-pending-domains
```

## Common Tasks

### Adding a New LLM Provider

1. **Update Provider Configuration**

```typescript
// services/sophisticated-runner/src/index.ts
const NEW_PROVIDER = {
  name: 'newprovider',
  model: 'model-name',
  keys: [process.env.NEWPROVIDER_API_KEY].filter(Boolean),
  endpoint: 'https://api.newprovider.com/v1/chat/completions',
  tier: 'fast'
};
```

2. **Add Environment Variable**

```bash
# .env
NEWPROVIDER_API_KEY=your-key-here
```

3. **Update API Call Logic**

```typescript
// Add provider-specific handling in callLLMWithKey function
if (provider.name === 'newprovider') {
  headers = {
    'Authorization': `Bearer ${apiKey}`,
    'Content-Type': 'application/json',
    'Custom-Header': 'value'
  };
  // ... provider-specific logic
}
```

### Adding a New API Endpoint

1. **Add Route to Public API**

```python
# services/public-api/production_api.py
@app.get("/api/new-endpoint")
async def new_endpoint():
    # Implementation
    return {"data": "response"}
```

2. **Add Database Query**

```python
async with pool.acquire() as conn:
    result = await conn.fetch("""
        SELECT * FROM your_table 
        WHERE condition = $1
    """, parameter)
```

3. **Update API Documentation**

```markdown
### New Endpoint

GET /api/new-endpoint

Returns new data.
```

### Database Migration

1. **Create Migration File**

```sql
-- migrations/003_add_new_table.sql
CREATE TABLE new_table (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_new_table_name ON new_table(name);
```

2. **Apply Migration**

```bash
psql $DATABASE_URL -f migrations/003_add_new_table.sql
```

3. **Update Schema Documentation**

```markdown
### New Table

- **Purpose**: Store new data
- **Columns**: id, name, created_at
- **Indexes**: name
```

### Performance Optimization

1. **Database Query Optimization**

```sql
-- Check slow queries
SELECT query, mean_exec_time, calls 
FROM pg_stat_statements 
ORDER BY mean_exec_time DESC 
LIMIT 10;

-- Add indexes for common queries
CREATE INDEX CONCURRENTLY idx_responses_domain_model 
ON responses(domain_id, model);
```

2. **API Response Caching**

```python
from functools import lru_cache

@lru_cache(maxsize=1000)
async def cached_domain_data(domain: str):
    # Expensive computation
    return result
```

3. **Memory Usage Monitoring**

```typescript
// Add memory monitoring
setInterval(() => {
  const usage = process.memoryUsage();
  console.log('Memory usage:', {
    rss: Math.round(usage.rss / 1024 / 1024) + 'MB',
    heapUsed: Math.round(usage.heapUsed / 1024 / 1024) + 'MB'
  });
}, 60000);
```

## Troubleshooting

### Common Issues

#### Database Connection Failed

```bash
# Check if PostgreSQL is running
ps aux | grep postgres
# Or
docker ps | grep postgres

# Check connection string
echo $DATABASE_URL

# Test connection
psql $DATABASE_URL -c "SELECT 1;"
```

#### Node.js Module Issues

```bash
# Clear cache and reinstall
rm -rf node_modules package-lock.json
npm install

# Check Node.js version
node --version  # Should be 18+

# Update npm
npm install -g npm@latest
```

#### Python Virtual Environment Issues

```bash
# Recreate virtual environment
rm -rf venv
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

#### Port Already in Use

```bash
# Find process using port
lsof -i :8000
# Or
netstat -tulpn | grep :8000

# Kill process
kill -9 <PID>

# Or use different port
PORT=8001 npm start
```

#### API Key Issues

```bash
# Check if keys are loaded
node -e "console.log('OpenAI:', !!process.env.OPENAI_API_KEY)"

# Test API key
curl -H "Authorization: Bearer $OPENAI_API_KEY" \
  https://api.openai.com/v1/models
```

### Debug Commands

```bash
# Check service health
./scripts/health-check-local.sh

# View all environment variables
printenv | grep -E "(DATABASE|API_KEY|NODE_ENV)"

# Check database schema
psql $DATABASE_URL -c "\dt"

# Monitor API calls
tail -f logs/api.log

# Check memory usage
free -h  # Linux
vm_stat | head -5  # macOS
```

### Getting Help

1. **Check Documentation**
   - README.md
   - docs/ directory
   - API documentation

2. **Search Issues**
   - GitHub Issues
   - Stack Overflow
   - Service-specific documentation

3. **Ask for Help**
   - Team Slack channel
   - Code review comments
   - Weekly team meetings

---

*Developer Setup Guide version 2.1 - Last updated: July 20, 2025*