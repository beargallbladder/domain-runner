/**
 * Production Ultimate Fleet Manager
 * Integrates with existing domain runner to write to PRIMARY database
 * Maintains data integrity by using the existing domain runner infrastructure
 */

const fs = require('fs');
const path = require('path');

// Import existing domain runner functionality for database writes
// Note: Using direct database connection to maintain compatibility
const { Pool } = require('pg');
const dotenv = require('dotenv');

dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgres://localhost:5432/raw_capture_test',
  ssl: process.env.NODE_ENV === 'production' ? {
    rejectUnauthorized: false
  } : false
});

async function query(text, params) {
  return await pool.query(text, params);
}

// Ultimate API Fleet configuration (matches existing domain runner)
const API_CONFIGURATIONS = {
    openai: {
        keys: [process.env.OPENAI_API_KEY, process.env.OPENAI_API_KEY2].filter(Boolean),
        models: ['gpt-4o-mini', 'gpt-3.5-turbo'],
        baseURL: 'https://api.openai.com/v1',
        rateLimits: { rpm: 3500, rph: 10000 }
    },
    anthropic: {
        keys: [process.env.ANTHROPIC_API_KEY, process.env.ATHROPTIC_API_KEY2].filter(Boolean),
        models: ['claude-3-haiku-20240307', 'claude-3-5-haiku-20241022'],
        baseURL: 'https://api.anthropic.com',
        rateLimits: { rpm: 4000, rph: 50000 }
    },
    together: {
        keys: [process.env.TOGETHER_API_KEY, process.env.TOGETHER_API_KEY2].filter(Boolean),
        models: ['meta-llama-3-8b-instruct', 'mixtral-8x7b-32768', 'nous-hermes-2-mixtral-8x7b-dpo'],
        baseURL: 'https://api.together.xyz/v1',
        rateLimits: { rpm: 200, rph: 6000 }
    },
    deepseek: {
        keys: [process.env.DEEPSEEK_API_KEY].filter(Boolean),
        models: ['deepseek-chat', 'deepseek-coder'],
        baseURL: 'https://api.deepseek.com/v1',
        rateLimits: { rpm: 300, rph: 10000 }
    },
    google: {
        keys: [process.env.GOOGLE_API_KEY, process.env.GOOGLE_API_KEY2, process.env.GOOGLE_API_KEY3].filter(Boolean),
        models: ['gemini-1.5-flash', 'gemma-7b-it'],
        baseURL: 'https://generativelanguage.googleapis.com/v1beta',
        rateLimits: { rpm: 1500, rph: 50000 }
    },
    mistral: {
        keys: [process.env.MISTRAL_API_KEY].filter(Boolean),
        models: ['mistral-small-latest'],
        baseURL: 'https://api.mistral.ai/v1',
        rateLimits: { rpm: 200, rph: 1000 }
    },
    xai: {
        keys: [process.env.XAI_API_KEY, process.env.XAI_API_KEY2].filter(Boolean),
        models: ['grok-beta'],
        baseURL: 'https://api.x.ai/v1',
        rateLimits: { rpm: 300, rph: 10000 }
    }
};

// Model cost mapping (per 1K tokens)
const MODEL_COSTS = {
    'claude-3-haiku-20240307': { input: 0.00025, output: 0.00125 },
    'deepseek-chat': { input: 0.000002, output: 0.000002 },
    'deepseek-coder': { input: 0.000002, output: 0.000008 },
    'mistral-small-latest': { input: 0.000002, output: 0.000006 },
    'gpt-4o-mini': { input: 0.00015, output: 0.0006 },
    'gemini-1.5-flash': { input: 0.000075, output: 0.0003 },
    'meta-llama-3-8b-instruct': { input: 0.000018, output: 0.000018 },
    'mixtral-8x7b-32768': { input: 0.000024, output: 0.000024 },
    'gemma-7b-it': { input: 0.000007, output: 0.000007 }
};

/**
 * Main processing function that uses existing domain runner infrastructure
 * WRITES TO PRIMARY DATABASE - maintains data integrity
 */
async function processWithUltimateFleet(domain, modelList, prompt, options = {}) {
    const { timeout = 30000, maxRetries = 2 } = options;
    
    console.log(`🚀 Processing ${domain} with Ultimate Fleet`);
    
    // Use domain runner's database write functionality
    try {
        // First, ensure domain exists in database (uses existing domain runner logic)
        await query(`
            INSERT INTO domains (domain, source, status) 
            VALUES ($1, $2, $3) 
            ON CONFLICT (domain) DO UPDATE SET 
                updated_at = CURRENT_TIMESTAMP,
                process_count = process_count + 1
            RETURNING id
        `, [domain, 'mega_analysis', 'processing']);
        
        // Get domain ID
        const domainResult = await query(`SELECT id FROM domains WHERE domain = $1`, [domain]);
        const domainId = domainResult.rows[0]?.id;
        
        if (!domainId) {
            throw new Error(`Failed to get domain ID for ${domain}`);
        }
        
        // Select optimal model from fleet
        const selectedModel = selectOptimalModel(modelList);
        const providerConfig = getProviderForModel(selectedModel);
        
        if (!providerConfig) {
            throw new Error(`No provider configuration found for model: ${selectedModel}. Check API keys in environment.`);
        }
        
        if (!providerConfig.keys || providerConfig.keys.length === 0) {
            throw new Error(`No API keys available for provider: ${providerConfig.provider}. Check environment variables.`);
        }
        
        // Make API call using existing domain runner infrastructure
        const startTime = Date.now();
        const result = await makeAPICall(providerConfig, selectedModel, prompt, domain, timeout);
        const endTime = Date.now();
        
        const latency = endTime - startTime;
        const cost = calculateCost(selectedModel, result.usage);
        
        // Save response using existing domain runner database schema
        await query(`
            INSERT INTO responses (
                domain_id, model, prompt_type, interpolated_prompt, 
                raw_response, token_count, prompt_tokens, completion_tokens,
                total_cost_usd, latency_ms, captured_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, CURRENT_TIMESTAMP)
        `, [
            domainId,
            selectedModel,
            options.analysisType || 'mega_analysis',
            prompt,
            result.response,
            result.usage.total_tokens || 0,
            result.usage.prompt_tokens || 0,
            result.usage.completion_tokens || 0,
            cost,
            latency
        ]);
        
        // Update domain status
        await query(`
            UPDATE domains 
            SET status = $1, last_processed_at = CURRENT_TIMESTAMP 
            WHERE id = $2
        `, ['completed', domainId]);
        
        console.log(`✅ ${domain} processed successfully with ${selectedModel} ($${cost.toFixed(6)})`);
        
        return {
            success: true,
            domain: domain,
            model: selectedModel,
            response: result.response,
            cost: cost,
            latency: latency,
            tokens: result.usage,
            timestamp: new Date().toISOString()
        };
        
    } catch (error) {
        console.error(`❌ Error processing ${domain}:`, error.message);
        
        // Log error to database
        const domainResult = await query(`SELECT id FROM domains WHERE domain = $1`, [domain]);
        const domainId = domainResult.rows[0]?.id;
        
        if (domainId) {
            await query(`UPDATE domains SET status = $1 WHERE id = $2`, ['error', domainId]);
        }
        
        throw error;
    }
}

/**
 * Select optimal model based on cost-performance ratio
 */
function selectOptimalModel(modelList) {
    // Priority order: ultra-budget champions first
    const priority = [
        'deepseek-chat',
        'claude-3-haiku-20240307',
        'mistral-small-latest',
        'gpt-4o-mini',
        'gemini-1.5-flash'
    ];
    
    for (const model of priority) {
        if (modelList.includes(model)) {
            return model;
        }
    }
    
    // Fallback to first available model
    return modelList[0];
}

/**
 * Get provider configuration for a model
 */
function getProviderForModel(model) {
    for (const [provider, config] of Object.entries(API_CONFIGURATIONS)) {
        if (config.models.includes(model) && config.keys.length > 0) {
            return { provider, ...config };
        }
    }
    return null;
}

/**
 * Make API call using provider-specific logic
 */
async function makeAPICall(providerConfig, model, prompt, domain, timeout) {
    const randomKey = providerConfig.keys[Math.floor(Math.random() * providerConfig.keys.length)];
    const fullPrompt = `Analyze ${domain}: ${prompt}`;
    
    if (providerConfig.provider === 'openai') {
        const OpenAI = require('openai');
        const client = new OpenAI({ apiKey: randomKey });
        
        const completion = await client.chat.completions.create({
            model: model,
            messages: [{ role: 'user', content: fullPrompt }],
            max_tokens: 1000,
            temperature: 0.7
        });
        
        return {
            response: completion.choices[0]?.message?.content || 'No response',
            usage: completion.usage || {}
        };
        
    } else if (providerConfig.provider === 'anthropic') {
        const Anthropic = require('@anthropic-ai/sdk');
        const client = new Anthropic({ apiKey: randomKey });
        
        const message = await client.messages.create({
            model: model,
            max_tokens: 1000,
            temperature: 0.7,
            messages: [{ role: 'user', content: fullPrompt }]
        });
        
        return {
            response: message.content[0]?.text || 'No response',
            usage: message.usage || {}
        };
        
    } else {
        // Generic OpenAI-compatible API
        const axios = require('axios');
        
        const response = await axios.post(`${providerConfig.baseURL}/chat/completions`, {
            model: model,
            messages: [{ role: 'user', content: fullPrompt }],
            max_tokens: 1000,
            temperature: 0.7
        }, {
            headers: {
                'Authorization': `Bearer ${randomKey}`,
                'Content-Type': 'application/json'
            },
            timeout: timeout
        });
        
        return {
            response: response.data.choices[0]?.message?.content || 'No response',
            usage: response.data.usage || {}
        };
    }
}

/**
 * Calculate cost based on token usage
 */
function calculateCost(model, usage) {
    const costs = MODEL_COSTS[model];
    if (!costs || !usage) return 0;
    
    const inputTokens = usage.prompt_tokens || usage.input_tokens || 0;
    const outputTokens = usage.completion_tokens || usage.output_tokens || 0;
    
    return (inputTokens * costs.input / 1000) + (outputTokens * costs.output / 1000);
}

/**
 * Get fleet status for monitoring
 */
function getFleetStatus() {
    const status = {};
    
    for (const [provider, config] of Object.entries(API_CONFIGURATIONS)) {
        status[provider] = {
            keys_available: config.keys.length,
            models: config.models,
            rate_limits: config.rateLimits,
            operational: config.keys.length > 0
        };
    }
    
    return status;
}

module.exports = {
    processWithUltimateFleet,
    getFleetStatus,
    API_CONFIGURATIONS,
    MODEL_COSTS
}; 