import express from 'express';
import { Pool } from 'pg';
import * as dotenv from 'dotenv';
import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import axios from 'axios';

dotenv.config();

// ============================================================================
// SOPHISTICATED RUNNER - REAL LLM PROCESSING (NO PROCESSOR_ID DEPENDENCIES)
// ============================================================================
// 🎯 Mission: Run parallel to raw-capture-runner with REAL LLM API calls
// 🎯 Strategy: Pure cheap + middle tier models (no expensive models yet)  
// 🎯 Database: SAME EXACT schema as raw-capture-runner - NO processor_id!
// 🎯 FORCE DEPLOY: 2025-06-09T23:49:00Z - Fixed processor_id caching issue
// ============================================================================

console.log('🚀 SOPHISTICATED RUNNER STARTING');
console.log('   Service ID: sophisticated_v1');
console.log('   Mode: sophisticated_parallel');
console.log('   Parallel to: raw-capture-runner');

const SERVICE_ID = 'sophisticated_v1';
const SERVICE_MODE = 'sophisticated_parallel';

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

// Dual API key clients (copied from raw-capture-runner architecture)  
const openaiClients = [
  new OpenAI({ apiKey: process.env.OPENAI_API_KEY }),
  new OpenAI({ apiKey: process.env.OPENAI_API_KEY_2 })
].filter(client => client.apiKey);

const anthropicClients = [
  new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY }),  
  new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY_2 })
].filter(client => client.apiKey);

function getOpenAIClient(): OpenAI {
  return openaiClients[Math.floor(Math.random() * openaiClients.length)];
}

function getAnthropicClient(): Anthropic {
  return anthropicClients[Math.floor(Math.random() * anthropicClients.length)];
}

// Other API clients
const deepseekClient = axios.create({
  baseURL: 'https://api.deepseek.com/v1',
  headers: {
    'Authorization': `Bearer ${process.env.DEEPSEEK_API_KEY}`,
    'Content-Type': 'application/json'
  }
});

const togetherClient = axios.create({
  baseURL: 'https://api.together.xyz/v1',
  headers: {
    'Authorization': `Bearer ${process.env.TOGETHER_API_KEY}`,
    'Content-Type': 'application/json'
  }
});

const mistralClient = axios.create({
  baseURL: 'https://api.mistral.ai/v1',
  headers: {
    'Authorization': `Bearer ${process.env.MISTRAL_API_KEY}`,
    'Content-Type': 'application/json'
  }
});

const googleClient = axios.create({
  baseURL: 'https://generativelanguage.googleapis.com/v1beta',
  headers: {
    'Content-Type': 'application/json'
  }
});

const grokClient = axios.create({
  baseURL: 'https://api.x.ai/v1',
  headers: {
    'Authorization': `Bearer ${process.env.XAI_API_KEY}`,
    'Content-Type': 'application/json'
  },
  timeout: 30000
});

// 🎯 COST-OPTIMIZED MODEL SELECTION (Cheap + Middle Tier Only)
const ULTRA_CHEAP_MODELS = [
  'claude-3-haiku-20240307',      // Champion: $0.00000025
  'deepseek-chat',                // Ultra-competitive: $0.000002
  'gpt-4o-mini',                  // OpenAI baseline: $0.0000015
  'meta-llama/Meta-Llama-3-8B-Instruct', // Together AI: $0.0000008
];

const MIDDLE_TIER_MODELS = [
  'gpt-3.5-turbo',               // Reliable workhorse: $0.000001
  'mistral-small-latest',        // European alt: $0.000002  
  'gemini-1.5-flash',           // Google fast: $0.00000025
  'grok-beta',                   // Alternative perspective
];

// Combined model pool (ultra-cheap prioritized)
const ALL_AVAILABLE_MODELS = [...ULTRA_CHEAP_MODELS, ...MIDDLE_TIER_MODELS];

function selectOptimalModel(): string {
  // Priority: ultra-cheap first, then middle tier
  return ULTRA_CHEAP_MODELS[Math.floor(Math.random() * ULTRA_CHEAP_MODELS.length)];
}

// Real LLM API call function (ported from raw-capture-runner)
async function callLLM(model: string, prompt: string, domain: string): Promise<{
  response: string;
  tokenUsage: any;
  cost: number;
  latency: number;
}> {
  const startTime = Date.now();
  
  try {
    if (model.includes('gpt')) {
      const selectedOpenAI = getOpenAIClient();
      const completion = await selectedOpenAI.chat.completions.create({
        model: model,
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 1000,
        temperature: 0.7
      });
      
      const latency = Date.now() - startTime;
      const usage = completion.usage || {};
      
      const promptTokens = (usage as any)?.prompt_tokens || 0;
      const completionTokens = (usage as any)?.completion_tokens || 0;
      
      let cost = 0;
      if (model === 'gpt-4o-mini') {
        cost = promptTokens * 0.0000015 + completionTokens * 0.000002;
      } else if (model === 'gpt-3.5-turbo') {
        cost = promptTokens * 0.000001 + completionTokens * 0.000002;
      } else {
        cost = promptTokens * 0.0000015 + completionTokens * 0.000002; // Default fallback
      }
      
      return {
        response: completion.choices[0]?.message?.content || 'No response',
        tokenUsage: usage,
        cost: cost,
        latency: latency
      };
      
    } else if (model.includes('claude')) {
      const selectedAnthropic = getAnthropicClient();
      const message = await selectedAnthropic.messages.create({
        model: model,
        max_tokens: 1000,
        temperature: 0.7,
        messages: [{ role: 'user', content: prompt }]
      });
      
      const latency = Date.now() - startTime;
      const usage = message.usage || {};
      
      const inputTokens = (usage as any)?.input_tokens || 0;
      const outputTokens = (usage as any)?.output_tokens || 0;
      
      let cost = 0;
      if (model.includes('haiku')) {
        cost = inputTokens * 0.00000025 + outputTokens * 0.00000125; // Claude 3 Haiku champion!
      } else {
        cost = inputTokens * 0.000003 + outputTokens * 0.000015; // Default Claude pricing
      }
      
      return {
        response: message.content[0]?.type === 'text' ? message.content[0].text : 'No response',
        tokenUsage: usage,
        cost: cost,
        latency: latency
      };
      
    } else if (model.includes('deepseek')) {
      const response = await deepseekClient.post('/chat/completions', {
        model: model,
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 1000,
        temperature: 0.7
      });
      
      const latency = Date.now() - startTime;
      const usage = (response.data as any).usage || {};
      const promptTokens = usage.prompt_tokens || 0;
      const completionTokens = usage.completion_tokens || 0;
      
      const cost = promptTokens * 0.000002 + completionTokens * 0.000006; // DeepSeek ultra-cheap
      
      return {
        response: (response.data as any).choices[0]?.message?.content || 'No response',
        tokenUsage: usage,
        cost: cost,
        latency: latency
      };
      
    } else if (model.includes('meta-llama') || model.includes('Meta-Llama')) {
      const response = await togetherClient.post('/chat/completions', {
        model: model,
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 1000,
        temperature: 0.7
      });
      
      const latency = Date.now() - startTime;
      const usage = (response.data as any).usage || {};
      const promptTokens = usage.prompt_tokens || 0;
      const completionTokens = usage.completion_tokens || 0;
      
      const cost = promptTokens * 0.0000008 + completionTokens * 0.000001; // Ultra-budget Together AI
      
      return {
        response: (response.data as any).choices[0]?.message?.content || 'No response',
        tokenUsage: usage,
        cost: cost,
        latency: latency
      };
      
    } else if (model.includes('mistral')) {
      const response = await mistralClient.post('/chat/completions', {
        model: model,
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 1000,
        temperature: 0.7
      });
      
      const latency = Date.now() - startTime;
      const usage = (response.data as any).usage || {};
      const promptTokens = usage.prompt_tokens || 0;
      const completionTokens = usage.completion_tokens || 0;
      
      const cost = promptTokens * 0.000002 + completionTokens * 0.000006; // Mistral Small pricing
      
      return {
        response: (response.data as any).choices[0]?.message?.content || 'No response',
        tokenUsage: usage,
        cost: cost,
        latency: latency
      };
      
    } else if (model.includes('gemini')) {
      const response = await googleClient.post(`/models/${model}:generateContent?key=${process.env.GOOGLE_API_KEY}`, {
        contents: [{
          parts: [{ text: prompt }]
        }],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 1000
        }
      });
      
      const latency = Date.now() - startTime;
      const usage = (response.data as any).usageMetadata || {};
      const promptTokens = usage.promptTokenCount || 0;
      const completionTokens = usage.candidatesTokenCount || 0;
      
      const cost = promptTokens * 0.00000025 + completionTokens * 0.000001; // Gemini Flash pricing
      
      return {
        response: (response.data as any).candidates?.[0]?.content?.parts?.[0]?.text || 'No response',
        tokenUsage: usage,
        cost: cost,
        latency: latency
      };
      
    } else if (model.includes('grok')) {
      const response = await grokClient.post('/chat/completions', {
        model: model,
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 1000,
        temperature: 0.7
      });
      
      const latency = Date.now() - startTime;
      const usage = (response.data as any).usage || {};
      const promptTokens = usage.prompt_tokens || 0;
      const completionTokens = usage.completion_tokens || 0;
      
      const cost = promptTokens * 0.000005 + completionTokens * 0.000015; // Grok pricing estimate
      
      return {
        response: (response.data as any).choices[0]?.message?.content || 'No response',
        tokenUsage: usage,
        cost: cost,
        latency: latency
      };
      
    } else {
      throw new Error(`Unsupported model: ${model}`);
    }
    
  } catch (error) {
    console.error(`❌ LLM API error for ${model}:`, error);
    throw error;
  }
}

// 500+ Premium Domains for Business Intelligence Analysis (subset for testing)
const PREMIUM_DOMAINS = [
  // AI/ML Companies (Tier 1)
  'openai.com', 'anthropic.com', 'deepmind.com', 'huggingface.co',
  'stability.ai', 'replicate.com', 'runway.ml', 'midjourney.com',
  'character.ai', 'elevenlabs.io', 'synthesia.io', 'jasper.ai',
  'perplexity.ai', 'scale.com', 'databricks.com', 'weights-biases.com',
  
  // Cloud Infrastructure (Tier 1)
  'aws.amazon.com', 'cloud.google.com', 'azure.microsoft.com',
  'digitalocean.com', 'vultr.com', 'linode.com', 'cloudflare.com',
  'vercel.com', 'netlify.com', 'railway.app', 'render.com',
  'heroku.com', 'fly.io', 'planetscale.com', 'supabase.com',
  
  // SaaS Leaders (Tier 1)
  'salesforce.com', 'hubspot.com', 'slack.com', 'notion.so',
  'airtable.com', 'asana.com', 'monday.com', 'zendesk.com',
  'intercom.com', 'mailchimp.com', 'canva.com', 'figma.com',
  
  // Fintech (Tier 1)
  'stripe.com', 'square.com', 'plaid.com', 'coinbase.com',
  'robinhood.com', 'brex.com', 'ramp.com', 'mercury.com',
  'wise.com', 'chime.com', 'affirm.com', 'klarna.com',
  
  // E-commerce (Tier 1)
  'shopify.com', 'amazon.com', 'woocommerce.com', 'bigcommerce.com',
  'magento.com', 'etsy.com', 'ebay.com', 'alibaba.com',
  
  // Development Tools (Tier 1)
  'github.com', 'gitlab.com', 'docker.com', 'kubernetes.io',
  'terraform.io', 'postman.com', 'jetbrains.com', 'atlassian.com',
];

class SophisticatedRunner {
  private domains: string[];
  
  constructor() {
    this.domains = PREMIUM_DOMAINS;
    console.log(`✅ Sophisticated Runner initialized with ${this.domains.length} domains`);
  }

  async seedDomains(): Promise<void> {
    console.log('🌱 Seeding premium domains...');
    let inserted = 0;
    let skipped = 0;
    
    for (const domain of this.domains) {
      try {
        // Use exact same schema as raw-capture-runner - NO processor_id
        const result = await pool.query(`
          INSERT INTO domains (domain, status, created_at) 
          VALUES ($1, 'pending', NOW())
          ON CONFLICT (domain) DO NOTHING
          RETURNING id
        `, [domain]);
        
        if (result.rows.length > 0) {
          inserted++;
        } else {
          skipped++;
        }
      } catch (error) {
        // Skip duplicates or errors
        skipped++;
      }
    }
    
    console.log(`✅ Seeded ${inserted} domains`);
  }

  async processNextBatch(): Promise<void> {
    try {
      // Query pending domains using exact same logic as raw-capture-runner - NO processor_id filtering
      const result = await pool.query(`
        SELECT id, domain FROM domains 
        WHERE status = 'pending'
        ORDER BY created_at ASC
        LIMIT 1
      `);

      if (result.rows.length === 0) {
        console.log('✅ No pending domains available');
        return;
      }

      const { id, domain } = result.rows[0];
      console.log(`🎯 Processing: ${domain} (${SERVICE_ID})`);

      // Mark as processing - same as raw-capture-runner
      await pool.query(
        'UPDATE domains SET status = $1, last_processed_at = NOW() WHERE id = $2',
        ['processing', id]
      );

      // Select optimal model (cost-optimized)
      const selectedModel = selectOptimalModel();

      // Create sophisticated prompt
      const prompt = `Analyze the business intelligence value of ${domain}. Provide insights on:
1. Primary business model and revenue streams
2. Key technology stack and competitive advantages  
3. Market position and growth trajectory
4. Strategic partnerships and ecosystem
5. Future opportunities and risks

Focus on actionable business intelligence for investment and partnership decisions.`;

      // Make real LLM API call
      const llmResult = await callLLM(selectedModel, prompt, domain);
      
      // Store response using EXACT same schema as raw-capture-runner - NO processor_id
      await pool.query(`
        INSERT INTO responses (
          domain_id, model, prompt_type, interpolated_prompt, 
          raw_response, token_count, prompt_tokens, completion_tokens,
          token_usage, total_cost_usd, latency_ms, captured_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW())
      `, [
        id, selectedModel, 'business_intelligence', prompt, llmResult.response,
        (llmResult.tokenUsage.total_tokens || llmResult.tokenUsage.prompt_tokens + llmResult.tokenUsage.completion_tokens || 0),
        (llmResult.tokenUsage.prompt_tokens || llmResult.tokenUsage.input_tokens || 0),
        (llmResult.tokenUsage.completion_tokens || llmResult.tokenUsage.output_tokens || 0),
        JSON.stringify(llmResult.tokenUsage), llmResult.cost, llmResult.latency
      ]);

      // Mark as completed - same as raw-capture-runner
      await pool.query(
        'UPDATE domains SET status = $1, last_processed_at = NOW() WHERE id = $2',
        ['completed', id]
      );

      console.log(`✅ Completed: ${domain} (${SERVICE_ID})`);
      
    } catch (error) {
      console.error('❌ Processing error:', error);
      
      // Reset failed domains for retry - same as raw-capture-runner
      try {
        await pool.query(
          'UPDATE domains SET status = $1 WHERE status = $2',
          ['pending', 'processing']
        );
      } catch (resetError) {
        console.error('❌ Failed to reset domain status:', resetError);
      }
    }
  }

  async getStatus(): Promise<any> {
    try {
      // Status query without processor_id - all domains visible to both services
      const statusResult = await pool.query(`
        SELECT status, COUNT(*) as count
        FROM domains 
        GROUP BY status
      `);

      // Responses without processor_id filtering  
      const costResult = await pool.query(`
        SELECT 
          COUNT(*) as total_responses,
          SUM(total_cost_usd) as total_cost,
          AVG(total_cost_usd) as avg_cost,
          AVG(latency_ms) as avg_latency,
          COUNT(DISTINCT model) as models_used
        FROM responses 
        WHERE prompt_type = 'business_intelligence'
      `);

      return {
        service: 'sophisticated-runner',
        service_id: SERVICE_ID,
        mode: SERVICE_MODE,
        strategy: 'Real LLM Processing - Cheap + Middle Tier',
        status_breakdown: statusResult.rows,
        performance_metrics: costResult.rows[0] || {},
        model_tiers: {
          ultra_cheap: ULTRA_CHEAP_MODELS,
          middle_tier: MIDDLE_TIER_MODELS,
          expensive_tier: 'Not implemented yet'
        },
        parallel_to: 'raw-capture-runner',
        database_schema: 'Same as raw-capture-runner - no processor_id'
      };
    } catch (error) {
      return { error: (error as Error).message };
    }
  }

  // 🚀 Main processing loop (FIXED: NO INFINITE MONEY BURNING!)
  public async startProcessing(): Promise<void> {
    console.log('🚀 Starting sophisticated LLM processing loop...');
    
    const processLoop = async (): Promise<void> => {
      try {
        await this.processNextBatch();
        
        // 🔍 Check if more domains remain BEFORE scheduling next iteration
        const pendingCheck = await pool.query(`SELECT COUNT(*) as count FROM domains WHERE status = 'pending'`);
        const pendingCount = parseInt(pendingCheck.rows[0].count);
        
        if (pendingCount > 0) {
          console.log(`🔄 ${pendingCount} domains remaining - continuing processing...`);
          setTimeout(processLoop, 10000); // Continue processing
        } else {
          console.log('🎉 ALL DOMAINS PROCESSED! No more pending domains - STOPPING INFINITE LOOP!');
          console.log('💰 Sophisticated processing complete - no more API costs will be incurred');
          console.log('🏁 Service will remain running for API endpoints, but no more LLM processing');
          // NO MORE setTimeout - STOP THE LOOP!
        }
        
      } catch (error) {
        console.error('❌ Processing loop error:', error);
        
        // Even on error, check if we should continue
        try {
          const pendingCheck = await pool.query(`SELECT COUNT(*) as count FROM domains WHERE status = 'pending'`);
          const pendingCount = parseInt(pendingCheck.rows[0].count);
          
          if (pendingCount > 0) {
            console.log(`🔄 Error occurred but ${pendingCount} domains remain - retrying in 10 seconds...`);
            setTimeout(processLoop, 10000);
          } else {
            console.log('🛑 No pending domains found after error - STOPPING LOOP');
          }
        } catch (checkError) {
          console.error('❌ Failed to check pending domains after error:', checkError);
          console.log('🛑 STOPPING LOOP due to database check failure');
        }
      }
    };
    
    // Start the (now finite) processing loop
    processLoop();
  }
}

// Express API for health checks and monitoring
const app = express();
const port = process.env.PORT || 10000;

app.get('/', (req, res) => {
  res.json({
    service: 'sophisticated-runner',
    status: 'running',
    mode: SERVICE_MODE,
    service_id: SERVICE_ID,
    strategy: 'Real LLM Processing - Cost Optimized',
    parallel_to: 'raw-capture-runner',
    message: 'Sophisticated runner with real LLM API calls - no processor_id dependencies',
    database_compatibility: 'Full compatibility with raw-capture-runner schema'
  });
});

app.get('/status', async (req, res) => {
  const runner = new SophisticatedRunner();
  const status = await runner.getStatus();
  res.json(status);
});

app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    service_id: SERVICE_ID,
    database_schema: 'Compatible with raw-capture-runner',
    api_keys_configured: {
      openai: openaiClients.length,
      anthropic: anthropicClients.length,
      deepseek: !!process.env.DEEPSEEK_API_KEY,
      together: !!process.env.TOGETHER_API_KEY,
      mistral: !!process.env.MISTRAL_API_KEY,
      google: !!process.env.GOOGLE_API_KEY,
      grok: !!process.env.XAI_API_KEY
    }
  });
});

// Main execution
async function main() {
  try {
    console.log('🔍 Testing database connection...');
    await pool.query('SELECT 1');
    console.log('✅ Database connected');

    const runner = new SophisticatedRunner();
    await runner.seedDomains();

    // Start real LLM processing loop
    await runner.startProcessing();

    app.listen(port, () => {
      console.log(`🌐 Sophisticated Runner running on port ${port}`);
      console.log('🎯 Ready to prove equivalence!');
    });

  } catch (error) {
    console.error('❌ Startup failed:', error);
    process.exit(1);
  }
}

main().catch(console.error); 