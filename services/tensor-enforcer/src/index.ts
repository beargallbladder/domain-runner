import express from 'express';
import { Pool } from 'pg';
import * as os from 'os';
import * as fs from 'fs';

console.log('🔒 TENSOR ENFORCER - PRODUCTION ONLY, 24/24 REQUIRED');

// BLOCK LOCAL EXECUTION IMMEDIATELY
const hostname = os.hostname();
if (hostname.includes('MacBook') || hostname.includes('local') || !process.env.RENDER) {
  console.error('❌ ABORTING: Local execution detected. Must run on Render.');
  console.error('❌ NO LOCAL RUNS ALLOWED - TENSOR REQUIRES PRODUCTION');
  process.exit(1);
}

// PREVENT DOUBLE RUNS
if (fs.existsSync('RUNNING.lock')) {
  console.error('⛔ Already running. Aborting to prevent conflicts.');
  process.exit(1);
}

fs.writeFileSync('RUNNING.lock', new Date().toISOString());
process.on('exit', () => {
  if (fs.existsSync('RUNNING.lock')) {
    fs.unlinkSync('RUNNING.lock');
  }
});

const app = express();
app.use(express.json());

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  max: 20
});

// ALL 8 AI PROVIDERS - HARD REQUIREMENT
const AI_PROVIDERS = [
  { name: 'openai', key: process.env.OPENAI_API_KEY },
  { name: 'anthropic', key: process.env.ANTHROPIC_API_KEY },
  { name: 'deepseek', key: process.env.DEEPSEEK_API_KEY },
  { name: 'mistral', key: process.env.MISTRAL_API_KEY },
  { name: 'xai', key: process.env.XAI_API_KEY },
  { name: 'together', key: process.env.TOGETHER_API_KEY },
  { name: 'perplexity', key: process.env.PERPLEXITY_API_KEY },
  { name: 'google', key: process.env.GOOGLE_API_KEY }
].filter(p => p.key && p.key.length > 10);

// BLOCK EXECUTION IF LESS THAN 8 PROVIDERS
if (AI_PROVIDERS.length < 8) {
  console.error(`❌ SYSTEM HALTED: Only ${AI_PROVIDERS.length}/8 providers configured.`);
  console.error('❌ TENSOR ANALYSIS IMPOSSIBLE - ALL 8 REQUIRED');
  process.exit(1);
}

console.log(`✅ All 8 AI providers configured`);

// HARD REQUIREMENT: 24 RESPONSES PER DOMAIN
async function validateDomainCompletion(domainId: string, domain: string): Promise<boolean> {
  const responseCount = await pool.query(`
    SELECT COUNT(*) as count
    FROM domain_responses 
    WHERE domain_id = $1
  `, [domainId]);
  
  const count = parseInt(responseCount.rows[0].count);
  
  if (count < 24) {
    console.log(`❌ INCOMPLETE: ${domain} has only ${count}/24 responses`);
    return false;
  }
  
  console.log(`✅ VALID: ${domain} has all 24 responses`);
  return true;
}

// NEVER MARK COMPLETE WITHOUT 24 RESPONSES
async function markDomainComplete(domainId: string, domain: string): Promise<boolean> {
  const isValid = await validateDomainCompletion(domainId, domain);
  
  if (!isValid) {
    console.log(`❌ BLOCKING COMPLETION: ${domain} missing responses`);
    return false;
  }
  
  await pool.query(`
    UPDATE domains 
    SET status = 'completed', updated_at = NOW() 
    WHERE id = $1
  `, [domainId]);
  
  console.log(`✅ DOMAIN TRULY COMPLETE: ${domain}`);
  return true;
}

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    service: 'tensor-enforcer',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    providers: AI_PROVIDERS.length,
    enforcement: 'ACTIVE'
  });
});

// Tensor readiness check
app.get('/tensor-readiness', async (req, res) => {
  try {
    const analysis = await pool.query(`
      SELECT 
        COUNT(DISTINCT d.id) as total_domains,
        COUNT(DISTINCT CASE WHEN response_counts.count = 24 THEN d.id END) as complete_domains,
        COUNT(DISTINCT CASE WHEN response_counts.count > 0 AND response_counts.count < 24 THEN d.id END) as partial_domains,
        COUNT(DISTINCT CASE WHEN response_counts.count = 0 THEN d.id END) as unprocessed_domains
      FROM domains d
      LEFT JOIN (
        SELECT domain_id, COUNT(*) as count
        FROM domain_responses
        GROUP BY domain_id
      ) response_counts ON d.id = response_counts.domain_id
    `);
    
    const stats = analysis.rows[0];
    const completionRate = (stats.complete_domains / stats.total_domains * 100).toFixed(2);
    
    const tensorReady = stats.complete_domains >= 100;
    
    res.json({
      tensor_ready: tensorReady,
      total_domains: stats.total_domains,
      complete_domains: stats.complete_domains,
      partial_domains: stats.partial_domains,
      unprocessed_domains: stats.unprocessed_domains,
      completion_rate: `${completionRate}%`,
      minimum_required: 100,
      status: tensorReady ? 'READY' : 'NOT_READY'
    });
    
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Fix fake completed domains
app.post('/fix-fake-completed', async (req, res) => {
  try {
    console.log('🔧 FIXING FAKE COMPLETED DOMAINS...');
    
    // Find domains marked "completed" but missing responses
    const fakeCompleted = await pool.query(`
      SELECT d.id, d.domain, COUNT(r.id) as response_count
      FROM domains d
      LEFT JOIN domain_responses r ON d.id = r.domain_id
      WHERE d.status = 'completed'
      GROUP BY d.id, d.domain
      HAVING COUNT(r.id) < 24
      ORDER BY response_count DESC
    `);
    
    console.log(`🚨 FOUND ${fakeCompleted.rows.length} FAKE COMPLETED DOMAINS`);
    
    for (const row of fakeCompleted.rows) {
      console.log(`   ❌ ${row.domain}: ${row.response_count}/24 responses (RESETTING)`);
      
      // Reset to pending for reprocessing
      await pool.query(`
        UPDATE domains 
        SET status = 'pending', updated_at = NOW() 
        WHERE id = $1
      `, [row.id]);
    }
    
    res.json({
      status: 'fixed',
      fake_completed_reset: fakeCompleted.rows.length,
      message: 'All fake completed domains reset to pending'
    });
    
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Enforce processing with 24/24 requirement
app.post('/process-with-enforcement', async (req, res) => {
  try {
    console.log('🚀 PROCESSING WITH HARD ENFORCEMENT...');
    
    // Get pending domains
    const pending = await pool.query(`
      SELECT id, domain 
      FROM domains 
      WHERE status = 'pending' 
      ORDER BY updated_at ASC 
      LIMIT 10
    `);
    
    if (pending.rows.length === 0) {
      return res.json({
        status: 'no_pending_domains',
        message: 'No pending domains to process'
      });
    }
    
    console.log(`📊 Found ${pending.rows.length} pending domains`);
    
    let domainsWithAll24 = 0;
    const processed = [];
    
    for (const row of pending.rows) {
      // Check if domain already has 24 responses
      const responseCount = await pool.query(`
        SELECT COUNT(*) as count
        FROM domain_responses 
        WHERE domain_id = $1
      `, [row.id]);
      
      const count = parseInt(responseCount.rows[0].count);
      
      if (count >= 24) {
        // Mark as truly completed
        await markDomainComplete(row.id, row.domain);
        domainsWithAll24++;
        processed.push({
          domain: row.domain,
          responses: count,
          status: 'completed',
          enforcement: 'PASSED'
        });
      } else {
        processed.push({
          domain: row.domain,
          responses: count,
          status: 'incomplete',
          enforcement: 'BLOCKED'
        });
      }
    }
    
    res.json({
      status: 'enforcement_complete',
      domains_processed: processed.length,
      domains_with_24_responses: domainsWithAll24,
      enforcement_active: true,
      processed_domains: processed
    });
    
  } catch (error: any) {
    console.error('❌ Processing error:', error.message);
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
});

// Start server
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log(`🚀 Tensor Enforcer running on port ${PORT}`);
  console.log(`📊 ${AI_PROVIDERS.length}/8 AI providers configured`);
  console.log(`🔒 Hard requirements ACTIVE - 24/24 responses required`);
  console.log(`🚫 Local execution BLOCKED`);
  console.log('✅ Ready to enforce tensor quality!');
}); 