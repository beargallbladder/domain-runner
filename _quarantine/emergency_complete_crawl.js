#!/usr/bin/env node

const { Pool } = require('pg');
require('dotenv').config();

// Validate environment variables
const requiredEnvVars = ['DATABASE_URL', 'OPENAI_API_KEY', 'DEEPSEEK_API_KEY', 'MISTRAL_API_KEY'];
for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    console.error(`Missing required environment variable: ${envVar}`);
    process.exit(1);
  }
}

// Database connection
const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL, 
  ssl: { rejectUnauthorized: false }
});

// API Keys from environment
const API_KEYS = {
  openai: process.env.OPENAI_API_KEY,
  deepseek: process.env.DEEPSEEK_API_KEY,
  mistral: process.env.MISTRAL_API_KEY
};

async function processRemainingDomains() {
  console.log('🚨 EMERGENCY CRAWL COMPLETION STARTING...');
  
  try {
    // Get remaining domains with parameterized query
    const result = await pool.query(
      `SELECT id, domain FROM domains WHERE status = $1 ORDER BY updated_at ASC`,
      ['pending']
    );
    
    console.log(`📊 Found ${result.rows.length} pending domains`);
    
    for (const domainRow of result.rows) {
      console.log(`\n🔄 Processing ${domainRow.domain}...`);
      
      try {
        // Mark as processing
        await pool.query(
          'UPDATE domains SET status = $1, updated_at = NOW() WHERE id = $2',
          ['processing', domainRow.id]
        );
        
        // Process with multiple models
        const models = [
          { provider: 'openai', model: 'gpt-4o-mini', endpoint: 'https://api.openai.com/v1/chat/completions' },
          { provider: 'deepseek', model: 'deepseek-chat', endpoint: 'https://api.deepseek.com/v1/chat/completions' },
          { provider: 'mistral', model: 'mistral-small-latest', endpoint: 'https://api.mistral.ai/v1/chat/completions' }
        ];
        
        const prompts = ['comprehensive_analysis'];
        let successCount = 0;
        
        for (const modelConfig of models) {
          for (const prompt of prompts) {
            try {
              const fetch = (await import('node-fetch')).default;
              const response = await fetch(modelConfig.endpoint, {
                method: 'POST',
                headers: {
                  'Authorization': `Bearer ${API_KEYS[modelConfig.provider]}`,
                  'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                  model: modelConfig.model,
                  messages: [{
                    role: 'user',
                    content: `Provide a comprehensive analysis of ${domainRow.domain} covering: business model, competitive position, market strategy, technical capabilities, content approach, and growth potential. Be detailed and specific.`
                  }],
                  max_tokens: 500
                })
              });
              
              if (response.ok) {
                const data = await response.json();
                const content = data.choices?.[0]?.message?.content || 'No response';
                
                await pool.query(
                  'INSERT INTO domain_responses (domain_id, model, prompt_type, response, created_at) VALUES ($1, $2, $3, $4, NOW())',
                  [domainRow.id, `${modelConfig.provider}/${modelConfig.model}`, prompt, content]
                );
                
                successCount++;
                console.log(`  ✅ ${modelConfig.provider} completed`);
              } else {
                console.log(`  ❌ ${modelConfig.provider} failed: ${response.status}`);
              }
            } catch (error) {
              console.log(`  ❌ ${modelConfig.provider} error: ${error.message}`);
            }
            
            // Small delay between API calls
            await new Promise(resolve => setTimeout(resolve, 1000));
          }
        }
        
        // Mark as completed if we got at least one response
        if (successCount > 0) {
          await pool.query(
            'UPDATE domains SET status = $1, updated_at = NOW() WHERE id = $2',
            ['completed', domainRow.id]
          );
          console.log(`✅ ${domainRow.domain} completed with ${successCount} responses`);
        } else {
          await pool.query(
            'UPDATE domains SET status = $1, updated_at = NOW() WHERE id = $2',
            ['pending', domainRow.id]
          );
          console.log(`⚠️  ${domainRow.domain} failed - reset to pending`);
        }
        
      } catch (error) {
        console.error(`❌ Error processing ${domainRow.domain}:`, error.message);
        await pool.query(
          'UPDATE domains SET status = $1, updated_at = NOW() WHERE id = $2',
          ['pending', domainRow.id]
        );
      }
    }
    
    // Final status check
    const finalStatus = await pool.query(
      `SELECT status, COUNT(*) as count FROM domains GROUP BY status ORDER BY status`
    );
    
    console.log('\n📊 FINAL STATUS:');
    finalStatus.rows.forEach(row => {
      console.log(`  ${row.status}: ${row.count} domains`);
    });
    
  } catch (error) {
    console.error('🚨 CRITICAL ERROR:', error);
  } finally {
    await pool.end();
  }
}

// Run the emergency completion
processRemainingDomains().then(() => {
  console.log('\n✅ EMERGENCY CRAWL COMPLETION FINISHED');
  process.exit(0);
}).catch(error => {
  console.error('🚨 FATAL ERROR:', error);
  process.exit(1);
});