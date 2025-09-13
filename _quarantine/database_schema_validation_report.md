# Database Schema Validation Report

## Executive Summary

This report documents the validation of the Domain Runner PostgreSQL database schema. Key findings:

1. **Total Tables**: 31 tables identified
2. **Core Tables**: `domains` and `domain_responses` are properly structured
3. **Current Status**: All 3,239 domains are marked as "completed" (0 pending)
4. **Data Volume**: 73,589 responses stored across various models

## Critical Schema Issues Found

### 1. Missing Table Definition in Schema Files
- **Issue**: The `domain_responses` table exists in production but is NOT defined in `/schemas/tables.sql`
- **Impact**: New deployments would fail to create this critical table
- **Severity**: HIGH

### 2. Schema Mismatch Between Code and Database

#### Expected by Code (from CLAUDE.md):
```sql
-- Code expects these columns
domain_responses (
    domain_id,
    model,
    prompt_type,
    response
)
```

#### Actual Database Schema:
```sql
CREATE TABLE domain_responses (
    id integer NOT NULL DEFAULT nextval('domain_responses_id_seq'::regclass),
    domain_id uuid NOT NULL,
    model character varying NOT NULL,
    prompt_type character varying NOT NULL,
    response text NOT NULL,
    created_at timestamp without time zone DEFAULT now()
);
```

### 3. Domains Table Schema

#### Actual Production Schema:
```sql
CREATE TABLE domains (
    id uuid NOT NULL DEFAULT uuid_generate_v4(),
    domain text NOT NULL,
    status text DEFAULT 'pending'::text,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    last_processed_at timestamp with time zone,
    process_count integer DEFAULT 0,
    error_count integer DEFAULT 0,
    source text,
    is_jolt boolean DEFAULT false,
    jolt_type text,
    jolt_severity text,
    jolt_additional_prompts integer DEFAULT 0,
    cohort text DEFAULT 'legacy'::text,
    priority integer DEFAULT 1,
    discovery_source text,
    source_domain text,
    jolt_activated_at timestamp without time zone,
    jolt_deactivated_at timestamp without time zone
);
```

## Index Analysis

### Domains Table Indexes:
1. `domains_pkey` - Primary key on `id`
2. `domains_domain_key` - Unique constraint on `domain`
3. `idx_domains_priority_status` - Composite index for processing queue
4. `idx_domains_jolt` - Partial index for jolt events
5. `idx_domains_cohort_status` - For cohort-based queries
6. `idx_domains_discovery` - For discovery source tracking

### Domain Responses Table Indexes:
1. `domain_responses_pkey` - Primary key on `id`
2. `idx_domain_responses_domain_id` - Foreign key index
3. `idx_domain_responses_created_at` - Time-based queries
4. `idx_domain_responses_domain_model` - Covering index with INCLUDE clause

## Foreign Key Constraints

1. `domain_responses.domain_id` → `domains.id` (CASCADE expected but not verified)

## Data Type Mismatches

### Critical Issues:
1. **UUID vs Serial**: Code expects integer IDs in some places but database uses UUIDs
2. **Timestamp Types**: Mix of `timestamp with time zone` and `timestamp without time zone`
3. **Missing NOT NULL**: Several columns that should have constraints don't

## Missing Schema Elements

### Not Found in Schema Files:
1. `domain_responses` table definition
2. Jolt-related columns in domains table
3. Cohort and priority columns
4. Processing tracking columns

## Performance Considerations

### Good Practices Found:
1. Covering index on `domain_responses` includes response data
2. Partial index on jolt domains reduces index size
3. Composite indexes align with query patterns

### Potential Issues:
1. No index on `domains.status` alone (always composite)
2. Missing index on `domain_responses.model` and `prompt_type` individually
3. No partitioning despite 73K+ records

## Recommendations

### Immediate Actions Required:

1. **Create Missing Schema File**:
```sql
-- Add to /schemas/domain_responses.sql
CREATE TABLE IF NOT EXISTS domain_responses (
    id SERIAL PRIMARY KEY,
    domain_id UUID NOT NULL REFERENCES domains(id) ON DELETE CASCADE,
    model VARCHAR(100) NOT NULL,
    prompt_type VARCHAR(100) NOT NULL,
    response TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_domain_responses_domain_id ON domain_responses(domain_id);
CREATE INDEX idx_domain_responses_created_at ON domain_responses(created_at);
CREATE INDEX idx_domain_responses_domain_model ON domain_responses(domain_id, model) INCLUDE (response, created_at);
```

2. **Update Application Code**:
- Fix UUID type handling in sophisticated-runner
- Ensure all timestamp operations use consistent timezone handling

3. **Add Missing Constraints**:
```sql
ALTER TABLE domain_responses ADD CONSTRAINT chk_model_not_empty CHECK (model != '');
ALTER TABLE domain_responses ADD CONSTRAINT chk_prompt_type_not_empty CHECK (prompt_type != '');
```

### Long-term Improvements:

1. **Implement Partitioning**:
```sql
-- Partition domain_responses by created_at for better performance
CREATE TABLE domain_responses_partitioned (LIKE domain_responses INCLUDING ALL)
PARTITION BY RANGE (created_at);
```

2. **Add Monitoring**:
```sql
-- Create monitoring views
CREATE VIEW domain_processing_stats AS
SELECT 
    status,
    COUNT(*) as count,
    AVG(process_count) as avg_processes,
    MAX(last_processed_at) as latest_process
FROM domains
GROUP BY status;
```

3. **Standardize Timestamps**:
- Convert all timestamps to `TIMESTAMP WITH TIME ZONE`
- Use consistent naming (created_at vs captured_at)

## Validation Results

✅ **Verified**:
- Foreign key relationship exists
- Indexes are properly created
- No orphaned records found

❌ **Issues Found**:
- Schema files incomplete
- Data type inconsistencies
- Missing constraints

⚠️ **Warnings**:
- All domains marked as "completed" (processing may have stopped)
- No recent processing timestamps
- Potential data staleness

## Next Steps

1. Run the schema migration script (to be created)
2. Update all application code to match actual schema
3. Add missing table definitions to version control
4. Implement monitoring for data freshness
5. Consider archiving old data (73K+ responses)

---

Generated: 2025-07-20
Database: raw_capture_db
Status: VALIDATION COMPLETE - CRITICAL ISSUES FOUND