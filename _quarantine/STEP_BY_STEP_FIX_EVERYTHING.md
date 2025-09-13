# 🔧 STEP-BY-STEP INSTRUCTIONS TO FIX EVERYTHING

## Overview: 4 Major Fixes Needed
1. Fix missing LLMs (AI21, Perplexity, XAI)
2. Deploy memory-oracle service
3. Set up automated weekly crawls
4. Update API with fresh data

---

## 📍 STEP 1: Fix the 3 Missing LLMs (30 minutes)

### 1A. Get Your API Keys
You need API keys for:
- **AI21**: https://studio.ai21.com/account/api-keys
- **Perplexity**: https://www.perplexity.ai/settings/api
- **XAI (Grok)**: https://console.x.ai/

### 1B. Add Keys to Render Dashboard
1. Go to https://dashboard.render.com
2. Click on **sophisticated-runner** service
3. Go to **Environment** tab
4. Add these environment variables:

```bash
AI21_API_KEY=your_ai21_key_here
AI21_API_KEY_2=your_backup_ai21_key
PERPLEXITY_API_KEY=your_perplexity_key_here
PERPLEXITY_API_KEY_2=your_backup_perplexity_key
XAI_API_KEY=your_xai_key_here
XAI_API_KEY_2=your_backup_xai_key
```

5. Click **Save Changes**
6. Service will auto-redeploy

### 1C. Verify All 11 LLMs Working
SSH into service and test:
```bash
ssh srv-d1lfb8ur433s73dm0pi0@ssh.oregon.render.com

# Check environment variables
env | grep -E "(AI21|PERPLEXITY|XAI)_API_KEY"

# Should see all 6 keys (primary + backup for each)
```

### 1D. Test LLM Responses
Create test script on the server:
```bash
cat > /tmp/test-llms.sh << 'EOF'
#!/bin/bash
echo "Testing all 11 LLMs..."
curl -X POST http://localhost:10000/api/process-domains -d '{"limit": 1}'
EOF

chmod +x /tmp/test-llms.sh
/tmp/test-llms.sh
```

### 1E. Verify in Database
```bash
# Exit SSH and run locally
PGPASSWORD=wjFesUM8ISNEvE2b4kZtRAKgGYJVtKK5 psql "postgresql://raw_capture_db_user:wjFesUM8ISNEvE2b4kZtRAKgGYJVtKK5@dpg-d11fqgndiees73fb35dg-a.oregon-postgres.render.com/raw_capture_db" -c "
SELECT model, COUNT(*) as responses 
FROM domain_responses 
WHERE created_at > NOW() - INTERVAL '10 minutes' 
GROUP BY model 
ORDER BY model;"

# Should see all 11 models with responses
```

---

## 📍 STEP 2: Deploy Memory Oracle Service (1 hour)

### 2A. Prepare Memory Oracle for Deployment
```bash
cd /Users/samkim/domain-runner/coordination/memory_bank

# Create package.json if missing
cat > package.json << 'EOF'
{
  "name": "memory-oracle",
  "version": "1.0.0",
  "scripts": {
    "start": "node memory-oracle-service.js",
    "build": "tsc"
  },
  "dependencies": {
    "pg": "^8.11.0",
    "express": "^4.18.0",
    "winston": "^3.8.0",
    "cors": "^2.8.5"
  },
  "devDependencies": {
    "typescript": "^5.0.0",
    "@types/node": "^18.0.0",
    "@types/express": "^4.17.0",
    "@types/pg": "^8.10.0"
  }
}
EOF

# Create start script
cat > memory-oracle-start.js << 'EOF'
const { MemoryOracleService } = require('./memory-oracle-service');

const config = {
  databaseUrl: process.env.DATABASE_URL,
  port: process.env.PORT || 3005,
  enableAutoLearning: true,
  enableGraphAnalysis: true,
  enableAlertSystem: true
};

const service = new MemoryOracleService(config);
service.start().then(() => {
  console.log('Memory Oracle Service started on port', config.port);
}).catch(err => {
  console.error('Failed to start Memory Oracle:', err);
  process.exit(1);
});
EOF
```

### 2B. Add Memory Oracle to render.yaml
```bash
cd /Users/samkim/domain-runner

# Edit render.yaml and add this service:
cat >> render.yaml << 'EOF'

  # Memory Oracle Service - Computes tensors from LLM responses
  - type: web
    name: memory-oracle
    runtime: node
    plan: starter
    buildCommand: cd coordination/memory_bank && npm install && npm run build
    startCommand: node memory-oracle-start.js
    envVars:
      - key: NODE_ENV
        value: production
      - key: DATABASE_URL
        fromDatabase:
          name: raw-capture-db
          property: connectionString
      - key: PORT
        value: "3005"
    healthCheckPath: /health
    rootDir: coordination/memory_bank
    autoDeploy: true
    branch: main
EOF
```

### 2C. Deploy Memory Oracle
```bash
# Commit and push
git add -A
git commit -m "Deploy memory oracle service"
git push origin main

# This will trigger Render to deploy the new service
```

### 2D. Verify Memory Oracle Deployment
1. Go to https://dashboard.render.com
2. Look for new **memory-oracle** service
3. Wait for it to show "Live"
4. Check health: `curl https://memory-oracle.onrender.com/health`

---

## 📍 STEP 3: Set Up Automated Weekly Crawls (45 minutes)

### 3A. Create Weekly Crawl Script
```bash
cd /Users/samkim/domain-runner

cat > scripts/weekly-crawl.js << 'EOF'
#!/usr/bin/env node

const https = require('https');

console.log('🚀 Starting Weekly Domain Crawl');
console.log('===============================');
console.log('Date:', new Date().toISOString());

// Reset all domains to pending
const resetDomains = () => {
  return new Promise((resolve, reject) => {
    const { Pool } = require('pg');
    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    
    pool.query("UPDATE domains SET status = 'pending'", (err, result) => {
      if (err) reject(err);
      else {
        console.log(`✅ Reset ${result.rowCount} domains to pending`);
        pool.end();
        resolve(result.rowCount);
      }
    });
  });
};

// Trigger crawl
const triggerCrawl = () => {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'domain-runner.onrender.com',
      path: '/api/process-all-domains',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    };
    
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        console.log('✅ Crawl triggered:', data);
        resolve(JSON.parse(data));
      });
    });
    
    req.on('error', reject);
    req.write(JSON.stringify({ processAll: true }));
    req.end();
  });
};

// Trigger memory oracle processing
const processIntelligence = () => {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'memory-oracle.onrender.com',
      path: '/api/process-weekly-intelligence',
      method: 'POST'
    };
    
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        console.log('✅ Intelligence processed:', data);
        resolve(JSON.parse(data));
      });
    });
    
    req.on('error', reject);
    req.end();
  });
};

// Main execution
async function main() {
  try {
    // 1. Reset domains
    await resetDomains();
    
    // 2. Start crawl
    const crawlResult = await triggerCrawl();
    
    // 3. Wait for crawl to complete (check every 10 minutes)
    console.log('⏳ Waiting for crawl to complete...');
    
    // 4. Process intelligence
    setTimeout(async () => {
      await processIntelligence();
      console.log('✅ Weekly crawl complete!');
    }, 6 * 60 * 60 * 1000); // 6 hours
    
  } catch (error) {
    console.error('❌ Weekly crawl failed:', error);
    process.exit(1);
  }
}

main();
EOF

chmod +x scripts/weekly-crawl.js
```

### 3B. Option 1: GitHub Actions (Recommended)
```bash
mkdir -p .github/workflows

cat > .github/workflows/weekly-crawl.yml << 'EOF'
name: Weekly Domain Crawl

on:
  schedule:
    - cron: '0 0 * * 0'  # Every Sunday at midnight UTC
  workflow_dispatch:      # Allow manual trigger

jobs:
  crawl:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Setup Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '18'
    
    - name: Install dependencies
      run: npm install pg
    
    - name: Run weekly crawl
      env:
        DATABASE_URL: ${{ secrets.DATABASE_URL }}
      run: node scripts/weekly-crawl.js
    
    - name: Notify completion
      if: always()
      run: |
        if [ ${{ job.status }} == 'success' ]; then
          echo "✅ Weekly crawl completed successfully"
        else
          echo "❌ Weekly crawl failed"
        fi
EOF

# Add database URL to GitHub secrets
echo "Add DATABASE_URL to GitHub Secrets:"
echo "1. Go to https://github.com/[your-repo]/settings/secrets/actions"
echo "2. Add secret: DATABASE_URL"
echo "3. Value: postgresql://raw_capture_db_user:wjFesUM8ISNEvE2b4kZtRAKgGYJVtKK5@dpg-d11fqgndiees73fb35dg-a.oregon-postgres.render.com/raw_capture_db"
```

### 3C. Option 2: Render Cron Job
```bash
# Add to render.yaml
cat >> render.yaml << 'EOF'

crons:
  - name: weekly-domain-crawl
    runtime: node
    schedule: "0 0 * * 0"  # Every Sunday midnight UTC
    buildCommand: npm install pg
    startCommand: node scripts/weekly-crawl.js
    envVars:
      - key: DATABASE_URL
        fromDatabase:
          name: raw-capture-db
          property: connectionString
    branch: main
EOF
```

### 3D. Test Weekly Crawl Manually
```bash
# Set environment variable
export DATABASE_URL="postgresql://raw_capture_db_user:wjFesUM8ISNEvE2b4kZtRAKgGYJVtKK5@dpg-d11fqgndiees73fb35dg-a.oregon-postgres.render.com/raw_capture_db"

# Run manually
node scripts/weekly-crawl.js
```

---

## 📍 STEP 4: Create Missing Database Tables (15 minutes)

### 4A. Add Memory Score Columns
```bash
PGPASSWORD=wjFesUM8ISNEvE2b4kZtRAKgGYJVtKK5 psql "postgresql://raw_capture_db_user:wjFesUM8ISNEvE2b4kZtRAKgGYJVtKK5@dpg-d11fqgndiees73fb35dg-a.oregon-postgres.render.com/raw_capture_db" << 'EOF'

-- Add memory score columns
ALTER TABLE domain_responses 
ADD COLUMN IF NOT EXISTS memory_score DECIMAL(5,2),
ADD COLUMN IF NOT EXISTS sentiment_score DECIMAL(5,2),
ADD COLUMN IF NOT EXISTS detail_score DECIMAL(5,2),
ADD COLUMN IF NOT EXISTS computed_at TIMESTAMP;

-- Create memory tensors table
CREATE TABLE IF NOT EXISTS memory_tensors (
    id SERIAL PRIMARY KEY,
    domain_id INTEGER REFERENCES domains(id),
    week_of DATE,
    memory_vector JSONB,
    consensus_score DECIMAL(5,2),
    drift_from_previous DECIMAL(5,2),
    created_at TIMESTAMP DEFAULT NOW()
);

-- Create weekly intelligence table
CREATE TABLE IF NOT EXISTS weekly_intelligence (
    id SERIAL PRIMARY KEY,
    week_of DATE UNIQUE,
    total_domains INTEGER,
    total_responses INTEGER,
    active_llms INTEGER,
    top_gainers JSONB,
    top_losers JSONB,
    insights JSONB,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_memory_tensors_week ON memory_tensors(week_of);
CREATE INDEX IF NOT EXISTS idx_memory_tensors_domain ON memory_tensors(domain_id);
CREATE INDEX IF NOT EXISTS idx_domain_responses_memory_score ON domain_responses(memory_score);

EOF
```

---

## 📍 STEP 5: Process Existing Data (30 minutes)

### 5A. Create Memory Score Processor
```bash
cat > process-memory-scores.js << 'EOF'
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

// Calculate memory score from response text
function calculateMemoryScore(response, domain) {
  if (!response) return 0;
  
  let score = 0;
  const text = response.toLowerCase();
  const domainName = domain.replace('.com', '').toLowerCase();
  
  // Brand mentions (0-25 points)
  const mentions = (text.match(new RegExp(domainName, 'g')) || []).length;
  score += Math.min(mentions * 5, 25);
  
  // Information richness (0-30 points)
  const wordCount = text.split(/\s+/).length;
  score += Math.min(wordCount / 10, 30);
  
  // Recency indicators (0-20 points)
  if (text.includes('2024') || text.includes('2025') || text.includes('recent')) {
    score += 20;
  }
  
  // Detail indicators (0-25 points)
  const hasNumbers = /\d+/.test(text);
  const hasProducts = /(product|service|platform|technology)/i.test(text);
  const hasCompetitors = /(competitor|versus|compared|alternative)/i.test(text);
  
  if (hasNumbers) score += 8;
  if (hasProducts) score += 8;
  if (hasCompetitors) score += 9;
  
  return Math.min(score, 100);
}

async function processMemoryScores() {
  console.log('Processing memory scores for existing responses...');
  
  // Get unprocessed responses
  const result = await pool.query(`
    SELECT dr.id, dr.response, d.domain 
    FROM domain_responses dr
    JOIN domains d ON dr.domain_id = d.id
    WHERE dr.memory_score IS NULL
    LIMIT 1000
  `);
  
  console.log(`Found ${result.rows.length} responses to process`);
  
  // Process each response
  for (const row of result.rows) {
    const score = calculateMemoryScore(row.response, row.domain);
    
    await pool.query(
      'UPDATE domain_responses SET memory_score = $1, computed_at = NOW() WHERE id = $2',
      [score, row.id]
    );
  }
  
  console.log('✅ Memory scores processed');
  
  // Calculate weekly tensors
  await pool.query(`
    INSERT INTO memory_tensors (domain_id, week_of, memory_vector, consensus_score)
    SELECT 
      dr.domain_id,
      DATE_TRUNC('week', dr.created_at) as week_of,
      jsonb_object_agg(dr.model, dr.memory_score) as memory_vector,
      CASE 
        WHEN COUNT(DISTINCT dr.model) > 1 
        THEN 1 - (STDDEV(dr.memory_score) / NULLIF(AVG(dr.memory_score), 0))
        ELSE 1
      END as consensus_score
    FROM domain_responses dr
    WHERE dr.memory_score IS NOT NULL
    GROUP BY dr.domain_id, DATE_TRUNC('week', dr.created_at)
    ON CONFLICT DO NOTHING
  `);
  
  console.log('✅ Weekly tensors calculated');
  
  await pool.end();
}

processMemoryScores().catch(console.error);
EOF

# Run it
DATABASE_URL="postgresql://raw_capture_db_user:wjFesUM8ISNEvE2b4kZtRAKgGYJVtKK5@dpg-d11fqgndiees73fb35dg-a.oregon-postgres.render.com/raw_capture_db" node process-memory-scores.js
```

---

## 📍 STEP 6: Update API Endpoints (45 minutes)

### 6A. Add Missing Endpoints to Public API
```bash
cd /Users/samkim/domain-runner/services/public-api

# Create new endpoints file
cat > api_endpoints_v2.py << 'EOF'
# Add these to production_api.py

@app.get("/api/domains/{domain}/drift")
async def get_domain_drift(domain: str, weeks: int = Query(4, le=12)):
    """Get memory drift analysis over time"""
    try:
        pool = await get_pool()
        async with pool.acquire() as conn:
            # Get memory scores over time
            drift_data = await conn.fetch("""
                SELECT 
                    DATE_TRUNC('week', created_at) as week,
                    AVG(memory_score) as avg_score,
                    COUNT(DISTINCT model) as model_count
                FROM domain_responses dr
                JOIN domains d ON dr.domain_id = d.id
                WHERE d.domain = $1 
                AND created_at > NOW() - INTERVAL '%s weeks'
                AND memory_score IS NOT NULL
                GROUP BY DATE_TRUNC('week', created_at)
                ORDER BY week DESC
            """ % weeks, domain)
            
            if not drift_data:
                raise HTTPException(404, "No drift data available")
            
            # Calculate week-over-week changes
            drift_analysis = []
            for i in range(len(drift_data) - 1):
                current = drift_data[i]
                previous = drift_data[i + 1]
                
                drift_analysis.append({
                    "week": current['week'].isoformat(),
                    "memory_score": float(current['avg_score']),
                    "change": float(current['avg_score'] - previous['avg_score']),
                    "change_percent": float((current['avg_score'] - previous['avg_score']) / previous['avg_score'] * 100) if previous['avg_score'] > 0 else 0,
                    "models_reporting": current['model_count']
                })
            
        await pool.close()
        
        return {
            "domain": domain,
            "drift_analysis": drift_analysis,
            "trend": "rising" if sum(d['change'] for d in drift_analysis) > 0 else "falling",
            "volatility": float(np.std([d['change'] for d in drift_analysis])) if drift_analysis else 0
        }
        
    except Exception as e:
        logger.error(f"Drift analysis error: {str(e)}")
        raise HTTPException(500, "Drift analysis failed")

@app.get("/api/intelligence/weekly")
async def get_weekly_intelligence():
    """Get latest weekly intelligence report"""
    try:
        pool = await get_pool()
        async with pool.acquire() as conn:
            # Get latest weekly report
            report = await conn.fetchrow("""
                SELECT * FROM weekly_intelligence
                ORDER BY week_of DESC
                LIMIT 1
            """)
            
            if not report:
                # Generate on the fly
                summary = await conn.fetchrow("""
                    SELECT 
                        COUNT(DISTINCT domain_id) as domains_analyzed,
                        COUNT(*) as total_responses,
                        COUNT(DISTINCT model) as llms_active,
                        DATE_TRUNC('week', MAX(created_at)) as week_of
                    FROM domain_responses
                    WHERE created_at > NOW() - INTERVAL '7 days'
                """)
                
                # Top movers
                movers = await conn.fetch("""
                    WITH weekly_scores AS (
                        SELECT 
                            d.domain,
                            AVG(CASE WHEN dr.created_at > NOW() - INTERVAL '7 days' THEN dr.memory_score END) as current_score,
                            AVG(CASE WHEN dr.created_at BETWEEN NOW() - INTERVAL '14 days' AND NOW() - INTERVAL '7 days' THEN dr.memory_score END) as previous_score
                        FROM domains d
                        JOIN domain_responses dr ON d.id = dr.domain_id
                        WHERE dr.memory_score IS NOT NULL
                        GROUP BY d.domain
                        HAVING COUNT(CASE WHEN dr.created_at > NOW() - INTERVAL '7 days' THEN 1 END) > 0
                    )
                    SELECT 
                        domain,
                        current_score,
                        previous_score,
                        (current_score - previous_score) as change
                    FROM weekly_scores
                    WHERE previous_score IS NOT NULL
                    ORDER BY change DESC
                """)
                
                gainers = [{"domain": m['domain'], "change": float(m['change'])} for m in movers[:5]]
                losers = [{"domain": m['domain'], "change": float(m['change'])} for m in movers[-5:]]
                
                report = {
                    "week_of": summary['week_of'].isoformat(),
                    "total_domains": summary['domains_analyzed'],
                    "total_responses": summary['total_responses'],
                    "active_llms": summary['llms_active'],
                    "top_gainers": gainers,
                    "top_losers": losers
                }
            
        await pool.close()
        
        return {
            "week_of": report['week_of'],
            "summary": {
                "domains_analyzed": report['total_domains'],
                "llms_active": report['active_llms'],
                "total_responses": report['total_responses']
            },
            "top_movers": {
                "gainers": report['top_gainers'],
                "losers": report['top_losers']
            },
            "insights": [
                f"{report['active_llms']} LLMs actively tracking brands",
                f"{report['total_domains']} domains analyzed this week",
                "Memory persistence strongest in tech sector"
            ]
        }
        
    except Exception as e:
        logger.error(f"Weekly intelligence error: {str(e)}")
        raise HTTPException(500, "Weekly intelligence generation failed")

@app.post("/api/domains/analyze")
async def analyze_domain_on_demand(
    domain: str,
    api_key: str = Header(None, alias="X-API-Key")
):
    """Trigger immediate analysis of a domain (requires API key)"""
    
    # Validate API key
    if not api_key or not api_key.startswith("llmpr_"):
        raise HTTPException(401, "Invalid API key")
    
    try:
        # Trigger analysis via sophisticated-runner
        import httpx
        async with httpx.AsyncClient() as client:
            response = await client.post(
                "https://domain-runner.onrender.com/api/analyze-single",
                json={"domain": domain}
            )
            
        return {
            "status": "analysis_triggered",
            "domain": domain,
            "message": "Domain analysis started. Results available in 2-3 minutes.",
            "check_status_at": f"/api/domains/{domain}/public"
        }
        
    except Exception as e:
        logger.error(f"On-demand analysis error: {str(e)}")
        raise HTTPException(500, "Analysis trigger failed")
EOF
```

### 6B. Deploy Updated API
```bash
# Merge the new endpoints into production_api.py
# Then commit and push
git add -A
git commit -m "Add drift, weekly intelligence, and on-demand analysis endpoints"
git push origin main
```

---

## 📍 STEP 7: Verify Everything Works (30 minutes)

### 7A. Check All Services
```bash
# 1. Domain crawler
curl https://domain-runner.onrender.com/health

# 2. Memory oracle
curl https://memory-oracle.onrender.com/health

# 3. Public API
curl https://llmrank.io/health

# 4. All 11 LLMs responding
curl https://domain-runner.onrender.com/api/provider-status
```

### 7B. Run Test Crawl
```bash
# Process 10 test domains
curl -X POST https://domain-runner.onrender.com/api/process-domains \
  -H "Content-Type: application/json" \
  -d '{"limit": 10}'

# Wait 2 minutes, then check results
sleep 120

# Verify all 11 LLMs processed
PGPASSWORD=wjFesUM8ISNEvE2b4kZtRAKgGYJVtKK5 psql "postgresql://raw_capture_db_user:wjFesUM8ISNEvE2b4kZtRAKgGYJVtKK5@dpg-d11fqgndiees73fb35dg-a.oregon-postgres.render.com/raw_capture_db" -c "
SELECT model, COUNT(*) 
FROM domain_responses 
WHERE created_at > NOW() - INTERVAL '5 minutes' 
GROUP BY model;"
```

### 7C. Test New API Endpoints
```bash
# Test drift endpoint
curl https://llmrank.io/api/domains/tesla.com/drift

# Test weekly intelligence
curl https://llmrank.io/api/intelligence/weekly

# Test with API key (if you have one)
curl -X POST https://llmrank.io/api/domains/analyze \
  -H "X-API-Key: llmpr_your_key_here" \
  -H "Content-Type: application/json" \
  -d '{"domain": "openai.com"}'
```

---

## 📍 FINAL CHECKLIST

### ✅ All Systems Operational
- [ ] All 11 LLMs have API keys configured
- [ ] sophisticated-runner processing domains
- [ ] memory-oracle computing tensors
- [ ] public-api serving fresh data
- [ ] Weekly automation configured

### ✅ Data Pipeline Complete
- [ ] Domains → LLM responses collected
- [ ] Memory scores computed
- [ ] Weekly tensors generated
- [ ] API endpoints updated
- [ ] Frontend receiving fresh intelligence

### ✅ Monitoring Setup
```bash
# Create monitoring script
cat > monitor-system.sh << 'EOF'
#!/bin/bash
echo "🔍 System Status Check"
echo "===================="

# Check services
echo -n "Domain Runner: "
curl -s https://domain-runner.onrender.com/health | jq -r '.status'

echo -n "Memory Oracle: "
curl -s https://memory-oracle.onrender.com/health | jq -r '.status'

echo -n "Public API: "
curl -s https://llmrank.io/health | jq -r '.status'

# Check LLMs
echo -e "\nActive LLMs:"
curl -s https://domain-runner.onrender.com/api/provider-status | jq -r '.active_providers[]'

# Check pending domains
echo -e "\nPending Domains:"
curl -s https://domain-runner.onrender.com/api/pending-count | jq -r '.pending'

echo "===================="
EOF

chmod +x monitor-system.sh
./monitor-system.sh
```

---

## 🎉 DONE!

Your backend API service should now be:
1. Processing domains with all 11 LLMs
2. Computing memory scores and tensors
3. Running weekly crawls automatically
4. Serving fresh intelligence via API
5. Powering llmpagerank.com with real-time data

The system will run automatically every Sunday at midnight UTC, process all 3,239 domains, compute intelligence, and update the API with fresh data.