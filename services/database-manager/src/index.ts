import express from 'express';
import { Pool } from 'pg';
import cors from 'cors';

const app = express();
app.use(cors());
app.use(express.json());

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

// ============================================================================
// DATABASE SCHEMA ANALYSIS
// ============================================================================

interface SchemaAnalysis {
  tables: string[];
  responses_columns: Array<{name: string; type: string}>;
  domains_columns: Array<{name: string; type: string}>;
  missing_for_jolt: string[];
  recommendations: string[];
}

async function analyzeSchema(): Promise<SchemaAnalysis> {
  try {
    // Get all tables
    const tablesResult = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name
    `);
    
    // Get responses table columns
    const responsesColumns = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'responses' AND table_schema = 'public'
      ORDER BY ordinal_position
    `);
    
    // Get domains table columns  
    const domainsColumns = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'domains' AND table_schema = 'public'
      ORDER BY ordinal_position
    `);
    
    const responsesCols = responsesColumns.rows.map(r => ({
      name: r.column_name,
      type: r.data_type
    }));
    
    const domainsCols = domainsColumns.rows.map(r => ({
      name: r.column_name, 
      type: r.data_type
    }));
    
    // Analyze what's missing for JOLT support
    const missingForJolt: string[] = [];
    const recommendations: string[] = [];
    
    // Check responses table for JOLT requirements
    const hasLatency = responsesCols.some(c => c.name === 'latency_ms');
    const hasCost = responsesCols.some(c => c.name === 'cost_usd');
    
    if (!hasLatency) {
      missingForJolt.push('responses.latency_ms (INTEGER)');
      recommendations.push('Add latency tracking for performance analysis');
    }
    
    if (!hasCost) {
      missingForJolt.push('responses.cost_usd (DECIMAL)');
      recommendations.push('Add cost tracking for JOLT vs regular domain comparison');
    }
    
    // Check domains table for JOLT metadata
    const hasJoltFlag = domainsCols.some(c => c.name === 'is_jolt');
    const hasJoltType = domainsCols.some(c => c.name === 'jolt_type');
    const hasJoltSeverity = domainsCols.some(c => c.name === 'jolt_severity');
    
    if (!hasJoltFlag) {
      missingForJolt.push('domains.is_jolt (BOOLEAN)');
      recommendations.push('Add JOLT flag to identify crisis transition domains');
    }
    
    if (!hasJoltType) {
      missingForJolt.push('domains.jolt_type (TEXT)');
      recommendations.push('Add JOLT type classification (brand_transition, corporate_collapse, etc.)');
    }
    
    if (!hasJoltSeverity) {
      missingForJolt.push('domains.jolt_severity (TEXT)');
      recommendations.push('Add JOLT severity for cost allocation (low, medium, high, critical)');
    }
    
    return {
      tables: tablesResult.rows.map(r => r.table_name),
      responses_columns: responsesCols,
      domains_columns: domainsCols,
      missing_for_jolt: missingForJolt,
      recommendations
    };
    
  } catch (error) {
    console.error('Schema analysis failed:', error);
    throw error;
  }
}

// ============================================================================
// JOLT MIGRATION RUNNER
// ============================================================================

interface MigrationResult {
  success: boolean;
  changes_made: string[];
  errors: string[];
  schema_before: SchemaAnalysis;
  schema_after?: SchemaAnalysis;
}

async function runJoltMigration(): Promise<MigrationResult> {
  const schemaBefore = await analyzeSchema();
  const changesMade: string[] = [];
  const errors: string[] = [];
  
  try {
    await pool.query('BEGIN');
    
    // Add JOLT metadata to domains table
    if (!schemaBefore.domains_columns.some(c => c.name === 'is_jolt')) {
      await pool.query('ALTER TABLE domains ADD COLUMN IF NOT EXISTS is_jolt BOOLEAN DEFAULT FALSE');
      changesMade.push('Added domains.is_jolt column');
    }
    
    if (!schemaBefore.domains_columns.some(c => c.name === 'jolt_type')) {
      await pool.query('ALTER TABLE domains ADD COLUMN IF NOT EXISTS jolt_type TEXT');
      changesMade.push('Added domains.jolt_type column');
    }
    
    if (!schemaBefore.domains_columns.some(c => c.name === 'jolt_severity')) {
      await pool.query(`
        ALTER TABLE domains ADD COLUMN IF NOT EXISTS jolt_severity TEXT 
        CHECK (jolt_severity IS NULL OR jolt_severity IN ('low', 'medium', 'high', 'critical'))
      `);
      changesMade.push('Added domains.jolt_severity column with constraints');
    }
    
    if (!schemaBefore.domains_columns.some(c => c.name === 'jolt_description')) {
      await pool.query('ALTER TABLE domains ADD COLUMN IF NOT EXISTS jolt_description TEXT');
      changesMade.push('Added domains.jolt_description column');
    }
    
    if (!schemaBefore.domains_columns.some(c => c.name === 'jolt_additional_prompts')) {
      await pool.query('ALTER TABLE domains ADD COLUMN IF NOT EXISTS jolt_additional_prompts INTEGER DEFAULT 0');
      changesMade.push('Added domains.jolt_additional_prompts column');
    }
    
    // Add cost tracking to responses table
    if (!schemaBefore.responses_columns.some(c => c.name === 'cost_usd')) {
      await pool.query('ALTER TABLE responses ADD COLUMN IF NOT EXISTS cost_usd DECIMAL(10,6)');
      changesMade.push('Added responses.cost_usd column');
    }
    
    if (!schemaBefore.responses_columns.some(c => c.name === 'latency_ms')) {
      await pool.query('ALTER TABLE responses ADD COLUMN IF NOT EXISTS latency_ms INTEGER');
      changesMade.push('Added responses.latency_ms column');
    }
    
    // Create indexes for JOLT queries
    await pool.query('CREATE INDEX IF NOT EXISTS idx_domains_jolt ON domains(is_jolt) WHERE is_jolt = TRUE');
    changesMade.push('Created JOLT domains index');
    
    await pool.query('CREATE INDEX IF NOT EXISTS idx_responses_cost ON responses(cost_usd) WHERE cost_usd IS NOT NULL');
    changesMade.push('Created cost tracking index');
    
    await pool.query('COMMIT');
    
    const schemaAfter = await analyzeSchema();
    
    return {
      success: true,
      changes_made: changesMade,
      errors: [],
      schema_before: schemaBefore,
      schema_after: schemaAfter
    };
    
  } catch (error) {
    await pool.query('ROLLBACK');
    errors.push(`Migration failed: ${error.message}`);
    
    return {
      success: false,
      changes_made: changesMade,
      errors,
      schema_before: schemaBefore
    };
  }
}

// ============================================================================
// JOLT DOMAIN SEEDING
// ============================================================================

const JOLT_DOMAINS = [
  {
    domain: 'apple.com',
    jolt_type: 'leadership_change', 
    jolt_severity: 'critical',
    jolt_description: 'Steve Jobs death transition - Ultimate brand memory test',
    jolt_additional_prompts: 8
  },
  {
    domain: 'theranos.com',
    jolt_type: 'corporate_collapse',
    jolt_severity: 'critical', 
    jolt_description: 'Complete fraud scandal collapse',
    jolt_additional_prompts: 7
  },
  {
    domain: 'facebook.com',
    jolt_type: 'brand_transition',
    jolt_severity: 'high',
    jolt_description: 'Facebook to Meta rebranding',
    jolt_additional_prompts: 6
  },
  {
    domain: 'twitter.com',
    jolt_type: 'brand_transition',
    jolt_severity: 'critical',
    jolt_description: 'Twitter to X transformation under Musk',
    jolt_additional_prompts: 8
  },
  {
    domain: 'tesla.com',
    jolt_type: 'leadership_controversy',
    jolt_severity: 'high',
    jolt_description: 'Elon Musk controversies and brand impact',
    jolt_additional_prompts: 6
  }
];

async function seedJoltDomains(): Promise<{seeded: number; updated: number; errors: string[]}> {
  let seeded = 0;
  let updated = 0;
  const errors: string[] = [];
  
  for (const joltDomain of JOLT_DOMAINS) {
    try {
      // Insert or update domain with JOLT metadata
      const result = await pool.query(`
        INSERT INTO domains (domain, is_jolt, jolt_type, jolt_severity, jolt_description, jolt_additional_prompts)
        VALUES ($1, TRUE, $2, $3, $4, $5)
        ON CONFLICT (domain) DO UPDATE SET
          is_jolt = TRUE,
          jolt_type = EXCLUDED.jolt_type,
          jolt_severity = EXCLUDED.jolt_severity,
          jolt_description = EXCLUDED.jolt_description,
          jolt_additional_prompts = EXCLUDED.jolt_additional_prompts
        RETURNING (xmax = 0) AS inserted
      `, [
        joltDomain.domain,
        joltDomain.jolt_type,
        joltDomain.jolt_severity,
        joltDomain.jolt_description,
        joltDomain.jolt_additional_prompts
      ]);
      
      if (result.rows[0].inserted) {
        seeded++;
      } else {
        updated++;
      }
      
    } catch (error) {
      errors.push(`Failed to seed ${joltDomain.domain}: ${error.message}`);
    }
  }
  
  return { seeded, updated, errors };
}

// ============================================================================
// REST API ENDPOINTS
// ============================================================================

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy',
    service: 'database-manager',
    timestamp: new Date().toISOString()
  });
});

// Analyze current schema
app.get('/schema/analyze', async (req, res) => {
  try {
    const analysis = await analyzeSchema();
    res.json({
      success: true,
      analysis,
      jolt_ready: analysis.missing_for_jolt.length === 0
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Run JOLT migration
app.post('/migration/jolt', async (req, res) => {
  try {
    const result = await runJoltMigration();
    res.json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Seed JOLT domains
app.post('/jolt/seed', async (req, res) => {
  try {
    const result = await seedJoltDomains();
    res.json({
      success: true,
      ...result
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get JOLT domain status
app.get('/jolt/status', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        COUNT(*) as total_jolt_domains,
        COUNT(*) FILTER (WHERE jolt_severity = 'critical') as critical_domains,
        COUNT(*) FILTER (WHERE jolt_severity = 'high') as high_domains,
        SUM(jolt_additional_prompts) as total_additional_prompts
      FROM domains 
      WHERE is_jolt = TRUE
    `);
    
    const joltDomains = await pool.query(`
      SELECT domain, jolt_type, jolt_severity, jolt_additional_prompts
      FROM domains 
      WHERE is_jolt = TRUE
      ORDER BY jolt_severity DESC, jolt_additional_prompts DESC
    `);
    
    res.json({
      success: true,
      summary: result.rows[0],
      domains: joltDomains.rows
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Test database connection
app.get('/test', async (req, res) => {
  try {
    const result = await pool.query('SELECT NOW() as timestamp');
    res.json({
      success: true,
      database_connected: true,
      timestamp: result.rows[0].timestamp
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      database_connected: false,
      error: error.message
    });
  }
});

const PORT = process.env.PORT || 10002;

app.listen(PORT, () => {
  console.log(`🗄️  Database Manager running on port ${PORT}`);
  console.log(`📊 Schema Analysis: http://localhost:${PORT}/schema/analyze`);
  console.log(`🔧 Run Migration: POST http://localhost:${PORT}/migration/jolt`);
  console.log(`🌱 Seed JOLT: POST http://localhost:${PORT}/jolt/seed`);
  console.log(`📈 JOLT Status: http://localhost:${PORT}/jolt/status`);
}); 