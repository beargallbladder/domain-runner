#!/usr/bin/env node

// SIMPLE TEST CRAWL - Just process 5 domains to verify it works
const { Pool } = require('pg');
const axios = require('axios');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://raw_capture_db_user:wjFesUM8ISNEvE2b4kZtRAKgGYJVtKK5@dpg-d11fqgndiees73fb35dg-a.oregon-postgres.render.com/raw_capture_db',
  ssl: { rejectUnauthorized: false }
});

async function testCrawl() {
  console.log('🧪 SIMPLE TEST CRAWL');
  console.log('=' * 50);
  
  // Check environment
  console.log('Environment:', process.env.RENDER ? 'RENDER' : 'LOCAL');
  console.log('API Keys Available:');
  console.log('  OPENAI:', !!process.env.OPENAI_API_KEY);
  console.log('  ANTHROPIC:', !!process.env.ANTHROPIC_API_KEY);
  console.log('  DEEPSEEK:', !!process.env.DEEPSEEK_API_KEY);
  
  try {
    // Get 5 pending domains
    const { rows: domains } = await pool.query(
      "SELECT id, domain FROM domains WHERE status = 'pending' LIMIT 5"
    );
    
    console.log(`\nProcessing ${domains.length} test domains...`);
    
    for (const domain of domains) {
      console.log(`\n📍 Processing: ${domain.domain}`);
      
      // Update to processing
      await pool.query(
        "UPDATE domains SET status = 'processing' WHERE id = $1",
        [domain.id]
      );
      
      // Try with DeepSeek (usually most reliable)
      if (process.env.DEEPSEEK_API_KEY) {
        try {
          const response = await axios.post('https://api.deepseek.com/v1/chat/completions', {
            model: 'deepseek-chat',
            messages: [{ role: 'user', content: `Tell me about ${domain.domain}` }],
            max_tokens: 150
          }, {
            headers: { 
              'Authorization': `Bearer ${process.env.DEEPSEEK_API_KEY}`,
              'Content-Type': 'application/json'
            },
            timeout: 10000
          });
          
          const content = response.data.choices[0].message.content;
          console.log(`  ✅ Response: ${content.substring(0, 100)}...`);
          
          // Store response
          await pool.query(`
            INSERT INTO domain_responses (domain_id, model, response, sentiment_score, created_at)
            VALUES ($1, $2, $3, $4, NOW())
            ON CONFLICT (domain_id, model) DO UPDATE SET
              response = $3,
              sentiment_score = $4,
              created_at = NOW()
          `, [domain.id, 'deepseek/test', content, 75]);
          
          // Mark as completed
          await pool.query(
            "UPDATE domains SET status = 'completed' WHERE id = $1",
            [domain.id]
          );
          
          console.log('  💾 Saved to database');
          
        } catch (err) {
          console.error(`  ❌ Error: ${err.message}`);
          
          // Reset to pending on error
          await pool.query(
            "UPDATE domains SET status = 'pending' WHERE id = $1",
            [domain.id]
          );
        }
      } else {
        console.log('  ⚠️ No API keys available');
        await pool.query(
          "UPDATE domains SET status = 'pending' WHERE id = $1",
          [domain.id]
        );
      }
    }
    
    // Final check
    const { rows: [stats] } = await pool.query(`
      SELECT 
        (SELECT COUNT(*) FROM domain_responses WHERE created_at > NOW() - INTERVAL '5 minutes') as recent
    `);
    
    console.log(`\n📊 Test Complete:`);
    console.log(`  New responses: ${stats.recent}`);
    
    if (stats.recent > 0) {
      console.log('✅ CRAWLER IS WORKING!');
    } else {
      console.log('❌ No responses created - check API keys on Render');
    }
    
  } catch (error) {
    console.error('Fatal error:', error.message);
  } finally {
    await pool.end();
    process.exit(0);
  }
}

testCrawl();