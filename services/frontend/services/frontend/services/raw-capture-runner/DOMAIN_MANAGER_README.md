# 🚀 Dynamic Domain Management System

**Purpose**: Evolves the raw capture pipeline from static batch processing to dynamic, cohort-aware domain analysis.

**Architecture**: Modular, testable, preserves existing system sanctity, respects primary/replica database pattern.

---

## 📋 Table of Contents

1. [Problem Solved](#problem-solved)
2. [Architecture Overview](#architecture-overview)
3. [Integration Guide](#integration-guide)
4. [API Reference](#api-reference)
5. [Database Schema](#database-schema)
6. [Usage Examples](#usage-examples)
7. [Testing](#testing)
8. [Migration Guide](#migration-guide)

---

## 🎯 Problem Solved

### Before: Static Cohort Lock
```typescript
// Hardcoded domain list in seedDomains()
const domains = ['google.com', 'facebook.com', ...]; // Fixed 351 domains

// ON CONFLICT DO NOTHING = always skips existing
INSERT INTO domains ... ON CONFLICT DO NOTHING  // Always "skipped": 351

// Result: System cycles same domains forever
```

### After: Dynamic Cohort Management
```typescript
// API-driven domain injection
POST /admin/domains {
  "domains": ["openai.com", "anthropic.com"],
  "cohort": "ai_giants",
  "priority": 3
}

// Cohort-aware processing
SELECT * FROM domains WHERE cohort = 'ai_giants' AND status = 'pending'

// Result: Strategic, targeted analysis of evolving market segments
```

---

## 🏗️ Architecture Overview

### Core Components

```
┌─────────────────────────────────────────────────────────────┐
│                    DOMAIN MANAGEMENT LAYER                  │
├─────────────────────────────────────────────────────────────┤
│  DomainManager.ts      │  domainAdmin.ts    │  Integration   │
│  ├─ addDomains()       │  ├─ POST /admin    │  ├─ Non-invasive│
│  ├─ getDomainStats()   │  ├─ GET /stats     │  ├─ Preserves   │
│  ├─ listCohorts()      │  └─ PUT /cohort    │  └─ existing    │
│  └─ validateDomain()   │                    │                 │
├─────────────────────────────────────────────────────────────┤
│                     EXISTING SYSTEM                         │
│  ┌─────────────────┐    ┌──────────────┐    ┌─────────────┐  │
│  │ processNextBatch│    │  Database    │    │ Raw Capture │  │
│  │  (UNCHANGED)    │◄──►│ Primary/     │◄──►│ Processing  │  │
│  └─────────────────┘    │ Replica      │    │ (UNCHANGED) │  │
│                         └──────────────┘    └─────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

### Key Principles

- **🔒 Non-Invasive**: Does NOT modify existing `processNextBatch()` logic
- **📊 Data Sanctity**: Respects primary/replica database separation
- **🧪 Testable**: Modular components with clear interfaces
- **🔄 Backwards Compatible**: Existing endpoints continue working
- **📈 Strategic**: Enables targeted market analysis

---

## 🚀 Integration Guide

### Step 1: Add 3 Lines to Existing `index.ts`

```typescript
// In your existing services/raw-capture-runner/src/index.ts

// ADD THIS IMPORT (line ~10)
import { integrateDomainManager, runDomainManagerMigration } from './integration/domainManagerIntegration';

// ADD THIS AFTER ensureSchemaExists() (line ~900)
await runDomainManagerMigration(pool);
const domainManager = integrateDomainManager(app, pool);

// THAT'S IT! Your system now supports dynamic domains
```

### Step 2: Deploy & Test

```bash
# Deploy to Render
git add -A && git commit -m "Add dynamic domain management" && git push

# Test new capabilities
curl -X GET https://raw-capture-runner.onrender.com/admin/integration-status

curl -X POST https://raw-capture-runner.onrender.com/admin/domains \
  -H "Content-Type: application/json" \
  -d '{"domains": ["openai.com", "anthropic.com"], "cohort": "ai_giants"}'
```

---

## 📚 API Reference

### Base URL: `https://raw-capture-runner.onrender.com`

### 🆕 **POST** `/admin/domains`
Add domains to processing pipeline

**Request Body:**
```json
{
  "domains": ["openai.com", "anthropic.com", "huggingface.co"],
  "cohort": "ai_giants",           // optional, default: "manual"
  "source": "client_request",      // optional, default: "api_injection"
  "priority": 3                    // optional, 1-10, default: 1
}
```

**Response:**
```json
{
  "success": true,
  "message": "Domain addition completed - 3 inserted, 0 skipped",
  "operation_id": "domain_add_1672531200_abc123",
  "results": {
    "inserted": 3,
    "skipped": 0,
    "errors": [],
    "cohort": "ai_giants"
  },
  "updated_stats": { "total_domains": 354, ... },
  "next_steps": {
    "monitor_url": "/admin/domains/stats",
    "processing_info": "Domains will be automatically picked up by existing processNextBatch() cycle"
  }
}
```

### 📊 **GET** `/admin/domains/stats[?cohort=ai_giants]`
Get domain statistics (reads from replica)

**Response:**
```json
{
  "success": true,
  "stats": {
    "total_domains": 354,
    "by_status": {"pending": 15, "completed": 339},
    "by_cohort": {"legacy": 351, "ai_giants": 3},
    "by_source": {"api_seed": 351, "api_injection": 3}
  },
  "processing_info": {
    "pipeline_status": "Active - domains automatically processed by existing system",
    "read_source": "replica database"
  }
}
```

### 🏷️ **GET** `/admin/domains/cohorts`
List all cohorts and their status

**Response:**
```json
{
  "success": true,
  "cohorts": [
    {
      "cohort": "legacy",
      "domain_count": 351,
      "pending": 0,
      "completed": 351,
      "processing": 0,
      "priority_avg": 1.0
    },
    {
      "cohort": "ai_giants", 
      "domain_count": 3,
      "pending": 3,
      "completed": 0,
      "processing": 0,
      "priority_avg": 3.0
    }
  ],
  "summary": {
    "total_cohorts": 2,
    "total_domains": 354,
    "active_cohorts": 1
  }
}
```

### ✏️ **PUT** `/admin/domains/cohort`
Update cohort assignment for existing domains

**Request Body:**
```json
{
  "domains": ["openai.com", "anthropic.com"],
  "new_cohort": "ai_premium"
}
```

### 📖 **GET** `/admin/domains/docs`
API documentation (this reference)

---

## 🗄️ Database Schema

### New Columns Added to `domains` Table

```sql
-- Cohort grouping (enables market segment analysis)
ALTER TABLE domains ADD COLUMN cohort TEXT DEFAULT 'legacy';

-- Priority processing (1=low, 10=high)  
ALTER TABLE domains ADD COLUMN priority INTEGER DEFAULT 1;

-- Indexes for performance
CREATE INDEX idx_domains_cohort_status ON domains(cohort, status);
CREATE INDEX idx_domains_priority_status ON domains(priority DESC, status, created_at);

-- View for statistics (replica reads)
CREATE VIEW v_cohort_stats AS
SELECT cohort, COUNT(*) as domain_count, 
       COUNT(*) FILTER (WHERE status = 'pending') as pending,
       ...
FROM domains GROUP BY cohort;
```

### Backwards Compatibility

- ✅ Existing domains get `cohort='legacy'` and `priority=1`
- ✅ Existing `processNextBatch()` continues working unchanged
- ✅ Original `/seed` endpoint preserved
- ✅ All existing data and processing preserved

---

## 💡 Usage Examples

### 1. Add AI/ML Company Cohort
```bash
curl -X POST https://raw-capture-runner.onrender.com/admin/domains \
  -H "Content-Type: application/json" \
  -d '{
    "domains": ["openai.com", "anthropic.com", "huggingface.co", "midjourney.com", "stability.ai"],
    "cohort": "ai_giants", 
    "priority": 5,
    "source": "market_analysis_2025"
  }'
```

### 2. Add Crypto/Volatility Cohort
```bash
curl -X POST https://raw-capture-runner.onrender.com/admin/domains \
  -H "Content-Type: application/json" \
  -d '{
    "domains": ["coinbase.com", "binance.com", "kraken.com", "crypto.com"],
    "cohort": "crypto_volatility",
    "priority": 3
  }'
```

### 3. Monitor Specific Cohort
```bash
# Check AI giants processing status
curl https://raw-capture-runner.onrender.com/admin/domains/stats?cohort=ai_giants

# List all cohorts
curl https://raw-capture-runner.onrender.com/admin/domains/cohorts
```

### 4. Reorganize Domains
```bash
curl -X PUT https://raw-capture-runner.onrender.com/admin/domains/cohort \
  -H "Content-Type: application/json" \
  -d '{
    "domains": ["tesla.com", "rivian.com", "lucidmotors.com"],
    "new_cohort": "ev_disruption"
  }'
```

---

## 🧪 Testing

### Manual Testing Commands

```bash
# 1. Check integration status
curl https://raw-capture-runner.onrender.com/admin/integration-status

# 2. Add test domains
curl -X POST https://raw-capture-runner.onrender.com/admin/domains \
  -d '{"domains": ["test1.com", "test2.com"], "cohort": "test_cohort"}'

# 3. Verify addition
curl https://raw-capture-runner.onrender.com/admin/domains/stats

# 4. Check cohorts
curl https://raw-capture-runner.onrender.com/admin/domains/cohorts

# 5. Update cohort
curl -X PUT https://raw-capture-runner.onrender.com/admin/domains/cohort \
  -d '{"domains": ["test1.com"], "new_cohort": "moved_cohort"}'
```

### Unit Tests (Create in `tests/DomainManager.test.ts`)

```typescript
describe('DomainManager', () => {
  test('should add domains with proper cohort', async () => {
    const result = await domainManager.addDomains({
      domains: ['test.com'],
      cohort: 'test'
    });
    expect(result.inserted).toBe(1);
    expect(result.skipped).toBe(0);
  });
  
  test('should validate domain format', async () => {
    await expect(domainManager.addDomains({
      domains: ['invalid-domain']
    })).rejects.toThrow('Invalid domain format');
  });
});
```

---

## 🔄 Migration Guide

### For Existing Deployments

**Option 1: Automatic (Recommended)**
```typescript
// Add to index.ts - migration runs automatically
import { integrateDomainManager, runDomainManagerMigration } from './integration/domainManagerIntegration';

await runDomainManagerMigration(pool);
const domainManager = integrateDomainManager(app, pool);
```

**Option 2: Manual SQL**
```sql
-- Run this directly on your database
\i migrations/001_add_domain_cohorts.sql
```

### Verification After Migration

```bash
# Check that existing system still works
curl https://raw-capture-runner.onrender.com/status

# Check new capabilities
curl https://raw-capture-runner.onrender.com/admin/integration-status

# Verify existing domains have 'legacy' cohort
curl https://raw-capture-runner.onrender.com/admin/domains/cohorts
```

---

## 🎯 Business Impact

### Before: Static Analysis
- ❌ 351 fixed domains
- ❌ No market segmentation  
- ❌ Wasted processing on irrelevant domains
- ❌ Cannot adapt to market trends

### After: Strategic Intelligence
- ✅ Unlimited dynamic domains
- ✅ Market segment analysis (AI, crypto, EV, etc.)
- ✅ Priority-based processing  
- ✅ Real-time market adaptation
- ✅ Client-specific cohorts
- ✅ Competitive intelligence targeting

### ROI Examples
- **AI Sector Analysis**: Track OpenAI, Anthropic, Hugging Face reputation in real-time
- **Crypto Volatility Monitoring**: Focus on high-volatility exchanges during market chaos
- **EV Disruption Tracking**: Monitor Tesla vs traditional auto sentiment shifts
- **Client Custom Cohorts**: "Show me how my competitors are perceived vs my brand"

---

## 🆘 Troubleshooting

### Common Issues

**1. "Module not found" errors**
```bash
# Ensure TypeScript compilation
npm run build
```

**2. Database connection errors**
```bash
# Check environment variables
echo $DATABASE_URL
```

**3. Migration fails**
```sql
-- Check if columns already exist
SELECT column_name FROM information_schema.columns 
WHERE table_name = 'domains' AND column_name IN ('cohort', 'priority');
```

**4. Existing processing stops**
```bash
# This should NOT happen - integration preserves existing logic
# Check logs for errors in processNextBatch()
curl https://raw-capture-runner.onrender.com/api/errors
```

### Support

- 📧 Check logs: `https://raw-capture-runner.onrender.com/api/errors`
- 📊 System status: `https://raw-capture-runner.onrender.com/admin/integration-status`
- 📖 API docs: `https://raw-capture-runner.onrender.com/admin/domains/docs`

---

**🎉 Congratulations! You've evolved from static batch processing to dynamic, strategic market intelligence.**

---

*Last updated: December 2024*  
*Architecture: Modular, testable, preserves existing system sanctity*  
*Database: Respects primary/replica pattern*  
*Integration: Non-invasive, backwards compatible* 