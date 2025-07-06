"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.callDeepSeek = callDeepSeek;
exports.callMistral = callMistral;
exports.callXAI = callXAI;
exports.callTogether = callTogether;
exports.callPerplexity = callPerplexity;
exports.callGoogle = callGoogle;
exports.processAllProviders = processAllProviders;
exports.getConfiguredProviders = getConfiguredProviders;
const openai_1 = __importDefault(require("openai"));
const sdk_1 = __importDefault(require("@anthropic-ai/sdk"));
const axios_1 = __importDefault(require("axios"));
const database_1 = require("./database");
const PROVIDERS = {
    openai: {
        name: 'OpenAI',
        model: 'gpt-4',
        apiKey: process.env.OPENAI_API_KEY,
        rateLimit: 3000
    },
    anthropic: {
        name: 'Anthropic',
        model: 'claude-3-sonnet-20240229',
        apiKey: process.env.ANTHROPIC_API_KEY,
        rateLimit: 3000
    },
    deepseek: {
        name: 'DeepSeek',
        model: 'deepseek-chat',
        apiKey: process.env.DEEPSEEK_API_KEY,
        rateLimit: 2000
    },
    mistral: {
        name: 'Mistral',
        model: 'mistral-large-latest',
        apiKey: process.env.MISTRAL_API_KEY,
        rateLimit: 2000
    },
    xai: {
        name: 'XAI',
        model: 'grok-beta',
        apiKey: process.env.XAI_API_KEY,
        rateLimit: 3000
    },
    together: {
        name: 'Together',
        model: 'meta-llama/Llama-2-70b-chat-hf',
        apiKey: process.env.TOGETHER_API_KEY,
        rateLimit: 2000
    },
    perplexity: {
        name: 'Perplexity',
        model: 'llama-3-sonar-large-32k-online',
        apiKey: process.env.PERPLEXITY_API_KEY,
        rateLimit: 3000
    },
    google: {
        name: 'Google',
        model: 'gemini-pro',
        apiKey: process.env.GOOGLE_API_KEY,
        rateLimit: 2000
    }
};
const lastRequestTime = {};
async function rateLimitedDelay(provider) {
    const config = PROVIDERS[provider];
    if (!config)
        return;
    const now = Date.now();
    const lastRequest = lastRequestTime[provider] || 0;
    const timeSinceLastRequest = now - lastRequest;
    if (timeSinceLastRequest < config.rateLimit) {
        const delay = config.rateLimit - timeSinceLastRequest;
        await new Promise(resolve => setTimeout(resolve, delay));
    }
    lastRequestTime[provider] = Date.now();
}
const BRAND_PERCEPTION_PROMPT = (domain) => `
Analyze the brand perception and memory retention for ${domain}. 

Consider:
1. Brand recognition and recall
2. Market positioning and reputation
3. User sentiment and trust
4. Innovation perception
5. Competitive advantages

Provide a concise analysis of how this brand is perceived in the market and what makes it memorable.
`;
async function callOpenAI(domain) {
    try {
        await rateLimitedDelay('openai');
        const openai = new openai_1.default({
            apiKey: PROVIDERS.openai.apiKey
        });
        const startTime = Date.now();
        const response = await openai.chat.completions.create({
            model: PROVIDERS.openai.model,
            messages: [
                { role: 'user', content: BRAND_PERCEPTION_PROMPT(domain) }
            ],
            max_tokens: 500,
            temperature: 0.7
        });
        const responseTime = Date.now() - startTime;
        const content = response.choices[0]?.message?.content || '';
        await (0, database_1.saveLLMResponse)({
            domain,
            provider: 'openai',
            model: PROVIDERS.openai.model,
            promptType: 'brand_perception',
            rawResponse: content,
            tokenCount: response.usage?.total_tokens,
            responseTimeMs: responseTime
        });
        await (0, database_1.logProcessingEvent)({
            eventType: 'llm_request',
            provider: 'openai',
            domain,
            success: true
        });
    }
    catch (error) {
        console.error(`❌ OpenAI error for ${domain}:`, error.message);
        await (0, database_1.logProcessingEvent)({
            eventType: 'llm_request',
            provider: 'openai',
            domain,
            success: false,
            errorMessage: error.message
        });
    }
}
async function callAnthropic(domain) {
    try {
        await rateLimitedDelay('anthropic');
        const anthropic = new sdk_1.default({
            apiKey: PROVIDERS.anthropic.apiKey
        });
        const startTime = Date.now();
        const response = await anthropic.messages.create({
            model: PROVIDERS.anthropic.model,
            max_tokens: 500,
            messages: [
                { role: 'user', content: BRAND_PERCEPTION_PROMPT(domain) }
            ]
        });
        const responseTime = Date.now() - startTime;
        const content = response.content[0]?.type === 'text' ? response.content[0].text : '';
        await (0, database_1.saveLLMResponse)({
            domain,
            provider: 'anthropic',
            model: PROVIDERS.anthropic.model,
            promptType: 'brand_perception',
            rawResponse: content,
            tokenCount: response.usage?.input_tokens + response.usage?.output_tokens,
            responseTimeMs: responseTime
        });
        await (0, database_1.logProcessingEvent)({
            eventType: 'llm_request',
            provider: 'anthropic',
            domain,
            success: true
        });
    }
    catch (error) {
        console.error(`❌ Anthropic error for ${domain}:`, error.message);
        await (0, database_1.logProcessingEvent)({
            eventType: 'llm_request',
            provider: 'anthropic',
            domain,
            success: false,
            errorMessage: error.message
        });
    }
}
async function callGenericAPI(provider, domain, endpoint) {
    try {
        await rateLimitedDelay(provider);
        const config = PROVIDERS[provider];
        if (!config)
            throw new Error(`Unknown provider: ${provider}`);
        const startTime = Date.now();
        const response = await axios_1.default.post(endpoint, {
            model: config.model,
            messages: [
                { role: 'user', content: BRAND_PERCEPTION_PROMPT(domain) }
            ],
            max_tokens: 500,
            temperature: 0.7
        }, {
            headers: {
                'Authorization': `Bearer ${config.apiKey}`,
                'Content-Type': 'application/json'
            },
            timeout: 30000
        });
        const responseTime = Date.now() - startTime;
        const content = response.data.choices?.[0]?.message?.content || response.data.content || '';
        await (0, database_1.saveLLMResponse)({
            domain,
            provider,
            model: config.model,
            promptType: 'brand_perception',
            rawResponse: content,
            tokenCount: response.data.usage?.total_tokens || 0,
            responseTimeMs: responseTime
        });
        await (0, database_1.logProcessingEvent)({
            eventType: 'llm_request',
            provider,
            domain,
            success: true
        });
    }
    catch (error) {
        console.error(`❌ ${provider} error for ${domain}:`, error.message);
        await (0, database_1.logProcessingEvent)({
            eventType: 'llm_request',
            provider,
            domain,
            success: false,
            errorMessage: error.message
        });
    }
}
async function callDeepSeek(domain) {
    return callGenericAPI('deepseek', domain, 'https://api.deepseek.com/v1/chat/completions');
}
async function callMistral(domain) {
    return callGenericAPI('mistral', domain, 'https://api.mistral.ai/v1/chat/completions');
}
async function callXAI(domain) {
    return callGenericAPI('xai', domain, 'https://api.x.ai/v1/chat/completions');
}
async function callTogether(domain) {
    return callGenericAPI('together', domain, 'https://api.together.xyz/v1/chat/completions');
}
async function callPerplexity(domain) {
    return callGenericAPI('perplexity', domain, 'https://api.perplexity.ai/chat/completions');
}
async function callGoogle(domain) {
    return callGenericAPI('google', domain, 'https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent');
}
async function processAllProviders(domain) {
    console.log(`🚀 Processing domain: ${domain} with all 8 providers`);
    const providers = [
        () => callOpenAI(domain),
        () => callAnthropic(domain),
        () => callDeepSeek(domain),
        () => callMistral(domain),
        () => callXAI(domain),
        () => callTogether(domain),
        () => callPerplexity(domain),
        () => callGoogle(domain)
    ];
    for (const providerCall of providers) {
        try {
            await providerCall();
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
        catch (error) {
            console.error('Provider call failed:', error);
        }
    }
    console.log(`✅ Completed processing ${domain}`);
}
function getConfiguredProviders() {
    return Object.entries(PROVIDERS)
        .filter(([_, config]) => config.apiKey)
        .map(([name, _]) => name);
}
