"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const pg_1 = require("pg");
const app = (0, express_1.default)();
const port = process.env.PORT || 3003;
// Database connection
const pool = new pg_1.Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? {
        rejectUnauthorized: false
    } : false,
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000
});
app.use((0, cors_1.default)());
app.use(express_1.default.json());
console.log('🚀 Starting Sophisticated Runner Service...');
// Health check
app.get('/health', (req, res) => {
    res.json({
        status: 'healthy',
        service: 'sophisticated-runner',
        timestamp: new Date().toISOString()
    });
});
// API key status check
app.get('/api-keys', (req, res) => {
    const keys = {
        openai: !!process.env.OPENAI_API_KEY,
        anthropic: !!process.env.ANTHROPIC_API_KEY,
        deepseek: !!process.env.DEEPSEEK_API_KEY,
        mistral: !!process.env.MISTRAL_API_KEY,
        xai: !!process.env.XAI_API_KEY,
        together: !!process.env.TOGETHER_API_KEY,
        perplexity: !!process.env.PERPLEXITY_API_KEY,
        google: !!process.env.GOOGLE_API_KEY
    };
    const working = Object.values(keys).filter(Boolean).length;
    res.json({
        keys,
        workingKeys: working,
        timestamp: new Date().toISOString()
    });
});
// Fast domain processing endpoint
app.post('/process-pending-domains', async (req, res) => {
    try {
        console.log('🔥 FAST PROCESSING STARTED');
        // Get 10 pending domains
        const result = await pool.query('SELECT id, domain FROM domains WHERE status = $1 ORDER BY updated_at ASC LIMIT 10', ['pending']);
        if (result.rows.length === 0) {
            return res.json({ message: 'No pending domains', processed: 0 });
        }
        console.log(`📊 Processing ${result.rows.length} domains`);
        let processed = 0;
        const errors = [];
        // Process all domains in parallel
        const domainPromises = result.rows.map(async (domainRow) => {
            try {
                console.log(`🔄 Processing ${domainRow.domain}`);
                // Mark as processing
                await pool.query('UPDATE domains SET status = $1, updated_at = NOW() WHERE id = $2', ['processing', domainRow.id]);
                // Process with all available LLMs simultaneously
                const responses = await processAllLLMs(domainRow.domain);
                // Store all responses
                for (const response of responses) {
                    if (response.success) {
                        await pool.query('INSERT INTO domain_responses (domain_id, model, prompt_type, response, created_at) VALUES ($1, $2, $3, $4, NOW())', [domainRow.id, response.model, response.prompt, response.content]);
                    }
                    else {
                        errors.push(`${response.model}: ${response.error}`);
                    }
                }
                // Mark as completed
                await pool.query('UPDATE domains SET status = $1, updated_at = NOW() WHERE id = $2', ['completed', domainRow.id]);
                console.log(`✅ Completed ${domainRow.domain} (${responses.filter(r => r.success).length}/${responses.length} responses)`);
                return true;
            }
            catch (domainError) {
                console.error(`❌ Failed ${domainRow.domain}:`, domainError.message);
                errors.push(`${domainRow.domain}: ${domainError.message}`);
                // Mark as pending again for retry
                await pool.query('UPDATE domains SET status = $1, updated_at = NOW() WHERE id = $2', ['pending', domainRow.id]);
                return false;
            }
        });
        // Wait for all domains to complete
        const results = await Promise.allSettled(domainPromises);
        processed = results.filter(r => r.status === 'fulfilled' && r.value).length;
        res.json({
            processed,
            errors: errors.length,
            errorDetails: errors,
            timestamp: new Date().toISOString()
        });
    }
    catch (error) {
        console.error('🚨 PROCESSING ERROR:', error);
        res.status(500).json({
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
});
async function processAllLLMs(domain) {
    const prompts = ['business_analysis', 'content_strategy', 'technical_assessment'];
    const providers = [
        {
            name: 'openai',
            model: 'gpt-4o-mini',
            key: process.env.OPENAI_API_KEY,
            endpoint: 'https://api.openai.com/v1/chat/completions'
        },
        {
            name: 'anthropic',
            model: 'claude-3-haiku-20240307',
            key: process.env.ANTHROPIC_API_KEY,
            endpoint: 'https://api.anthropic.com/v1/messages'
        },
        {
            name: 'deepseek',
            model: 'deepseek-chat',
            key: process.env.DEEPSEEK_API_KEY,
            endpoint: 'https://api.deepseek.com/v1/chat/completions'
        },
        {
            name: 'mistral',
            model: 'mistral-small-latest',
            key: process.env.MISTRAL_API_KEY,
            endpoint: 'https://api.mistral.ai/v1/chat/completions'
        },
        {
            name: 'xai',
            model: 'grok-beta',
            key: process.env.XAI_API_KEY,
            endpoint: 'https://api.x.ai/v1/chat/completions'
        },
        {
            name: 'together',
            model: 'meta-llama/Llama-3-8b-chat-hf',
            key: process.env.TOGETHER_API_KEY,
            endpoint: 'https://api.together.xyz/v1/chat/completions'
        },
        {
            name: 'perplexity',
            model: 'llama-3.1-sonar-small-128k-online',
            key: process.env.PERPLEXITY_API_KEY,
            endpoint: 'https://api.perplexity.ai/chat/completions'
        },
        {
            name: 'google',
            model: 'gemini-1.5-flash',
            key: process.env.GOOGLE_API_KEY,
            endpoint: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent'
        }
    ].filter(p => p.key); // Only use providers with keys
    // Process ALL prompts and providers in parallel
    const allPromises = [];
    for (const prompt of prompts) {
        for (const provider of providers) {
            allPromises.push(callLLM(provider, domain, prompt).then(content => ({
                success: true,
                model: `${provider.name}/${provider.model}`,
                prompt,
                content
            })).catch(error => ({
                success: false,
                model: `${provider.name}/${provider.model}`,
                prompt,
                error: error.message || 'Unknown error'
            })));
        }
    }
    // Wait for ALL API calls to complete in parallel
    const allResponses = await Promise.all(allPromises);
    return allResponses;
}
async function callLLM(provider, domain, prompt) {
    const promptText = `Analyze ${domain} for ${prompt}. Provide detailed insights about this domain's business strategy, market position, and competitive advantages.`;
    let requestBody;
    let headers;
    if (provider.name === 'anthropic') {
        headers = {
            'x-api-key': provider.key,
            'Content-Type': 'application/json',
            'anthropic-version': '2023-06-01'
        };
        requestBody = {
            model: provider.model,
            max_tokens: 500,
            messages: [{ role: 'user', content: promptText }]
        };
    }
    else if (provider.name === 'google') {
        headers = {
            'Content-Type': 'application/json'
        };
        const endpoint = `${provider.endpoint}?key=${provider.key}`;
        requestBody = {
            contents: [{
                    parts: [{ text: promptText }]
                }],
            generationConfig: {
                maxOutputTokens: 500
            }
        };
        const response = await fetch(endpoint, {
            method: 'POST',
            headers,
            body: JSON.stringify(requestBody)
        });
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        const data = await response.json();
        return data.candidates?.[0]?.content?.parts?.[0]?.text || 'No response';
    }
    else {
        headers = {
            'Authorization': `Bearer ${provider.key}`,
            'Content-Type': 'application/json'
        };
        requestBody = {
            model: provider.model,
            messages: [{ role: 'user', content: promptText }],
            max_tokens: 500
        };
    }
    const response = await fetch(provider.endpoint, {
        method: 'POST',
        headers,
        body: JSON.stringify(requestBody)
    });
    if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    const data = await response.json();
    if (data.error) {
        throw new Error(data.error.message || 'API Error');
    }
    // Extract content based on provider
    if (provider.name === 'anthropic') {
        return data.content?.[0]?.text || 'No response';
    }
    else {
        return data.choices?.[0]?.message?.content || 'No response';
    }
}
app.listen(port, () => {
    console.log(`✅ Sophisticated Runner Service running on port ${port}`);
    console.log(`🔥 Domain processing: POST /process-pending-domains`);
    console.log(`🔑 API key status: GET /api-keys`);
    console.log(`🏥 Health check: GET /health`);
});
//# sourceMappingURL=index.js.map