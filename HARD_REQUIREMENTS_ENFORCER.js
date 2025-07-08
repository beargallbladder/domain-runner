const fs = require('fs');
const os = require('os');
const { Pool } = require('pg');

console.log('�� HARD REQUIREMENTS ENFORCER - NO MORE FAKE SUCCESS');
console.log('=' * 60);

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

// Load environment
const envPath = './domain-runner/.env';
const envContent = fs.readFileSync(envPath, 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
  const [key, ...value] = line.split('=');
  if (key && value.length) {
    env[key.trim()] = value.join('=').trim().replace(/^["']|["']$/g, '');
  }
});

// Database connection
const pool = new Pool({
  connectionString: env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  max: 20
});

// ALL 8 AI PROVIDERS - HARD REQUIREMENT
const AI_PROVIDERS = [
  { name: 'openai', key: env.OPENAI_API_KEY },
  { name: 'anthropic', key: env.ANTHROPIC_API_KEY },
  { name: 'deepseek', key: env.DEEPSEEK_API_KEY },
  { name: 'mistral', key: env.MISTRAL_API_KEY },
  { name: 'xai', key: env.XAI_API_KEY },
  { name: 'together', key: env.TOGETHER_API_KEY },
  { name: 'perplexity', key: env.PERPLEXITY_API_KEY },
  { name: 'google', key: env.GOOGLE_API_KEY }
].filter(p => p.key && p.key.length > 10);

// BLOCK EXECUTION IF LESS THAN 8 PROVIDERS
if (AI_PROVIDERS.length < 8) {
  console.error(`❌ SYSTEM HALTED: Only ${AI_PROVIDERS.length}/8 providers configured.`);
  console.error('❌ TENSOR ANALYSIS IMPOSSIBLE - ALL 8 REQUIRED');
  process.exit(1);
}

console.log(`✅ All 8 AI providers configured`);

// HARD REQUIREMENT: 24 RESPONSES PER DOMAIN
async function validateDomainCompletion(domainId, domain) {
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
async function markDomainComplete(domainId, domain) {
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

// FIND DOMAINS WITH MISSING RESPONSES
async function findIncompleteProcessing() {
  console.log('🔍 SCANNING FOR INCOMPLETE DOMAINS...');
  
  // Find domains marked "completed" but missing responses
  const fakeCompleted = await pool.query(`
    SELECT d.id, d.domain, COUNT(r.id) as response_count
    FROM domains d
    LEFT JOIN domain_responses r ON d.id = r.domain_id
    WHERE d.status = 'completed'
    GROUP BY d.id, d.domain
    HAVING COUNT(r.id) < 24
    ORDER BY response_count DESC
    LIMIT 50
  `);
  
  console.log(`🚨 FOUND ${fakeCompleted.rows.length} FAKE COMPLETED DOMAINS`);
  
  for (const row of fakeCompleted.rows) {
    console.log(`   ❌ ${row.domain}: ${row.response_count}/24 responses (FAKE COMPLETE)`);
    
    // Reset to pending for reprocessing
    await pool.query(`
      UPDATE domains 
      SET status = 'pending', updated_at = NOW() 
      WHERE id = $1
    `, [row.id]);
  }
  
  // Find truly pending domains
  const pending = await pool.query(`
    SELECT COUNT(*) as count
    FROM domains 
    WHERE status = 'pending'
  `);
  
  console.log(`📊 PENDING DOMAINS: ${pending.rows[0].count}`);
  
  // Check tensor readiness
  const tensorReady = await pool.query(`
    SELECT COUNT(DISTINCT d.id) as ready_domains
    FROM domains d
    JOIN domain_responses r ON d.id = r.domain_id
    GROUP BY d.id
    HAVING COUNT(r.id) = 24
  `);
  
  console.log(`🎯 TENSOR-READY DOMAINS: ${tensorReady.rows[0].ready_domains}`);
  
  return {
    fakeCompleted: fakeCompleted.rows.length,
    pending: pending.rows[0].count,
    tensorReady: tensorReady.rows[0].ready_domains
  };
}

// TENSOR READINESS CHECK
async function checkTensorReadiness() {
  console.log('\n🎯 TENSOR READINESS ANALYSIS...');
  
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
  
  console.log(`📊 TENSOR ANALYSIS READINESS:`);
  console.log(`   Total domains: ${stats.total_domains}`);
  console.log(`   Complete (24/24): ${stats.complete_domains}`);
  console.log(`   Partial (broken): ${stats.partial_domains}`);
  console.log(`   Unprocessed: ${stats.unprocessed_domains}`);
  
  const completionRate = (stats.complete_domains / stats.total_domains * 100).toFixed(2);
  console.log(`   Completion rate: ${completionRate}%`);
  
  if (stats.complete_domains === 0) {
    console.log(`❌ TENSOR ANALYSIS IMPOSSIBLE - NO COMPLETE DOMAINS`);
    return false;
  } else if (stats.complete_domains < 100) {
    console.log(`⚠️ TENSOR ANALYSIS LIMITED - ONLY ${stats.complete_domains} COMPLETE DOMAINS`);
    return false;
  } else {
    console.log(`✅ TENSOR ANALYSIS POSSIBLE - ${stats.complete_domains} COMPLETE DOMAINS`);
    return true;
  }
}

// PROVIDER HEALTH CHECK
async function checkProviderHealth() {
  console.log('\n🏥 PROVIDER HEALTH CHECK...');
  
  const providerStats = await pool.query(`
    SELECT model, COUNT(*) as response_count
    FROM domain_responses
    WHERE created_at > NOW() - INTERVAL '24 hours'
    GROUP BY model
    ORDER BY response_count DESC
  `);
  
  console.log('📊 Provider activity (last 24 hours):');
  const activeProviders = new Set();
  
  for (const row of providerStats.rows) {
    console.log(`   ${row.model}: ${row.response_count} responses`);
    activeProviders.add(row.model);
  }
  
  const expectedModels = [
    'gpt-4o-mini', 'claude-3-haiku-20240307', 'deepseek-chat', 
    'mistral-small-latest', 'grok-beta', 'meta-llama/Meta-Llama-3.1-8B-Instruct-Turbo',
    'llama-3.1-sonar-small-128k-online', 'gemini-pro'
  ];
  
  const workingProviders = expectedModels.filter(model => 
    providerStats.rows.some(row => row.model.includes(model.split('/')[0]))
  );
  
  console.log(`🔧 Working providers: ${workingProviders.length}/8`);
  
  if (workingProviders.length < 8) {
    console.log(`❌ INSUFFICIENT PROVIDERS FOR TENSOR ANALYSIS`);
    return false;
  }
  
  return true;
}

// MAIN ENFORCEMENT FUNCTION
async function enforceHardRequirements() {
  try {
    console.log('🔒 ENFORCING HARD REQUIREMENTS...');
    
    // 1. Check incomplete processing
    const incomplete = await findIncompleteProcessing();
    
    // 2. Check provider health
    const providersHealthy = await checkProviderHealth();
    
    // 3. Check tensor readiness
    const tensorReady = await checkTensorReadiness();
    
    console.log('\n📋 ENFORCEMENT SUMMARY:');
    console.log(`   Fake completed domains reset: ${incomplete.fakeCompleted}`);
    console.log(`   Pending domains: ${incomplete.pending}`);
    console.log(`   Tensor-ready domains: ${incomplete.tensorReady}`);
    console.log(`   Providers healthy: ${providersHealthy ? 'YES' : 'NO'}`);
    console.log(`   Tensor ready: ${tensorReady ? 'YES' : 'NO'}`);
    
    if (!providersHealthy) {
      console.log('\n❌ SYSTEM NOT READY: Provider health check failed');
      return false;
    }
    
    if (!tensorReady) {
      console.log('\n❌ TENSOR NOT READY: Insufficient complete domains');
      return false;
    }
    
    console.log('\n✅ SYSTEM READY FOR TENSOR ANALYSIS');
    return true;
    
  } catch (error) {
    console.error('❌ Enforcement error:', error.message);
    return false;
  } finally {
    await pool.end();
  }
}

// Run enforcement
enforceHardRequirements()
  .then(ready => {
    if (ready) {
      console.log('\n🎯 HARD REQUIREMENTS SATISFIED');
      console.log('🔥 NO MORE FAKE SUCCESS - SYSTEM IS TRULY READY');
    } else {
      console.log('\n💥 HARD REQUIREMENTS FAILED');
      console.log('🚫 BLOCKING EXECUTION UNTIL FIXED');
      process.exit(1);
    }
  })
  .catch(error => {
    console.error('💥 ENFORCEMENT FAILED:', error.message);
    process.exit(1);
  });
