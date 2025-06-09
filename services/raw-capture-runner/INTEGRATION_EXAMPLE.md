# 🔧 Integration Example: Adding Domain Management to Your Existing System

**Goal**: Add dynamic domain management to your existing `raw-capture-runner` without breaking anything.

**Time Required**: 5 minutes

**Files Changed**: 1 (just `index.ts`)

---

## 🎯 What You're Adding

### Before Integration
```typescript
// Your system only processes hardcoded domains from seedDomains()
const domains = ['google.com', 'facebook.com', ...]; // Fixed list
// Result: Always processes same 351 domains
```

### After Integration  
```typescript
// Your system can dynamically add domains via API
POST /admin/domains {"domains": ["openai.com"], "cohort": "ai_giants"}
// Result: Processes both existing domains AND new strategic targets
```

---

## 📝 Step-by-Step Integration

### Step 1: Add Import (Line ~10 in index.ts)

**Find this line in your `services/raw-capture-runner/src/index.ts`:**
```typescript
import { MonitoringService } from './MonitoringService';
```

**Add this import right below it:**
```typescript
import { MonitoringService } from './MonitoringService';
import { integrateDomainManager, runDomainManagerMigration } from './integration/domainManagerIntegration';
```

### Step 2: Add Integration (Line ~920 in index.ts)

**Find this section in your `initializeApp()` function:**
```typescript
async function initializeApp(): Promise<void> {
  try {
    // Test database connection first
    console.log('🔍 Testing database connection...');
    const connected = await testConnection();
    if (!connected) {
      throw new Error('Database connection failed');
    }
    
    // Ensure schema exists with proper structure
    await ensureSchemaExists();
    
    // ADD THE INTEGRATION HERE ⬇️
```

**Add these 3 lines right after `await ensureSchemaExists();`:**
```typescript
    // Ensure schema exists with proper structure
    await ensureSchemaExists();
    
    // 🚀 ADD DYNAMIC DOMAIN MANAGEMENT
    await runDomainManagerMigration(pool);
    const domainManager = integrateDomainManager(app, pool);
    console.log('✅ Dynamic domain management integrated');
    
    // Start the server
    app.listen(port, () => {
```

### Step 3: Deploy & Test

**Deploy to Render:**
```bash
git add -A
git commit -m "🚀 Add dynamic domain management system"
git push origin main
```

**Test integration (wait 2 minutes for deployment):**
```bash
# Check integration status
curl https://raw-capture-runner.onrender.com/admin/integration-status

# Add AI companies
curl -X POST https://raw-capture-runner.onrender.com/admin/domains \
  -H "Content-Type: application/json" \
  -d '{"domains": ["openai.com", "anthropic.com"], "cohort": "ai_giants"}'

# Check results
curl https://raw-capture-runner.onrender.com/admin/domains/stats
```

---

## ✅ Complete Integration Code

Here's what your `initializeApp()` function should look like after integration:

```typescript
// At the top of index.ts (add this import)
import { integrateDomainManager, runDomainManagerMigration } from './integration/domainManagerIntegration';

// In initializeApp() function
async function initializeApp(): Promise<void> {
  try {
    // Test database connection first
    console.log('🔍 Testing database connection...');
    const connected = await testConnection();
    if (!connected) {
      throw new Error('Database connection failed');
    }
    
    // Ensure schema exists with proper structure
    await ensureSchemaExists();
    
    // 🚀 ADD DYNAMIC DOMAIN MANAGEMENT (NEW CODE)
    await runDomainManagerMigration(pool);
    const domainManager = integrateDomainManager(app, pool);
    console.log('✅ Dynamic domain management integrated');
    
    // Start the server (EXISTING CODE CONTINUES)
    app.listen(port, () => {
      console.log(`Server running at http://localhost:${port}`);
    });
    
    // Start processing (EXISTING CODE CONTINUES)
    console.log('🚀 Starting domain processing...');
    processNextBatch().catch((error: unknown) => {
      // ... existing error handling
    });
    
  } catch (error) {
    console.error('❌ Application initialization failed:', error);
    process.exit(1);
  }
}
```

---

## 🧪 Verification Checklist

After deployment, verify everything works:

### ✅ 1. Existing System Still Works
```bash
curl https://raw-capture-runner.onrender.com/status
curl https://raw-capture-runner.onrender.com/seed
```
**Expected**: Original endpoints return normal responses

### ✅ 2. New Domain Management Works
```bash
curl https://raw-capture-runner.onrender.com/admin/integration-status
```
**Expected**: `"integration_status": "active"`

### ✅ 3. Can Add Domains
```bash
curl -X POST https://raw-capture-runner.onrender.com/admin/domains \
  -H "Content-Type: application/json" \
  -d '{"domains": ["test.example"], "cohort": "test"}'
```
**Expected**: `"success": true, "inserted": 1`

### ✅ 4. Database Migration Worked
```bash
curl https://raw-capture-runner.onrender.com/admin/domains/cohorts
```
**Expected**: Shows existing domains in "legacy" cohort

### ✅ 5. Processing Continues
```bash
curl https://raw-capture-runner.onrender.com/db-stats
```
**Expected**: Response count continues increasing

---

## 🚨 If Something Goes Wrong

### Problem: Module not found error
**Solution**: 
```bash
# Ensure all new files are committed
git add -A && git commit -m "Add missing domain management files" && git push
```

### Problem: Database connection errors
**Solution**: 
```bash
# Check your existing system first
curl https://raw-capture-runner.onrender.com/health
# If that works, the integration should work too
```

### Problem: Integration status shows error
**Solution**:
```bash
# Check error details
curl https://raw-capture-runner.onrender.com/admin/integration-status
# Look at the error message and fix accordingly
```

### Problem: Existing processing stops
**Solution**: 
```bash
# This should NOT happen - the integration preserves existing logic
# If it does, immediately revert:
git revert HEAD && git push
```

---

## 🎯 What You've Achieved

### Before Integration
- ✅ 351 static domains
- ❌ No way to add new domains
- ❌ No market segmentation
- ❌ Fixed cohort processing

### After Integration
- ✅ 351 existing domains (preserved)
- ✅ Dynamic domain addition via API
- ✅ Market segment analysis (cohorts)
- ✅ Priority-based processing
- ✅ Real-time statistics
- ✅ Strategic market intelligence
- ✅ **Backwards compatibility maintained**

---

## 🚀 Next Steps

Now you can:

1. **Add AI Giants**: `{"domains": ["openai.com", "anthropic.com"], "cohort": "ai_giants"}`
2. **Add Crypto Volatility**: `{"domains": ["coinbase.com", "binance.com"], "cohort": "crypto"}`
3. **Add EV Disruption**: `{"domains": ["tesla.com", "rivian.com"], "cohort": "ev"}`
4. **Client-Specific Cohorts**: `{"domains": ["client-competitor.com"], "cohort": "client_analysis"}`

**Your system is now a dynamic, strategic market intelligence engine! 🎉**

---

*Integration Time: ~5 minutes*  
*Risk Level: Ultra-low (backwards compatible)*  
*Business Impact: Transform static batch → strategic intelligence* 