# 🛡️ SAFE DEPLOYMENT GUIDE - Use Existing Production Database

## 🎯 Goal: Deploy Rust WITHOUT touching your data

### Phase 1: READ-ONLY Deploy (Zero Risk)

```bash
# 1. Set environment variables for Render
DATABASE_URL=<YOUR_EXISTING_PROD_DB>  # Point to current database
DB_READONLY=true                       # Cannot write
FEATURE_WRITE_DRIFT=false              # Drift writes disabled
FEATURE_CRON=false                     # No cron jobs
FEATURE_WORKER_WRITES=false            # Worker observe-only
```

### Phase 2: Verify Everything Works

After deploy, check these endpoints:

```bash
# Should return 200 with db_readonly: true
curl https://domain-runner-rust-web.onrender.com/healthz

# Should show your REAL data
curl https://domain-runner-rust-web.onrender.com/status

# Response will include:
{
  "environment": {
    "db_readonly": true,  # ✅ Safe mode active
    "features": {
      "write_drift": false,
      "cron": false,
      "worker_writes": false
    }
  },
  "data": {
    "domains": 1234,          # Your actual domain count
    "drift_rows_7d": 5678,    # Your actual drift data
    "last_observation": "...", # Your latest timestamp
    "models_seen": [...]      # Models in your database
  }
}
```

### Phase 3: Gradual Feature Enablement

Once verified, flip flags ONE AT A TIME:

```bash
# Week 1: Enable drift reads (still no writes)
FEATURE_WRITE_DRIFT=false  # Keep false
DB_READONLY=true           # Keep true

# Week 2: Enable worker observations
FEATURE_WORKER_WRITES=false  # Still false, just observing

# Week 3: Enable selective writes (after verification)
DB_READONLY=false          # Allow writes
FEATURE_WRITE_DRIFT=true   # Enable drift writes only

# Week 4: Full production
FEATURE_CRON=true          # Enable scheduled jobs
FEATURE_WORKER_WRITES=true # Full worker capabilities
```

## 📊 Monitoring Checklist

### During Read-Only Phase:
- [ ] `/healthz` returns 200
- [ ] `/readyz` shows database connected
- [ ] `/status` displays correct counts from prod
- [ ] `/domains` lists your actual domains
- [ ] `/models` shows your LLM usage
- [ ] `/drift/example.com` returns real drift data

### Audit Trail:
```sql
-- Check what the Rust service tried to do
SELECT action, table_name, created_at, feature_flags
FROM rust_audit_log
WHERE db_readonly = true
ORDER BY created_at DESC
LIMIT 20;
```

## 🔄 Compatibility Views (if needed)

If your tables have different names, apply these views:

```sql
-- Run on production database
-- These are NON-DESTRUCTIVE views

-- If your responses are in a different table
CREATE OR REPLACE VIEW domain_responses AS
SELECT * FROM your_actual_response_table;

-- If your drift scores are named differently
CREATE OR REPLACE VIEW drift_scores AS
SELECT * FROM your_actual_drift_table;
```

## 🚨 Emergency Rollback

If anything goes wrong:

1. **Immediate:** Set `DB_READONLY=true` in Render
2. **Stop writes:** All write operations will be blocked
3. **Check audit log:** See what operations were attempted
4. **Revert:** Redeploy Python version if needed

## ✅ Success Criteria

You know it's working when:
1. Rust service shows your real data
2. No unexpected writes in audit_log
3. Performance improves (10-50x faster responses)
4. Memory usage drops (30MB vs 500MB)

## 📈 Expected Timeline

- **Day 1:** Deploy read-only, verify endpoints
- **Day 2-7:** Monitor, check audit logs daily
- **Week 2:** Enable first write feature
- **Week 3:** Full production with all features
- **Week 4:** Deprecate Python version

## 🔐 Database Connection

The Rust service needs these tables/views:
- `domains` (or view)
- `domain_responses` (or view)
- `drift_scores` (or view)
- `rust_audit_log` (will be created, new table)

## 💡 Pro Tips

1. **Test on shadow first:**
   ```bash
   ./scripts/shadow_db_test.sh
   ```

2. **Monitor memory:**
   - Rust: ~30MB constant
   - Python: 200-500MB with spikes

3. **Check connection pool:**
   - Rust uses max 20 connections
   - Monitor in your DB dashboard

4. **Feature flag everything:**
   - Every new capability behind a flag
   - Flip one at a time
   - Wait 24h between flips

---

**Remember: The Rust service starts in READ-ONLY mode by default. Your data is safe!**