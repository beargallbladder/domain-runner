#!/usr/bin/env node

/**
 * 🚀 ULTRA-FAST TIERED PROCESSING TRIGGER
 * 
 * This script triggers the new ultra-fast processing system that:
 * - Processes 50 domains at once (vs previous 10)
 * - Uses tiered API batching (Fast/Medium/Slow)
 * - Rotates through multiple API keys for load balancing
 * - Eliminates unnecessary delays between calls
 */

const https = require('https');

const SOPHISTICATED_RUNNER_URL = 'https://sophisticated-runner.onrender.com/ultra-fast-process';

async function triggerUltraFastProcessing() {
  console.log('🚀 TRIGGERING ULTRA-FAST TIERED PROCESSING');
  console.log('⚡ Fast Tier: DeepSeek, Together, XAI, Perplexity (no delays)');
  console.log('🔥 Medium Tier: OpenAI, Mistral (minimal delays)');
  console.log('🎯 Slow Tier: Anthropic, Google (controlled delays)');
  console.log('🔑 Using multiple API keys with rotation');
  console.log('📦 Processing 50 domains per batch\n');

  const startTime = Date.now();
  let totalProcessed = 0;
  let batchCount = 0;

  try {
    // Run multiple batches to process all pending domains
    while (true) {
      batchCount++;
      console.log(`--- BATCH ${batchCount} ---`);
      
      const result = await makeRequest();
      
      if (result.processed === 0) {
        console.log('✅ No more pending domains to process');
        break;
      }
      
      totalProcessed += result.processed;
      console.log(`✅ Batch ${batchCount}: ${result.processed}/${result.total} domains processed`);
      console.log(`📊 Total processed so far: ${totalProcessed} domains`);
      
      // Small delay between batches to prevent overwhelming the system
      if (result.processed > 0) {
        console.log('⏳ Waiting 10 seconds before next batch...\n');
        await new Promise(resolve => setTimeout(resolve, 10000));
      }
    }
    
    const endTime = Date.now();
    const totalTime = ((endTime - startTime) / 1000 / 60).toFixed(2);
    
    console.log('\n🎉 ULTRA-FAST PROCESSING COMPLETED!');
    console.log(`📊 Total domains processed: ${totalProcessed}`);
    console.log(`⏱️  Total time: ${totalTime} minutes`);
    console.log(`🚀 Average speed: ${(totalProcessed / parseFloat(totalTime)).toFixed(1)} domains/minute`);
    
  } catch (error) {
    console.error('❌ Ultra-fast processing failed:', error.message);
    process.exit(1);
  }
}

function makeRequest() {
  return new Promise((resolve, reject) => {
    const options = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      timeout: 300000 // 5 minute timeout
    };

    const req = https.request(SOPHISTICATED_RUNNER_URL, options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const result = JSON.parse(data);
          resolve(result);
        } catch (parseError) {
          reject(new Error(`Failed to parse response: ${data}`));
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timed out'));
    });

    req.end();
  });
}

// Add instructions for adding more API keys
console.log('💡 TO ADD MORE API KEYS FOR EVEN FASTER PROCESSING:');
console.log('   Add these environment variables to your Render service:');
console.log('   - OPENAI_API_KEY_2, OPENAI_API_KEY_3, OPENAI_API_KEY_4');
console.log('   - DEEPSEEK_API_KEY_2, DEEPSEEK_API_KEY_3');
console.log('   - TOGETHER_API_KEY_2, TOGETHER_API_KEY_3');
console.log('   - XAI_API_KEY_2, PERPLEXITY_API_KEY_2');
console.log('   - ANTHROPIC_API_KEY_2, MISTRAL_API_KEY_2');
console.log('   - GOOGLE_API_KEY_2\n');

triggerUltraFastProcessing(); 