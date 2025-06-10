"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const pg_1 = require("pg");
const dotenv = __importStar(require("dotenv"));
const openai_1 = __importDefault(require("openai"));
const sdk_1 = __importDefault(require("@anthropic-ai/sdk"));
const axios_1 = __importDefault(require("axios"));
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
const pool = new pg_1.Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false
    }
});
// Dual API key clients (copied from raw-capture-runner architecture)  
const openaiClients = [
    new openai_1.default({ apiKey: process.env.OPENAI_API_KEY }),
    new openai_1.default({ apiKey: process.env.OPENAI_API_KEY_2 })
].filter(client => client.apiKey);
const anthropicClients = [
    new sdk_1.default({ apiKey: process.env.ANTHROPIC_API_KEY }),
    new sdk_1.default({ apiKey: process.env.ANTHROPIC_API_KEY_2 })
].filter(client => client.apiKey);
function getOpenAIClient() {
    return openaiClients[Math.floor(Math.random() * openaiClients.length)];
}
function getAnthropicClient() {
    return anthropicClients[Math.floor(Math.random() * anthropicClients.length)];
}
// Other API clients
const deepseekClient = axios_1.default.create({
    baseURL: 'https://api.deepseek.com/v1',
    headers: {
        'Authorization': `Bearer ${process.env.DEEPSEEK_API_KEY}`,
        'Content-Type': 'application/json'
    }
});
const togetherClient = axios_1.default.create({
    baseURL: 'https://api.together.xyz/v1',
    headers: {
        'Authorization': `Bearer ${process.env.TOGETHER_API_KEY}`,
        'Content-Type': 'application/json'
    }
});
const mistralClient = axios_1.default.create({
    baseURL: 'https://api.mistral.ai/v1',
    headers: {
        'Authorization': `Bearer ${process.env.MISTRAL_API_KEY}`,
        'Content-Type': 'application/json'
    }
});
const googleClient = axios_1.default.create({
    baseURL: 'https://generativelanguage.googleapis.com/v1beta',
    headers: {
        'Content-Type': 'application/json'
    }
});
const grokClient = axios_1.default.create({
    baseURL: 'https://api.x.ai/v1',
    headers: {
        'Authorization': `Bearer ${process.env.XAI_API_KEY}`,
        'Content-Type': 'application/json'
    },
    timeout: 30000
});
// 🎯 COST-OPTIMIZED MODEL SELECTION (Cheap + Middle Tier Only)
const ULTRA_CHEAP_MODELS = [
    'claude-3-haiku-20240307',
    'deepseek-chat',
    'gpt-4o-mini',
    'meta-llama/Meta-Llama-3-8B-Instruct', // Together AI: $0.0000008
];
const MIDDLE_TIER_MODELS = [
    'gpt-3.5-turbo',
    'mistral-small-latest',
    'gemini-1.5-flash',
    'grok-beta', // Alternative perspective
];
// Combined model pool (ultra-cheap prioritized)
const ALL_AVAILABLE_MODELS = [...ULTRA_CHEAP_MODELS, ...MIDDLE_TIER_MODELS];
function selectOptimalModel() {
    // Priority: ultra-cheap first, then middle tier
    return ULTRA_CHEAP_MODELS[Math.floor(Math.random() * ULTRA_CHEAP_MODELS.length)];
}
// Real LLM API call function (ported from raw-capture-runner)
async function callLLM(model, prompt, domain) {
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
            const promptTokens = usage?.prompt_tokens || 0;
            const completionTokens = usage?.completion_tokens || 0;
            let cost = 0;
            if (model === 'gpt-4o-mini') {
                cost = promptTokens * 0.0000015 + completionTokens * 0.000002;
            }
            else if (model === 'gpt-3.5-turbo') {
                cost = promptTokens * 0.000001 + completionTokens * 0.000002;
            }
            else {
                cost = promptTokens * 0.0000015 + completionTokens * 0.000002; // Default fallback
            }
            return {
                response: completion.choices[0]?.message?.content || 'No response',
                tokenUsage: usage,
                cost: cost,
                latency: latency
            };
        }
        else if (model.includes('claude')) {
            const selectedAnthropic = getAnthropicClient();
            const message = await selectedAnthropic.messages.create({
                model: model,
                max_tokens: 1000,
                temperature: 0.7,
                messages: [{ role: 'user', content: prompt }]
            });
            const latency = Date.now() - startTime;
            const usage = message.usage || {};
            const inputTokens = usage?.input_tokens || 0;
            const outputTokens = usage?.output_tokens || 0;
            let cost = 0;
            if (model.includes('haiku')) {
                cost = inputTokens * 0.00000025 + outputTokens * 0.00000125; // Claude 3 Haiku champion!
            }
            else {
                cost = inputTokens * 0.000003 + outputTokens * 0.000015; // Default Claude pricing
            }
            return {
                response: message.content[0]?.type === 'text' ? message.content[0].text : 'No response',
                tokenUsage: usage,
                cost: cost,
                latency: latency
            };
        }
        else if (model.includes('deepseek')) {
            const response = await deepseekClient.post('/chat/completions', {
                model: model,
                messages: [{ role: 'user', content: prompt }],
                max_tokens: 1000,
                temperature: 0.7
            });
            const latency = Date.now() - startTime;
            const usage = response.data.usage || {};
            const promptTokens = usage.prompt_tokens || 0;
            const completionTokens = usage.completion_tokens || 0;
            const cost = promptTokens * 0.000002 + completionTokens * 0.000006; // DeepSeek ultra-cheap
            return {
                response: response.data.choices[0]?.message?.content || 'No response',
                tokenUsage: usage,
                cost: cost,
                latency: latency
            };
        }
        else if (model.includes('meta-llama') || model.includes('Meta-Llama')) {
            const response = await togetherClient.post('/chat/completions', {
                model: model,
                messages: [{ role: 'user', content: prompt }],
                max_tokens: 1000,
                temperature: 0.7
            });
            const latency = Date.now() - startTime;
            const usage = response.data.usage || {};
            const promptTokens = usage.prompt_tokens || 0;
            const completionTokens = usage.completion_tokens || 0;
            const cost = promptTokens * 0.0000008 + completionTokens * 0.000001; // Ultra-budget Together AI
            return {
                response: response.data.choices[0]?.message?.content || 'No response',
                tokenUsage: usage,
                cost: cost,
                latency: latency
            };
        }
        else if (model.includes('mistral')) {
            const response = await mistralClient.post('/chat/completions', {
                model: model,
                messages: [{ role: 'user', content: prompt }],
                max_tokens: 1000,
                temperature: 0.7
            });
            const latency = Date.now() - startTime;
            const usage = response.data.usage || {};
            const promptTokens = usage.prompt_tokens || 0;
            const completionTokens = usage.completion_tokens || 0;
            const cost = promptTokens * 0.000002 + completionTokens * 0.000006; // Mistral Small pricing
            return {
                response: response.data.choices[0]?.message?.content || 'No response',
                tokenUsage: usage,
                cost: cost,
                latency: latency
            };
        }
        else if (model.includes('gemini')) {
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
            const usage = response.data.usageMetadata || {};
            const promptTokens = usage.promptTokenCount || 0;
            const completionTokens = usage.candidatesTokenCount || 0;
            const cost = promptTokens * 0.00000025 + completionTokens * 0.000001; // Gemini Flash pricing
            return {
                response: response.data.candidates?.[0]?.content?.parts?.[0]?.text || 'No response',
                tokenUsage: usage,
                cost: cost,
                latency: latency
            };
        }
        else if (model.includes('grok')) {
            const response = await grokClient.post('/chat/completions', {
                model: model,
                messages: [{ role: 'user', content: prompt }],
                max_tokens: 1000,
                temperature: 0.7
            });
            const latency = Date.now() - startTime;
            const usage = response.data.usage || {};
            const promptTokens = usage.prompt_tokens || 0;
            const completionTokens = usage.completion_tokens || 0;
            const cost = promptTokens * 0.000005 + completionTokens * 0.000015; // Grok pricing estimate
            return {
                response: response.data.choices[0]?.message?.content || 'No response',
                tokenUsage: usage,
                cost: cost,
                latency: latency
            };
        }
        else {
            throw new Error(`Unsupported model: ${model}`);
        }
    }
    catch (error) {
        console.error(`❌ LLM API error for ${model}:`, error);
        throw error;
    }
}
// 100 NEW Premium Domains for Business Intelligence Analysis (NO OVERLAPS with existing 437)
const PREMIUM_DOMAINS = [
    // 🏥 BIOTECH/PHARMACEUTICALS ($4T+ market cap) - MAJOR GAP!
    'moderna.com', 'pfizer.com', 'johnson.com', 'merck.com', 'novartis.com',
    'gsk.com', 'sanofi.com', 'abbvie.com', 'amgen.com', 'gilead.com',
    'biogen.com', 'regeneron.com', 'vertex.com', 'ginkgobioworks.com', 'benchling.com',
    // 🛡️ AEROSPACE/DEFENSE ($800B+ market cap) - COMPLETELY MISSING!
    'lockheedmartin.com', 'boeing.com', 'northropgrumman.com', 'raytheon.com',
    'generaldynamics.com', 'airbus.com', 'rolls-royce.com', 'safran-group.com',
    'embraer.com', 'bombardier.com', 'prattwhitney.com', 'aerovironment.com',
    // ⚡ ENERGY/CLIMATE TECH ($2T+ market cap) - MAJOR GAP!
    'exxonmobil.com', 'chevron.com', 'shell.com', 'bp.com', 'totalenergies.com',
    'conocophillips.com', 'nextera.com', 'enphase.com', 'solaredge.com', 'firstsolar.com',
    'vestas.com', 'orsted.com', 'ge.com', 'siemens-energy.com', 'climeworks.com',
    // 📱 SEMICONDUCTORS/HARDWARE (Expand $500B sector) - MISSING KEY PLAYERS!
    'tsmc.com', 'asml.com', 'applied-materials.com', 'lam-research.com', 'kla.com',
    'synopsys.com', 'cadence.com', 'ansys.com', 'keysight.com', 'teradyne.com',
    'groq.com', 'graphcore.ai', 'cerebras.ai', 'sambanova.ai', 'd-wave.com',
    // 📞 TELECOM/COMMUNICATIONS ($1.5T+ missing)
    'verizon.com', 'att.com', 't-mobile.com', 'comcast.com', 'charter.com',
    'ericsson.com', 'nokia.com', 'cisco.com', 'juniper.net', 'arista.com',
    // 🌾 FOOD/AGRICULTURE ($1T+ missing)
    'cargill.com', 'adm.com', 'bunge.com', 'tyson.com', 'nestle.com',
    'unilever.com', 'pepsico.com', 'mondelez.com', 'kellogg.com', 'generalmills.com',
    'indigo.ag', 'plenty.ag', 'aerofarms.com', 'boweryfarming.com', 'appharvest.com',
    // 🏭 MANUFACTURING/INDUSTRIAL ($2T+ missing)
    '3m.com', 'honeywell.com', 'emerson.com', 'rockwellautomation.com', 'eaton.com',
    'parker.com', 'danaher.com', 'illinois-tool.com', 'stanley-black-decker.com', 'dover.com',
    // 🌍 INTERNATIONAL GIANTS (Fix US bias)
    'tencent.com', 'xiaomi.com', 'byd.com', 'meituan.com', 'bytedance.com',
    'kuaishou.com', 'bilibili.com', 'netease.com', 'sina.com', 'sohu.com',
    // ✈️ TRAVEL/HOSPITALITY ($800B missing)
    'marriott.com', 'hilton.com', 'ihg.com', 'hyatt.com', 'accor.com',
    'carnival.com', 'royal-caribbean.com', 'norwegian.com', 'delta.com', 'united.com',
    'american.com', 'southwest.com', 'jetblue.com', 'alaska.com',
    // 🛍️ RETAIL/CONSUMER (Beyond e-commerce platforms)
    'costco.com', 'homedepot.com', 'lowes.com', 'macys.com', 'nordstrom.com',
    'tjx.com', 'ross.com', 'gap.com', 'under-armour.com', 'lululemon.com',
    'patagonia.com', 'rei.com', 'dicks.com', 'footlocker.com'
];
class SophisticatedRunner {
    constructor() {
        this.domains = PREMIUM_DOMAINS;
        console.log(`✅ Sophisticated Runner initialized with ${this.domains.length} domains`);
    }
    async seedDomains() {
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
                }
                else {
                    skipped++;
                }
            }
            catch (error) {
                // Skip duplicates or errors
                skipped++;
            }
        }
        console.log(`✅ Seeded ${inserted} domains`);
    }
    async processNextBatch() {
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
            await pool.query('UPDATE domains SET status = $1, last_processed_at = NOW() WHERE id = $2', ['processing', id]);
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
            await pool.query('UPDATE domains SET status = $1, last_processed_at = NOW() WHERE id = $2', ['completed', id]);
            console.log(`✅ Completed: ${domain} (${SERVICE_ID})`);
        }
        catch (error) {
            console.error('❌ Processing error:', error);
            // Reset failed domains for retry - same as raw-capture-runner
            try {
                await pool.query('UPDATE domains SET status = $1 WHERE status = $2', ['pending', 'processing']);
            }
            catch (resetError) {
                console.error('❌ Failed to reset domain status:', resetError);
            }
        }
    }
    async getStatus() {
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
        }
        catch (error) {
            return { error: error.message };
        }
    }
    // 🚀 Main processing loop (FIXED: NO INFINITE MONEY BURNING!)
    async startProcessing() {
        console.log('🚀 Starting sophisticated LLM processing loop...');
        const processLoop = async () => {
            try {
                await this.processNextBatch();
                // 🔍 Check if more domains remain BEFORE scheduling next iteration
                const pendingCheck = await pool.query(`SELECT COUNT(*) as count FROM domains WHERE status = 'pending'`);
                const pendingCount = parseInt(pendingCheck.rows[0].count);
                if (pendingCount > 0) {
                    console.log(`🔄 ${pendingCount} domains remaining - continuing processing...`);
                    setTimeout(processLoop, 10000); // Continue processing
                }
                else {
                    console.log('🎉 ALL DOMAINS PROCESSED! No more pending domains - STOPPING INFINITE LOOP!');
                    console.log('💰 Sophisticated processing complete - no more API costs will be incurred');
                    console.log('🏁 Service will remain running for API endpoints, but no more LLM processing');
                    // NO MORE setTimeout - STOP THE LOOP!
                }
            }
            catch (error) {
                console.error('❌ Processing loop error:', error);
                // Even on error, check if we should continue
                try {
                    const pendingCheck = await pool.query(`SELECT COUNT(*) as count FROM domains WHERE status = 'pending'`);
                    const pendingCount = parseInt(pendingCheck.rows[0].count);
                    if (pendingCount > 0) {
                        console.log(`🔄 Error occurred but ${pendingCount} domains remain - retrying in 10 seconds...`);
                        setTimeout(processLoop, 10000);
                    }
                    else {
                        console.log('🛑 No pending domains found after error - STOPPING LOOP');
                    }
                }
                catch (checkError) {
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
const app = (0, express_1.default)();
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
    }
    catch (error) {
        console.error('❌ Startup failed:', error);
        process.exit(1);
    }
}
main().catch(console.error);
//# sourceMappingURL=index.js.map