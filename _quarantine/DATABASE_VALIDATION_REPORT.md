# Database Validation Report

Generated: 2025-07-29

## Connection Details
- **Host**: dpg-d11fqgndiees73fb35dg-a.oregon-postgres.render.com
- **Database**: raw_capture_db
- **User**: raw_capture_db_user
- **PostgreSQL Version**: 16.9 (Debian 16.9-1.pgdg120+1)

## Table Existence Validation ✅

### Required Tables Status:
1. **domains** - ✅ EXISTS
2. **domain_responses** - ✅ EXISTS
3. **partner_api_keys** - ✅ EXISTS
4. **volatility_scores** - ✅ EXISTS
5. **memory_tensors** - ✅ EXISTS
6. **monitoring_jobs** - ❌ MISSING
7. **swarm_learning** - ✅ EXISTS

## Schema Validation

### domains table ✅
- **Primary Key**: id (uuid)
- **Key Columns**: domain, status, created_at, updated_at
- **Status Values**: pending, processing, completed, failed, error
- **Constraints**: Multiple check constraints for valid statuses and counts
- **Foreign Keys**: Referenced by 7 other tables
- **Indexes**: 15 indexes including unique constraint on domain

### domain_responses table ✅
- **Primary Key**: id (integer)
- **Key Columns**: domain_id, model, prompt_type, response, created_at
- **Foreign Key**: domain_id references domains(id)
- **Constraints**: Non-empty checks for model, prompt_type, and response
- **Indexes**: 8 indexes (1 INVALID - see issues section)

### partner_api_keys table ✅
- **Primary Key**: id (integer)
- **Key Columns**: api_key_hash, partner_email, tier, is_active
- **Unique Constraint**: api_key_hash
- **Default Values**: tier='free', rate_limit_per_hour=1000, is_active=true

### volatility_scores table ✅
- **Primary Key**: id (integer)
- **Key Columns**: domain_id, score, components, tier
- **Foreign Key**: domain_id references domains(id)
- **Unique Constraint**: domain_id
- **Check Constraints**: score between 0 and 1, tier validation

### memory_tensors table ✅
- **Primary Key**: id (integer)
- **Key Columns**: domain_id, week_of, memory_vector, consensus_score
- **Foreign Key**: domain_id references domains(id)

### swarm_learning table ✅
- **Primary Key**: id (integer)
- **Key Columns**: domain_id, volatility_score, models_used, response_quality
- **Foreign Key**: domain_id references domains(id)

## Record Counts

| Table | Total Records | Notes |
|-------|--------------|-------|
| domains | 3,239 | All marked as 'completed' (0 pending) |
| domain_responses | 129,057 | Active responses stored |
| partner_api_keys | 1 | Single API key configured |
| volatility_scores | 0 | No scores calculated yet |
| memory_tensors | 0 | No memory tensors stored |
| swarm_learning | 0 | No swarm learning data |

## Index Status

### Total Indexes by Table:
- **domains**: 15 indexes (all valid)
- **domain_responses**: 8 indexes (1 invalid)
- **partner_api_keys**: 3 indexes (all valid)
- **volatility_scores**: 6 indexes (all valid)
- **memory_tensors**: 3 indexes (all valid)
- **swarm_learning**: 3 indexes (all valid)

### Invalid Index Issue ⚠️
- **Table**: domain_responses
- **Index**: idx_domain_responses_domain_model
- **Type**: btree (domain_id, model) INCLUDE (response, created_at)
- **Status**: INVALID
- **Action Required**: This index needs to be rebuilt

## Connection Test Results

### PostgreSQL CLI (psql) ✅
- Connection successful
- All queries executed without issues

### Node.js Connection ✅
- Connection successful with SSL enabled
- Required SSL configuration: `ssl: { rejectUnauthorized: false }`
- Verified 42 total tables in public schema

## Critical Findings

### 1. Missing Table ❌
- **monitoring_jobs** table does not exist
- This table was listed as required but is not present in the database

### 2. Invalid Index ⚠️
- **idx_domain_responses_domain_model** on domain_responses table is marked as INVALID
- This could impact query performance for domain/model lookups

### 3. No Pending Domains ⚠️
- All 3,239 domains are marked as 'completed'
- No domains with status='pending' as mentioned in CLAUDE.md
- This suggests domain processing may have already been completed

### 4. Empty Tables
- volatility_scores, memory_tensors, and swarm_learning tables have no data
- These may be for future features or require initialization

## Recommendations

1. **Create monitoring_jobs table** if it's required for the application
2. **Rebuild invalid index**:
   ```sql
   REINDEX INDEX idx_domain_responses_domain_model;
   ```
3. **Verify domain processing status** - all domains show as completed
4. **SSL Configuration** - Services must include SSL settings for database connections

## Database Operational Status

✅ **OPERATIONAL** - The database is functional and accessible with the following caveats:
- One missing table (monitoring_jobs)
- One invalid index needs rebuilding
- All domains already processed (no pending work)

The database structure supports the Domain Runner application requirements with minor issues that should be addressed.