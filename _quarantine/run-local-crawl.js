#!/usr/bin/env node

// Run local crawl using available API keys
const { Pool } = require('pg');
const axios = require('axios');

const pool = new Pool({
  connectionString: 'postgresql://raw_capture_db_user:wjFesUM8ISNEvE2b4kZtRAKgGYJVtKK5@dpg-d11fqgndiees73fb35dg-a.oregon-postgres.render.com/raw_capture_db',
  ssl: { rejectUnauthorized: false }
});

// Check what API keys we have locally
const OPENAI_KEY = process.env.OPENAI_API_KEY || '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';

async function processDomains() {
  console.log('🚀 LOCAL CRAWL STARTING');
  console.log('=' * 50);
  
  try {
    // Get 5 pending domains
    const { rows: domains } = await pool.query(`
      SELECT id, domain 
      FROM domains 
      WHERE status = 'pending'
      LIMIT 5
    `);
    
    if (!domains.length) {
      console.log('No pending domains');
      return;
    }
    
    console.log(`Processing ${domains.length} domains...\n`);
    
    for (const domain of domains) {
      try {
        // Update to processing
        await pool.query(
          "UPDATE domains SET status = 'processing' WHERE id = $1",
          [domain.id]
        );
        
        console.log(`📍 ${domain.domain}`);
        
        // Query OpenAI
        const response = await axios.post('https://api.openai.com/v1/chat/completions', {
          model: 'gpt-3.5-turbo',
          messages: [{
            role: 'user',
            content: `Tell me about ${domain.domain}. What does this company or website do? Keep response under 100 words.`
          }],
          max_tokens: 150,
          temperature: 0.7
        }, {
          headers: {
            'Authorization': `Bearer ${OPENAI_KEY}`,
            'Content-Type': 'application/json'
          },
          timeout: 10000
        });
        
        const content = response.data.choices[0].message.content;
        console.log(`  ✅ Response: ${content.substring(0, 100)}...`);
        
        // Calculate simple sentiment score (0-100)
        const positiveWords = ['excellent', 'great', 'innovative', 'leading', 'successful', 'popular'];
        const score = Math.min(100, 50 + positiveWords.filter(word => 
          content.toLowerCase().includes(word)
        ).length * 10);
        
        // Store response
        await pool.query(`
          INSERT INTO domain_responses (domain_id, model, response, sentiment_score, created_at)
          VALUES ($1, $2, $3, $4, NOW())
          ON CONFLICT (domain_id, model) DO UPDATE SET
            response = $3,
            sentiment_score = $4,
            created_at = NOW()
        `, [domain.id, 'openai/gpt-3.5-turbo', content, score]);
        
        // Update to completed
        await pool.query(
          "UPDATE domains SET status = 'completed' WHERE id = $1",
          [domain.id]
        );
        
        console.log(`  💾 Saved (score: ${score})\n`);
        
        // Small delay between requests
        await new Promise(r => setTimeout(r, 1000));
        
      } catch (err) {
        console.error(`  ❌ Error: ${err.message}\n`);
        
        // Update back to pending on error
        await pool.query(
          "UPDATE domains SET status = 'pending' WHERE id = $1",
          [domain.id]
        );
      }
    }
    
    // Final stats
    const { rows: [stats] } = await pool.query(`
      SELECT 
        (SELECT COUNT(*) FROM domains WHERE status = 'completed') as completed,
        (SELECT COUNT(*) FROM domains WHERE status = 'pending') as pending,
        (SELECT COUNT(*) FROM domain_responses WHERE created_at > NOW() - INTERVAL '5 minutes') as recent
    `);
    
    console.log('📊 Final Stats:');
    console.log(`  Completed: ${stats.completed}`);
    console.log(`  Pending: ${stats.pending}`);
    console.log(`  Recent responses: ${stats.recent}`);
    
  } catch (err) {
    console.error('Fatal error:', err.message);
  } finally {
    await pool.end();
  }
}

processDomains();