#!/usr/bin/env node

// Test crawler - Only uses OpenAI to verify API key works
const { Pool } = require('pg');
const axios = require('axios');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://raw_capture_db_user:wjFesUM8ISNEvE2b4kZtRAKgGYJVtKK5@dpg-d11fqgndiees73fb35dg-a.oregon-postgres.render.com/raw_capture_db',
  ssl: { rejectUnauthorized: false }
});

async function testOpenAI() {
  console.log('🧪 Testing OpenAI API...');
  console.log('API Key present:', !!process.env.OPENAI_API_KEY);
  console.log('API Key length:', process.env.OPENAI_API_KEY?.length || 0);
  console.log('API Key prefix:', process.env.OPENAI_API_KEY?.substring(0, 7) || 'N/A');
  
  try {
    const response = await axios.post('https://api.openai.com/v1/chat/completions', {
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: 'Say "API test successful" in 3 words' }],
      max_tokens: 10
    }, {
      headers: { 
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('✅ OpenAI API test successful!');
    console.log('Response:', response.data.choices[0].message.content);
    return true;
  } catch (error) {
    console.error('❌ OpenAI API test failed!');
    console.error('Error:', error.response?.data || error.message);
    return false;
  }
}

async function crawlSingleDomain() {
  // Get one domain that hasn't been crawled recently
  const result = await pool.query(`
    WITH recent_responses AS (
      SELECT domain_id, MAX(created_at) as last_crawled
      FROM domain_responses
      WHERE created_at > NOW() - INTERVAL '7 days'
      GROUP BY domain_id
    )
    SELECT d.id, d.domain
    FROM domains d
    LEFT JOIN recent_responses rr ON d.id = rr.domain_id
    WHERE rr.last_crawled IS NULL
    ORDER BY d.updated_at ASC
    LIMIT 1
  `);
  
  if (result.rows.length === 0) {
    console.log('No domains need crawling');
    return;
  }
  
  const domain = result.rows[0];
  console.log(`\n🌐 Crawling: ${domain.domain}`);
  
  const prompt = `Analyze the business potential of ${domain.domain}. Provide a brief assessment in 2-3 sentences.`;
  
  try {
    const response = await axios.post('https://api.openai.com/v1/chat/completions', {
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 100
    }, {
      headers: { 
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      }
    });
    
    const content = response.data.choices[0].message.content;
    console.log('📝 Response received:', content.substring(0, 100) + '...');
    
    // Store in database
    await pool.query(`
      INSERT INTO domain_responses (
        domain_id, model, prompt_type, prompt, response, 
        created_at, batch_id
      ) VALUES ($1, $2, $3, $4, $5, NOW(), $6)
    `, [
      domain.id,
      'openai/gpt-4o-mini',
      'business_analysis',
      prompt,
      content,
      `test_crawl_${new Date().toISOString()}`
    ]);
    
    console.log('✅ Successfully stored in database!');
    
    // Verify it was stored
    const check = await pool.query(`
      SELECT COUNT(*) as new_responses 
      FROM domain_responses 
      WHERE domain_id = $1 
      AND created_at > NOW() - INTERVAL '1 minute'
    `, [domain.id]);
    
    console.log(`📊 New responses in DB: ${check.rows[0].new_responses}`);
    
  } catch (error) {
    console.error('❌ Crawl failed:', error.response?.data || error.message);
  }
}

async function main() {
  console.log('🚀 OpenAI Test Crawler');
  console.log('======================');
  console.log('Environment:', process.env.NODE_ENV || 'development');
  console.log('Time:', new Date().toISOString());
  console.log('======================\n');
  
  // Test OpenAI API
  const apiWorks = await testOpenAI();
  
  if (!apiWorks) {
    console.log('\n⚠️  OpenAI API not working. Check your API key.');
    await pool.end();
    return;
  }
  
  // Try crawling one domain
  await crawlSingleDomain();
  
  await pool.end();
  console.log('\n✨ Test complete!');
}

main().catch(console.error);