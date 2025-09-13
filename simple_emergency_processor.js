#!/usr/bin/env node

const { Pool } = require('pg');
const https = require('https');
const { URL } = require('url');

// Use the working database connection
const DATABASE_URL = 'postgresql://raw_capture_db_user:wjFesUM8ISNEvE2b4kZtRAKgGYJVtKK5@dpg-d11fqgndiees73fb35dg-a.oregon-postgres.render.com/raw_capture_db';

const PROMPT_TEMPLATES = {
  business_analysis: (domain) => `Analyze the business model and market position of ${domain}. Provide insights on their competitive advantages, target market, and strategic positioning.`,
  content_strategy: (domain) => `Evaluate the content strategy and brand messaging of ${domain}. How do they communicate their value proposition?`,
  technical_assessment: (domain) => `Assess the technical capabilities and innovation focus of ${domain}. What technologies do they leverage?`
};

// Simple OpenAI API call using https module
async function callOpenAI(model, prompt, apiKey) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify({
      model: model,
      messages: [
        { role: "system", content: "You are a business intelligence analyst." },
        { role: "user", content: prompt }
      ],
      max_tokens: 500,
      temperature: 0.3
    });

    const options = {
      hostname: 'api.openai.com',
      port: 443,
      path: '/v1/chat/completions',
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data)
      }
    };

    const req = https.request(options, (res) => {
      let responseData = '';
      
      res.on('data', (chunk) => {
        responseData += chunk;
      });
      
      res.on('end', () => {
        try {
          const result = JSON.parse(responseData);
          if (result.choices && result.choices[0]) {
            resolve({
              responseText: result.choices[0].message.content,
              tokenCount: result.usage?.total_tokens || 500
            });
          } else {
            reject(new Error(`Invalid response: ${responseData}`));
          }
        } catch (error) {
          reject(new Error(`Parse error: ${error.message}`));
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    req.write(data);
    req.end();
  });
}

async function processNextBatch() {
  console.log('🚀 SIMPLE EMERGENCY PROCESSOR - Starting batch processing...');
  
  // Check for OpenAI API key
  if (!process.env.OPENAI_API_KEY) {
    console.error('❌ OPENAI_API_KEY environment variable is required');
    console.log('Set it with: export OPENAI_API_KEY=your_key_here');
    process.exit(1);
  }
  
  console.log('🔑 Using OpenAI API with models: gpt-4o-mini, gpt-3.5-turbo');
  
  const pool = new Pool({
    connectionString: DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    // Get 20 pending domains for reasonable batch size
    const pendingDomains = await pool.query(`
      SELECT id, domain
      FROM domains
      WHERE status = 'pending'
      ORDER BY last_processed_at ASC NULLS FIRST
      LIMIT 20
    `);

    if (pendingDomains.rows.length === 0) {
      console.log('🎉 NO MORE PENDING DOMAINS!');
      await pool.end();
      return;
    }

    console.log(`🔄 Processing ${pendingDomains.rows.length} domains...`);

    const models = ['gpt-4o-mini', 'gpt-3.5-turbo'];

    // Process each domain
    for (const domain of pendingDomains.rows) {
      console.log(`📝 Processing: ${domain.domain}`);
      
      // Update to processing
      await pool.query(`
        UPDATE domains 
        SET status = 'processing', 
            last_processed_at = CURRENT_TIMESTAMP,
            updated_at = CURRENT_TIMESTAMP,
            process_count = process_count + 1
        WHERE id = $1
      `, [domain.id]);

      try {
        let successCount = 0;
        
        // Process with each model and prompt type
        for (const model of models) {
          for (const [promptType, promptTemplate] of Object.entries(PROMPT_TEMPLATES)) {
            try {
              console.log(`  🤖 ${model} → ${promptType}`);
              
              const prompt = promptTemplate(domain.domain);
              const result = await callOpenAI(model, prompt, process.env.OPENAI_API_KEY);
              
              // Save response
              await pool.query(`
                INSERT INTO domain_responses (domain_id, model, prompt_type, response, token_count, created_at)
                VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)
              `, [domain.id, model, promptType, result.responseText, result.tokenCount]);

              console.log(`    ✅ Saved response (${result.tokenCount} tokens)`);
              successCount++;
              
              // Rate limiting to be respectful
              await new Promise(resolve => setTimeout(resolve, 1000));
              
            } catch (error) {
              console.error(`    ❌ Error with ${model}/${promptType}:`, error.message);
            }
          }
        }

        if (successCount > 0) {
          // Mark as completed
          await pool.query(`
            UPDATE domains 
            SET status = 'completed',
                updated_at = CURRENT_TIMESTAMP
            WHERE id = $1
          `, [domain.id]);

          console.log(`✅ Completed: ${domain.domain} (${successCount} responses)`);
        } else {
          throw new Error('No successful API calls');
        }

      } catch (error) {
        console.error(`❌ Error processing ${domain.domain}:`, error);
        
        // Mark as error
        await pool.query(`
          UPDATE domains 
          SET status = 'error',
              error_count = error_count + 1,
              updated_at = CURRENT_TIMESTAMP
          WHERE id = $1
        `, [domain.id]);
      }
    }

    console.log('🔄 Batch complete. Checking for more domains...');
    
    // Check if more domains remain
    const remainingCheck = await pool.query('SELECT COUNT(*) as count FROM domains WHERE status = $1', ['pending']);
    const remaining = parseInt(remainingCheck.rows[0].count);
    
    console.log(`📊 Remaining pending: ${remaining}`);
    
    if (remaining > 0) {
      console.log('⏳ Waiting 10 seconds before next batch...');
      setTimeout(() => processNextBatch(), 10000);
    } else {
      console.log('🎉 ALL DOMAINS PROCESSED!');
    }

  } catch (error) {
    console.error('❌ Batch processing failed:', error);
  } finally {
    await pool.end();
  }
}

console.log('🚀 SIMPLE EMERGENCY DOMAIN PROCESSOR');
console.log('====================================');
console.log('This will process domains using OpenAI API');
console.log('Processing 20 domains per batch');
console.log('Using models: gpt-4o-mini, gpt-3.5-turbo');
console.log('');

processNextBatch().catch(console.error);