#!/usr/bin/env node

// PRODUCTION CRAWLER - RUNS FROM ROOT WITH CORRECT PATHS
const { Pool } = require('pg');
const axios = require('axios');

console.log(`
🚀 PRODUCTION CRAWLER STARTING
====================================
Time: ${new Date().toISOString()}
Working Directory: ${process.cwd()}
Node Version: ${process.version}
====================================
`);

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://raw_capture_db_user:wjFesUM8ISNEvE2b4kZtRAKgGYJVtKK5@dpg-d11fqgndiees73fb35dg-a.oregon-postgres.render.com/raw_capture_db',
  ssl: { rejectUnauthorized: false }
});

// Check environment
console.log('🔍 Environment Check:');
console.log(`  RENDER: ${process.env.RENDER || 'false'}`);
console.log(`  IS_PULL_REQUEST: ${process.env.IS_PULL_REQUEST || 'false'}`);
console.log(`  NODE_ENV: ${process.env.NODE_ENV || 'not set'}`);
console.log('');

// Check API Keys
console.log('🔑 API Keys Status:');
const apiKeys = {
  OPENAI: process.env.OPENAI_API_KEY,
  ANTHROPIC: process.env.ANTHROPIC_API_KEY,
  DEEPSEEK: process.env.DEEPSEEK_API_KEY,
  MISTRAL: process.env.MISTRAL_API_KEY,
  COHERE: process.env.COHERE_API_KEY,
  TOGETHER: process.env.TOGETHER_API_KEY,
  GROQ: process.env.GROQ_API_KEY,
  XAI: process.env.XAI_API_KEY,
  GOOGLE: process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY,
  AI21: process.env.AI21_API_KEY,
  OPENROUTER: process.env.OPENROUTER_API_KEY,
  PERPLEXITY: process.env.PERPLEXITY_API_KEY,
  YOU: process.env.YOU_API_KEY
};

let availableCount = 0;
Object.entries(apiKeys).forEach(([name, key]) => {
  if (key) {
    console.log(`  ✅ ${name}: ${key.substring(0, 10)}...`);
    availableCount++;
  } else {
    console.log(`  ❌ ${name}: NOT FOUND`);
  }
});

console.log(`\n📊 Total: ${availableCount}/13 API keys available`);

if (availableCount === 0) {
  console.error('\n❌ FATAL: No API keys found!');
  console.error('This means environment variables are not loaded.');
  console.error('Checking if we can access database...\n');
  
  // Test database
  pool.query('SELECT COUNT(*) FROM domains')
    .then(result => {
      console.log(`✅ Database accessible: ${result.rows[0].count} domains`);
      console.log('\n⚠️  Database works but no API keys - environment issue!');
      process.exit(1);
    })
    .catch(err => {
      console.error('❌ Database error:', err.message);
      process.exit(1);
    });
  return;
}

// Simple test crawl with available APIs
async function testCrawl() {
  console.log('\n🧪 Starting test crawl with available APIs...\n');
  
  try {
    // Get one test domain
    const domainResult = await pool.query(
      "SELECT id, domain FROM domains WHERE domain = 'test-site.com' LIMIT 1"
    );
    
    if (!domainResult.rows[0]) {
      console.log('Creating test domain...');
      const insertResult = await pool.query(
        "INSERT INTO domains (domain) VALUES ('test-site.com') RETURNING id, domain"
      );
      domainResult.rows[0] = insertResult.rows[0];
    }
    
    const testDomain = domainResult.rows[0];
    console.log(`📍 Test domain: ${testDomain.domain} (${testDomain.id})`);
    
    // Test OpenAI if available
    if (apiKeys.OPENAI) {
      console.log('\n🤖 Testing OpenAI...');
      try {
        const response = await axios.post('https://api.openai.com/v1/chat/completions', {
          model: 'gpt-3.5-turbo',
          messages: [{ role: 'user', content: `Tell me about ${testDomain.domain}` }],
          max_tokens: 100
        }, {
          headers: { 'Authorization': `Bearer ${apiKeys.OPENAI}` },
          timeout: 10000
        });
        
        const content = response.data.choices[0].message.content;
        console.log('✅ OpenAI responded:', content.substring(0, 100) + '...');
        
        // Store in database
        await pool.query(`
          INSERT INTO domain_responses (domain_id, model, response, sentiment_score, created_at)
          VALUES ($1, 'openai-test', $2, 50, NOW())
          ON CONFLICT (domain_id, model) DO UPDATE SET
            response = $2,
            created_at = NOW()
        `, [testDomain.id, content]);
        
        console.log('✅ Database write successful!');
        
        // Verify it was written
        const verify = await pool.query(
          "SELECT model, created_at FROM domain_responses WHERE domain_id = $1 AND model = 'openai-test'",
          [testDomain.id]
        );
        console.log('✅ Verified in DB:', verify.rows[0]);
        
      } catch (err) {
        console.error('❌ OpenAI error:', err.response?.data || err.message);
      }
    }
    
    // Test Anthropic if available
    if (apiKeys.ANTHROPIC) {
      console.log('\n🤖 Testing Anthropic...');
      try {
        const response = await axios.post('https://api.anthropic.com/v1/messages', {
          model: 'claude-3-haiku-20240307',
          messages: [{ role: 'user', content: `Tell me about ${testDomain.domain}` }],
          max_tokens: 100
        }, {
          headers: { 
            'x-api-key': apiKeys.ANTHROPIC,
            'anthropic-version': '2023-06-01',
            'content-type': 'application/json'
          },
          timeout: 10000
        });
        
        const content = response.data.content[0].text;
        console.log('✅ Anthropic responded:', content.substring(0, 100) + '...');
        
        // Store in database
        await pool.query(`
          INSERT INTO domain_responses (domain_id, model, response, sentiment_score, created_at)
          VALUES ($1, 'anthropic-test', $2, 50, NOW())
          ON CONFLICT (domain_id, model) DO UPDATE SET
            response = $2,
            created_at = NOW()
        `, [testDomain.id, content]);
        
        console.log('✅ Database write successful!');
        
      } catch (err) {
        console.error('❌ Anthropic error:', err.response?.data || err.message);
      }
    }
    
    // Final check
    const finalCheck = await pool.query(`
      SELECT model, created_at 
      FROM domain_responses 
      WHERE created_at > NOW() - INTERVAL '1 minute'
      ORDER BY created_at DESC
    `);
    
    console.log('\n📊 Recent writes to database:');
    finalCheck.rows.forEach(row => {
      console.log(`  • ${row.model}: ${row.created_at}`);
    });
    
    if (finalCheck.rows.length > 0) {
      console.log('\n✅ CRAWL IS WORKING! API keys are accessible and database is writable.');
      console.log('Ready to run full tensor crawl with all providers.');
    } else {
      console.log('\n⚠️  No successful writes. Check API key validity.');
    }
    
  } catch (error) {
    console.error('\n❌ Test crawl failed:', error.message);
  } finally {
    await pool.end();
    process.exit(0);
  }
}

// Run the test
testCrawl();