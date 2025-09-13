#!/usr/bin/env node

const { Pool } = require('pg');
const OpenAI = require('openai');

// Use the working database connection
const DATABASE_URL = 'postgresql://raw_capture_db_user:wjFesUM8ISNEvE2b4kZtRAKgGYJVtKK5@dpg-d11fqgndiees73fb35dg-a.oregon-postgres.render.com/raw_capture_db';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// 15 cheapest models from raw-capture-runner
const MODELS = [
  'gpt-4o-mini',
  'gpt-3.5-turbo', 
  'claude-3-haiku-20240307'
  // Adding more models would require other API keys
];

const PROMPT_TEMPLATES = {
  business_analysis: (domain) => `Analyze the business model and market position of ${domain}. Provide insights on their competitive advantages, target market, and strategic positioning.`,
  content_strategy: (domain) => `Evaluate the content strategy and brand messaging of ${domain}. How do they communicate their value proposition?`,
  technical_assessment: (domain) => `Assess the technical capabilities and innovation focus of ${domain}. What technologies do they leverage?`
};

async function processNextBatch() {
  console.log('🚀 EMERGENCY DOMAIN PROCESSOR - Starting batch processing...');
  
  const pool = new Pool({
    connectionString: DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    // Get 5 pending domains
    const pendingDomains = await pool.query(`
      SELECT id, domain
      FROM domains
      WHERE status = 'pending'
      ORDER BY last_processed_at ASC NULLS FIRST
      LIMIT 5
    `);

    if (pendingDomains.rows.length === 0) {
      console.log('🎉 NO MORE PENDING DOMAINS!');
      await pool.end();
      return;
    }

    console.log(`🔄 Processing ${pendingDomains.rows.length} domains...`);

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
        // Process with each model and prompt type
        for (const model of MODELS) {
          for (const [promptType, promptTemplate] of Object.entries(PROMPT_TEMPLATES)) {
            try {
              console.log(`  🤖 ${model} → ${promptType}`);
              
              const prompt = promptTemplate(domain.domain);
              
              // Call OpenAI (only working API key we have)
              const completion = await openai.chat.completions.create({
                model: model,
                messages: [
                  { role: "system", content: "You are a business intelligence analyst." },
                  { role: "user", content: prompt }
                ],
                max_tokens: 500,
                temperature: 0.3
              });

              const response = completion.choices[0].message.content;
              
              // Save response
              await pool.query(`
                INSERT INTO responses (domain_id, model, prompt_type, raw_response, token_count, created_at)
                VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)
              `, [domain.id, model, promptType, response, completion.usage.total_tokens]);

              console.log(`    ✅ Saved response (${completion.usage.total_tokens} tokens)`);
              
              // Rate limiting
              await new Promise(resolve => setTimeout(resolve, 2000));
              
            } catch (error) {
              console.error(`    ❌ Error with ${model}/${promptType}:`, error.message);
            }
          }
        }

        // Mark as completed
        await pool.query(`
          UPDATE domains 
          SET status = 'completed',
              updated_at = CURRENT_TIMESTAMP
          WHERE id = $1
        `, [domain.id]);

        console.log(`✅ Completed: ${domain.domain}`);

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

// Check OpenAI API key
if (!process.env.OPENAI_API_KEY) {
  console.error('❌ OPENAI_API_KEY environment variable is required');
  process.exit(1);
}

console.log('🚀 EMERGENCY DOMAIN PROCESSOR');
console.log('===============================');
console.log('This will process ALL 3,183 pending domains with OpenAI models');
console.log('Estimated cost: ~$50-100');
console.log('Estimated time: 6-12 hours');
console.log('');

processNextBatch().catch(console.error); 