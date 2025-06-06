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
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv = __importStar(require("dotenv"));
const monitoring_1 = require("./services/monitoring");
const express_1 = __importDefault(require("express"));
const path_1 = __importDefault(require("path"));
const database_1 = require("./config/database");
const fs = __importStar(require("fs"));
const openai_1 = __importDefault(require("openai"));
const sdk_1 = __importDefault(require("@anthropic-ai/sdk"));
const axios_1 = __importDefault(require("axios"));
// Load environment variables
dotenv.config();
// Initialize LLM clients
const openai = new openai_1.default({
    apiKey: process.env.OPENAI_API_KEY
});
const anthropic = new sdk_1.default({
    apiKey: process.env.ANTHROPIC_API_KEY
});
// Initialize additional API clients for comprehensive 2025 coverage
const deepseekClient = axios_1.default.create({
    baseURL: 'https://api.deepseek.com/v1',
    headers: {
        'Authorization': `Bearer ${process.env.DEEPSEEK_API_KEY}`,
        'Content-Type': 'application/json'
    }
});
const googleClient = axios_1.default.create({
    baseURL: 'https://generativelanguage.googleapis.com/v1beta',
    headers: {
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
// Together AI client for open-source models (Llama, Mixtral, etc.)
const togetherClient = axios_1.default.create({
    baseURL: 'https://api.together.xyz/v1',
    headers: {
        'Authorization': `Bearer ${process.env.TOGETHER_API_KEY}`,
        'Content-Type': 'application/json'
    }
});
// Hugging Face client for additional models
const hfClient = axios_1.default.create({
    baseURL: 'https://api.endpoints.huggingface.co/v2',
    headers: {
        'Authorization': `Bearer ${process.env.HUGGINGFACE_API_KEY}`,
        'Content-Type': 'application/json'
    }
});
// Real prompt templates for domain analysis
const PROMPT_TEMPLATES = {
    business_analysis: (domain) => `
Analyze the business model and strategy of ${domain}. Provide insights on:
1. Primary business model and revenue streams
2. Target market and customer segments  
3. Competitive positioning and advantages
4. Key growth drivers and challenges
5. Market opportunity and industry trends

Keep your analysis concise but comprehensive (300-500 words).`,
    content_strategy: (domain) => `
Evaluate the content strategy and digital presence of ${domain}. Analyze:
1. Content types, themes, and quality
2. Content distribution channels and frequency
3. SEO strategy and keyword targeting
4. User engagement and content performance
5. Content gaps and opportunities

Provide actionable insights for content optimization (300-500 words).`,
    technical_assessment: (domain) => `
Conduct a technical assessment of ${domain}. Cover:
1. Website performance and loading speed
2. Mobile responsiveness and UX design
3. Security features and SSL implementation
4. Technology stack and infrastructure
5. Technical SEO and site architecture

Focus on technical strengths and improvement areas (300-500 words).`
};
// Schema initialization with proper column verification
async function ensureSchemaExists() {
    try {
        console.log('🔍 Checking if database schema exists...');
        // Check if domains table has the correct structure
        try {
            await (0, database_1.query)(`SELECT status, last_processed_at, process_count FROM domains LIMIT 1`);
            // Check if processing_logs table exists
            await (0, database_1.query)(`SELECT event_type FROM processing_logs LIMIT 1`);
            console.log('✅ Database schema already exists with correct structure');
            return;
        }
        catch (error) {
            console.log(`📦 Schema issue detected (${error.code}): ${error.message}`);
            console.log('🔨 Initializing/fixing database schema...');
            // Try multiple possible schema file locations
            const possiblePaths = [
                path_1.default.join(__dirname, '..', 'schemas', 'schema.sql'),
                path_1.default.join(__dirname, '..', '..', 'schemas', 'schema.sql'),
                path_1.default.join(process.cwd(), 'schemas', 'schema.sql'),
                path_1.default.join('/opt/render/project/src', 'schemas', 'schema.sql'),
                path_1.default.join('/opt/render/project', 'schemas', 'schema.sql')
            ];
            let schemaContent = null;
            let foundPath = null;
            for (const schemaPath of possiblePaths) {
                console.log(`🔍 Trying schema path: ${schemaPath}`);
                if (fs.existsSync(schemaPath)) {
                    schemaContent = fs.readFileSync(schemaPath, 'utf8');
                    foundPath = schemaPath;
                    console.log(`✅ Found schema at: ${foundPath}`);
                    break;
                }
            }
            if (!schemaContent) {
                console.log('⚠️ Schema file not found, using embedded schema...');
                // Embedded schema as fallback
                schemaContent = `
          -- Enable UUID extension
          CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
          
          -- Create domains table with full temporal tracking
          CREATE TABLE IF NOT EXISTS domains (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            domain TEXT NOT NULL UNIQUE,
            status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'error')),
            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            last_processed_at TIMESTAMP WITH TIME ZONE,
            process_count INTEGER DEFAULT 0,
            error_count INTEGER DEFAULT 0,
            source TEXT
          );
          
          -- Create responses table with full temporal and cost tracking
          CREATE TABLE IF NOT EXISTS responses (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            domain_id UUID REFERENCES domains(id),
            model TEXT NOT NULL,
            prompt_type TEXT NOT NULL,
            interpolated_prompt TEXT NOT NULL,
            raw_response TEXT NOT NULL,
            token_count INTEGER,
            prompt_tokens INTEGER,
            completion_tokens INTEGER,
            token_usage JSONB,
            total_cost_usd DECIMAL(10,6),
            latency_ms INTEGER,
            captured_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
          );
          
          -- Create processing_logs table for detailed temporal monitoring
          CREATE TABLE IF NOT EXISTS processing_logs (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            domain_id UUID REFERENCES domains(id),
            event_type TEXT NOT NULL,
            details JSONB,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
          );
          
          -- Create rate_limits table for temporal API usage tracking
          CREATE TABLE IF NOT EXISTS rate_limits (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            model TEXT NOT NULL,
            requests_per_minute INTEGER NOT NULL,
            requests_per_hour INTEGER NOT NULL,
            requests_per_day INTEGER NOT NULL,
            current_minute_count INTEGER DEFAULT 0,
            current_hour_count INTEGER DEFAULT 0,
            current_day_count INTEGER DEFAULT 0,
            last_reset_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            window_start TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            UNIQUE (model)
          );
          
          -- Create prompt_templates table for template management
          CREATE TABLE IF NOT EXISTS prompt_templates (
            id TEXT PRIMARY KEY,
            template TEXT NOT NULL,
            category TEXT,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
          );
        `;
            }
            // Drop existing tables if they exist with wrong structure
            console.log('🗑️ Dropping existing incompatible tables...');
            await (0, database_1.query)(`DROP TABLE IF EXISTS processing_logs CASCADE`);
            await (0, database_1.query)(`DROP TABLE IF EXISTS responses CASCADE`);
            await (0, database_1.query)(`DROP TABLE IF EXISTS rate_limits CASCADE`);
            await (0, database_1.query)(`DROP TABLE IF EXISTS prompt_templates CASCADE`);
            await (0, database_1.query)(`DROP TABLE IF EXISTS domains CASCADE`);
            console.log('🔨 Creating fresh schema...');
            await (0, database_1.query)(schemaContent);
            // Verify schema was created correctly
            await (0, database_1.query)(`SELECT status, last_processed_at, process_count FROM domains LIMIT 1`);
            await (0, database_1.query)(`SELECT event_type FROM processing_logs LIMIT 1`);
            console.log('✅ Database schema initialized successfully!');
        }
    }
    catch (error) {
        console.error('❌ Schema initialization failed:', error);
        throw error;
    }
}
// Domain seeding function
async function seedDomains() {
    // Embedded domains list (our 266 premium domains)
    const domains = [
        'google.com', 'blogger.com', 'youtube.com', 'linkedin.com', 'cloudflare.com',
        'microsoft.com', 'apple.com', 'wikipedia.org', 'wordpress.org', 'mozilla.org',
        'youtu.be', 'blogspot.com', 'googleusercontent.com', 't.me', 'europa.eu',
        'whatsapp.com', 'adobe.com', 'facebook.com', 'uol.com.br', 'istockphoto.com',
        'vimeo.com', 'vk.com', 'github.com', 'amazon.com', 'bbc.co.uk',
        'google.de', 'live.com', 'gravatar.com', 'nih.gov', 'dan.com',
        'wordpress.com', 'yahoo.com', 'cnn.com', 'dropbox.com', 'wikimedia.org',
        'creativecommons.org', 'google.com.br', 'line.me', 'googleblog.com', 'opera.com',
        'globo.com', 'brandbucket.com', 'myspace.com', 'slideshare.net', 'paypal.com',
        'tiktok.com', 'netvibes.com', 'theguardian.com', 'who.int', 'goo.gl',
        'medium.com', 'weebly.com', 'w3.org', 'gstatic.com', 'jimdofree.com',
        'cpanel.net', 'imdb.com', 'wa.me', 'feedburner.com', 'enable-javascript.com',
        'nytimes.com', 'ok.ru', 'google.es', 'dailymotion.com', 'afternic.com',
        'bloomberg.com', 'amazon.de', 'wiley.com', 'aliexpress.com', 'indiatimes.com',
        'youronlinechoices.com', 'elpais.com', 'tinyurl.com', 'yadi.sk', 'spotify.com',
        'huffpost.com', 'google.fr', 'webmd.com', 'samsung.com', 'independent.co.uk',
        'amazon.co.jp', 'amazon.co.uk', '4shared.com', 'telegram.me', 'planalto.gov.br',
        'businessinsider.com', 'ig.com.br', 'issuu.com', 'gov.br', 'wsj.com',
        'hugedomains.com', 'usatoday.com', 'scribd.com', 'gov.uk', 'googleapis.com',
        'huffingtonpost.com', 'bbc.com', 'estadao.com.br', 'nature.com', 'mediafire.com',
        'washingtonpost.com', 'forms.gle', 'namecheap.com', 'forbes.com', 'mirror.co.uk',
        'soundcloud.com', 'fb.com', 'domainmarket.com', 'ytimg.com', 'terra.com.br',
        'google.co.uk', 'shutterstock.com', 'dailymail.co.uk', 'reg.ru', 't.co',
        'cdc.gov', 'thesun.co.uk', 'wp.com', 'cnet.com', 'instagram.com',
        'researchgate.net', 'google.it', 'fandom.com', 'office.com', 'list-manage.com',
        'msn.com', 'un.org', 'ovh.com', 'mail.ru', 'bing.com',
        'hatena.ne.jp', 'shopify.com', 'bit.ly', 'reuters.com', 'booking.com',
        'discord.com', 'buydomains.com', 'nasa.gov', 'aboutads.info', 'time.com',
        'abril.com.br', 'change.org', 'nginx.org', 'twitter.com', 'archive.org',
        'cbsnews.com', 'networkadvertising.org', 'telegraph.co.uk', 'pinterest.com', 'google.co.jp',
        'pixabay.com', 'zendesk.com', 'cpanel.com', 'vistaprint.com', 'sky.com',
        'windows.net', 'alicdn.com', 'google.ca', 'lemonde.fr', 'newyorker.com',
        'webnode.page', 'surveymonkey.com', 'amazonaws.com', 'academia.edu', 'apache.org',
        'imageshack.us', 'akamaihd.net', 'nginx.com', 'discord.gg', 'thetimes.co.uk',
        'amazon.fr', 'yelp.com', 'berkeley.edu', 'google.ru', 'sedoparking.com',
        'cbc.ca', 'unesco.org', 'ggpht.com', 'privacyshield.gov', 'over-blog.com',
        'clarin.com', 'wix.com', 'whitehouse.gov', 'icann.org', 'gnu.org',
        'yandex.ru', 'francetvinfo.fr', 'gmail.com', 'mozilla.com', 'ziddu.com',
        'guardian.co.uk', 'twitch.tv', 'sedo.com', 'foxnews.com', 'rambler.ru',
        'stanford.edu', 'wikihow.com', '20minutos.es', 'sfgate.com', 'liveinternet.ru',
        '000webhost.com', 'espn.com', 'eventbrite.com', 'disney.com', 'statista.com',
        'addthis.com', 'pinterest.fr', 'lavanguardia.com', 'vkontakte.ru', 'doubleclick.net',
        'skype.com', 'sciencedaily.com', 'bloglovin.com', 'insider.com', 'sputniknews.com',
        'doi.org', 'nypost.com', 'elmundo.es', 'go.com', 'deezer.com',
        'express.co.uk', 'detik.com', 'mystrikingly.com', 'rakuten.co.jp', 'amzn.to',
        'arxiv.org', 'alibaba.com', 'fb.me', 'wikia.com', 't-online.de',
        'telegra.ph', 'mega.nz', 'usnews.com', 'plos.org', 'naver.com',
        'ibm.com', 'smh.com.au', 'dw.com', 'google.nl', 'lefigaro.fr',
        'theatlantic.com', 'nydailynews.com', 'themeforest.net', 'rtve.es', 'newsweek.com',
        'ovh.net', 'ca.gov', 'goodreads.com', 'economist.com', 'target.com',
        'marca.com', 'kickstarter.com', 'hindustantimes.com', 'weibo.com', 'huawei.com',
        'e-monsite.com', 'hubspot.com', 'npr.org', 'netflix.com', 'gizmodo.com',
        'netlify.app', 'yandex.com', 'mashable.com', 'ebay.com', 'etsy.com', 'walmart.com'
    ];
    let inserted = 0;
    let skipped = 0;
    for (const domain of domains) {
        try {
            const result = await (0, database_1.query)(`
        INSERT INTO domains (domain, source, status)
        VALUES ($1, $2, $3)
        ON CONFLICT (domain) DO NOTHING
        RETURNING id
      `, [domain.trim(), 'api_seed', 'pending']);
            if (result.rows.length > 0) {
                inserted++;
            }
            else {
                skipped++;
            }
        }
        catch (error) {
            console.error(`Error inserting ${domain}:`, error);
        }
    }
    return { inserted, skipped, total: domains.length };
}
// Real LLM API call function
async function callLLM(model, prompt, domain) {
    const startTime = Date.now();
    try {
        if (model.includes('gpt')) {
            // OpenAI API call
            const completion = await openai.chat.completions.create({
                model: model,
                messages: [{ role: 'user', content: prompt }],
                max_tokens: 1000,
                temperature: 0.7
            });
            const latency = Date.now() - startTime;
            const usage = completion.usage || {};
            // 2025 UPDATED: Comprehensive cost calculation for latest models
            const promptTokens = usage?.prompt_tokens || 0;
            const completionTokens = usage?.completion_tokens || 0;
            let cost = 0;
            // 🚀 Latest GPT-4.1 Series (2025)
            if (model === 'gpt-4.1') {
                cost = promptTokens * 0.00005 + completionTokens * 0.00015; // GPT-4.1 premium pricing
            }
            else if (model === 'gpt-4.1-mini') {
                cost = promptTokens * 0.00002 + completionTokens * 0.00006; // GPT-4.1-mini pricing
            }
            else if (model === 'gpt-4.1-nano') {
                cost = promptTokens * 0.000005 + completionTokens * 0.00002; // GPT-4.1-nano ultra-fast pricing
            }
            else if (model === 'gpt-4.5') {
                cost = promptTokens * 0.00008 + completionTokens * 0.00024; // GPT-4.5 Orion premium pricing
                // Current GPT-4o Series
            }
            else if (model === 'gpt-4o' && !model.includes('mini')) {
                cost = promptTokens * 0.0000025 + completionTokens * 0.00001; // GPT-4o pricing
            }
            else if (model === 'gpt-4o-mini') {
                cost = promptTokens * 0.0000015 + completionTokens * 0.000002; // GPT-4o-mini pricing
                // Legacy Models
            }
            else if (model === 'gpt-3.5-turbo') {
                cost = promptTokens * 0.000001 + completionTokens * 0.000002; // GPT-3.5 pricing
            }
            else if (model.includes('gpt-4') || model.includes('turbo-preview')) {
                cost = promptTokens * 0.00003 + completionTokens * 0.00006; // Legacy GPT-4 pricing
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
            // Anthropic API call
            const message = await anthropic.messages.create({
                model: model,
                max_tokens: 1000,
                temperature: 0.7,
                messages: [{ role: 'user', content: prompt }]
            });
            const latency = Date.now() - startTime;
            const usage = message.usage || {};
            // 2025 UPDATED: Comprehensive cost calculation for latest Claude models
            const inputTokens = usage?.input_tokens || 0;
            const outputTokens = usage?.output_tokens || 0;
            let cost = 0;
            // 🧠 Latest Claude 4 Series (2025) - Premium Pricing
            if (model === 'claude-opus-4-20250514') {
                cost = inputTokens * 0.00003 + outputTokens * 0.00015; // Claude 4 Opus - flagship pricing
            }
            else if (model === 'claude-sonnet-4-20250514') {
                cost = inputTokens * 0.000015 + outputTokens * 0.000075; // Claude 4 Sonnet - premium pricing
            }
            else if (model === 'claude-3-7-sonnet-20250219') {
                cost = inputTokens * 0.000008 + outputTokens * 0.00004; // Claude 3.7 Sonnet - enhanced pricing
                // Legacy Claude 3 Series
            }
            else if (model.includes('opus') && model.includes('20240229')) {
                cost = inputTokens * 0.000015 + outputTokens * 0.000075; // Claude 3 Opus
            }
            else if (model.includes('sonnet') && model.includes('20240229')) {
                cost = inputTokens * 0.000003 + outputTokens * 0.000015; // Claude 3 Sonnet
            }
            else if (model.includes('haiku')) {
                cost = inputTokens * 0.00000025 + outputTokens * 0.00000125; // Claude 3 Haiku
            }
            else {
                // Default fallback for any unrecognized Claude model
                cost = inputTokens * 0.000003 + outputTokens * 0.000015; // Default to Sonnet pricing
            }
            return {
                response: message.content[0]?.type === 'text' ? message.content[0].text : 'No response',
                tokenUsage: usage,
                cost: cost,
                latency: latency
            };
        }
        else if (model.includes('deepseek')) {
            // 🔬 DeepSeek API call (OpenAI-compatible)
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
            // DeepSeek V3 pricing (extremely competitive)
            let cost = 0;
            if (model.includes('coder')) {
                cost = promptTokens * 0.000002 + completionTokens * 0.000008; // DeepSeek Coder pricing
            }
            else {
                cost = promptTokens * 0.000002 + completionTokens * 0.000006; // DeepSeek Chat pricing
            }
            return {
                response: response.data.choices[0]?.message?.content || 'No response',
                tokenUsage: usage,
                cost: cost,
                latency: latency
            };
        }
        else if (model.includes('gemini')) {
            // 🌟 Google Gemini API call
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
            // Google Gemini pricing
            let cost = 0;
            if (model.includes('1.5-pro')) {
                cost = promptTokens * 0.00000125 + completionTokens * 0.000005; // Gemini 1.5 Pro pricing
            }
            else if (model.includes('1.5-flash')) {
                cost = promptTokens * 0.00000025 + completionTokens * 0.000001; // Gemini 1.5 Flash pricing
            }
            return {
                response: response.data.candidates?.[0]?.content?.parts?.[0]?.text || 'No response',
                tokenUsage: usage,
                cost: cost,
                latency: latency
            };
        }
        else if (model.includes('mistral')) {
            // 🔮 Mistral API call
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
            // Mistral pricing
            let cost = 0;
            if (model.includes('large')) {
                cost = promptTokens * 0.000004 + completionTokens * 0.000012; // Mistral Large pricing
            }
            else if (model.includes('small')) {
                cost = promptTokens * 0.000002 + completionTokens * 0.000006; // Mistral Small pricing
            }
            else if (model.includes('7b')) {
                cost = promptTokens * 0.0000002 + completionTokens * 0.0000005; // Mistral 7B ultra-budget
            }
            return {
                response: response.data.choices[0]?.message?.content || 'No response',
                tokenUsage: usage,
                cost: cost,
                latency: latency
            };
        }
        else if (model.includes('llama') || model.includes('mixtral') || model.includes('yi-') || model.includes('codellama')) {
            // 🦙 Together AI for open-source models (Llama, Mixtral, etc.)
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
            // Budget model pricing (extremely competitive)
            let cost = 0;
            if (model.includes('70b') || model.includes('72b')) {
                cost = promptTokens * 0.000008 + completionTokens * 0.000015; // Large models
            }
            else if (model.includes('34b') || model.includes('22b')) {
                cost = promptTokens * 0.000005 + completionTokens * 0.000010; // Mid-size models
            }
            else if (model.includes('8b') || model.includes('7b') || model.includes('9b')) {
                cost = promptTokens * 0.0000015 + completionTokens * 0.000003; // Small models
            }
            else if (model.includes('3b')) {
                cost = promptTokens * 0.0000008 + completionTokens * 0.000001; // Tiny models
            }
            else {
                cost = promptTokens * 0.000002 + completionTokens * 0.000004; // Default budget pricing
            }
            return {
                response: response.data.choices[0]?.message?.content || 'No response',
                tokenUsage: usage,
                cost: cost,
                latency: latency
            };
        }
        else if (model.includes('qwen') || model.includes('phi-') || model.includes('gemma')) {
            // 🚀 Hugging Face for additional models (Qwen, Phi, Gemma)
            const response = await hfClient.post('/chat/completions', {
                model: model,
                messages: [{ role: 'user', content: prompt }],
                max_tokens: 1000,
                temperature: 0.7
            });
            const latency = Date.now() - startTime;
            const usage = response.data.usage || {};
            const promptTokens = usage.prompt_tokens || 0;
            const completionTokens = usage.completion_tokens || 0;
            // Ultra-budget model pricing
            let cost = 0;
            if (model.includes('72b') || model.includes('70b')) {
                cost = promptTokens * 0.000008 + completionTokens * 0.000012; // Large Qwen models
            }
            else if (model.includes('32b') || model.includes('27b')) {
                cost = promptTokens * 0.000003 + completionTokens * 0.000006; // Mid Qwen/Gemma models
            }
            else if (model.includes('14b') || model.includes('9b')) {
                cost = promptTokens * 0.000001 + completionTokens * 0.000002; // Small models
            }
            else if (model.includes('7b') || model.includes('3b')) {
                cost = promptTokens * 0.0000003 + completionTokens * 0.0000008; // Tiny models
            }
            else if (model.includes('mini')) {
                cost = promptTokens * 0.0000001 + completionTokens * 0.0000003; // Phi-3-mini ultra-cheap
            }
            else {
                cost = promptTokens * 0.0000005 + completionTokens * 0.000001; // Default ultra-budget
            }
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
        console.error(`LLM API error for ${model}:`, error);
        throw error;
    }
}
// Initialize monitoring
const monitoring = monitoring_1.MonitoringService.getInstance();
// Create Express app
const app = (0, express_1.default)();
const port = process.env.PORT || 3000;
// Add middleware for parsing JSON and URL-encoded data
app.use(express_1.default.json());
app.use(express_1.default.urlencoded({ extended: true }));
// Serve static files
app.use(express_1.default.static(path_1.default.join(__dirname, 'dashboard/public')));
// SEED ENDPOINT - THE MONEY SHOT! 🚀
app.post('/seed', async (req, res) => {
    try {
        console.log('🌱 Seeding domains via API endpoint...');
        const result = await seedDomains();
        // Get current stats
        const stats = await (0, database_1.query)(`
      SELECT 
        COUNT(*) as total_domains,
        COUNT(*) FILTER (WHERE status = 'pending') as pending_domains,
        COUNT(*) FILTER (WHERE status = 'completed') as completed_domains,
        COUNT(*) FILTER (WHERE status = 'processing') as processing_domains
      FROM domains
    `);
        const response = {
            success: true,
            message: '🎉 Domain seeding complete!',
            inserted: result.inserted,
            skipped: result.skipped,
            total_in_list: result.total,
            database_stats: {
                total_domains: parseInt(stats.rows[0].total_domains),
                pending: parseInt(stats.rows[0].pending_domains),
                processing: parseInt(stats.rows[0].processing_domains),
                completed: parseInt(stats.rows[0].completed_domains)
            },
            estimated_time: `~${Math.ceil(parseInt(stats.rows[0].pending_domains) / 60)} hours for complete 2025 tensor analysis`,
            processing_rate: '1 domain per minute, 105 responses per domain (35 models × 3 prompts)',
            tensor_upgrade: '🚀 ULTIMATE COST SPECTRUM: 35 models - $0.0001 to $0.15 - Complete budget to flagship coverage!'
        };
        console.log('🎉 Seeding complete!', response);
        res.json(response);
    }
    catch (error) {
        console.error('❌ Seeding failed:', error);
        res.status(500).json({
            success: false,
            error: 'Seeding failed',
            details: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
// API endpoints for metrics
app.get('/api/stats', async (req, res) => {
    try {
        const timeframe = req.query.timeframe || '24h';
        const stats = await monitoring.getStats(timeframe);
        res.json(stats);
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to fetch stats' });
    }
});
// Get recent alerts
app.get('/api/alerts', async (req, res) => {
    try {
        const alerts = await (0, database_1.query)(`
      SELECT details
      FROM processing_logs
      WHERE event_type = 'alert'
      ORDER BY created_at DESC
      LIMIT 100
    `);
        res.json(alerts.rows);
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to fetch alerts' });
    }
});
// Get recent errors
app.get('/api/errors', async (req, res) => {
    try {
        const errors = await (0, database_1.query)(`
      SELECT details
      FROM processing_logs
      WHERE event_type = 'error'
      ORDER BY created_at DESC
      LIMIT 50
    `);
        res.json(errors.rows);
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to fetch errors' });
    }
});
// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ status: 'ok' });
});
// Database health and metrics
app.get('/db-stats', async (req, res) => {
    try {
        const responseCount = await (0, database_1.query)(`SELECT COUNT(*) as total_responses FROM responses`);
        const avgCost = await (0, database_1.query)(`SELECT AVG(total_cost_usd) as avg_cost, SUM(total_cost_usd) as total_cost FROM responses WHERE total_cost_usd > 0`);
        const avgLatency = await (0, database_1.query)(`SELECT AVG(latency_ms) as avg_latency FROM responses WHERE latency_ms > 0`);
        const modelBreakdown = await (0, database_1.query)(`
      SELECT model, COUNT(*) as count, AVG(total_cost_usd) as avg_cost 
      FROM responses 
      GROUP BY model 
      ORDER BY count DESC
    `);
        const recentActivity = await (0, database_1.query)(`
      SELECT DATE_TRUNC('hour', captured_at) as hour, COUNT(*) as responses_per_hour
      FROM responses 
      WHERE captured_at > NOW() - INTERVAL '24 hours'
      GROUP BY hour 
      ORDER BY hour DESC
    `);
        res.json({
            database_health: {
                total_responses: parseInt(responseCount.rows[0].total_responses),
                avg_cost_per_response: parseFloat(avgCost.rows[0]?.avg_cost || 0).toFixed(6),
                total_cost_spent: parseFloat(avgCost.rows[0]?.total_cost || 0).toFixed(4),
                avg_latency_ms: parseInt(avgLatency.rows[0]?.avg_latency || 0),
                estimated_db_size_kb: parseInt(responseCount.rows[0].total_responses) * 2
            },
            model_performance: modelBreakdown.rows,
            hourly_activity: recentActivity.rows
        });
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to fetch database stats' });
    }
});
// Peek at actual LLM responses
app.get('/responses', async (req, res) => {
    try {
        const responses = await (0, database_1.query)(`
      SELECT 
        d.domain,
        r.model,
        r.prompt_type,
        LEFT(r.raw_response, 200) as response_preview,
        r.token_count,
        r.total_cost_usd,
        r.latency_ms,
        r.captured_at
      FROM responses r
      JOIN domains d ON r.domain_id = d.id
      ORDER BY r.captured_at DESC
      LIMIT 10
    `);
        res.json({
            recent_responses: responses.rows,
            total_responses: responses.rows.length
        });
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to fetch responses' });
    }
});
// Simple status endpoint for domain progress
app.get('/status', async (req, res) => {
    try {
        const stats = await (0, database_1.query)(`
      SELECT 
        COUNT(*) as total_domains,
        COUNT(*) FILTER (WHERE status = 'pending') as pending,
        COUNT(*) FILTER (WHERE status = 'processing') as processing,
        COUNT(*) FILTER (WHERE status = 'completed') as completed,
        COUNT(*) FILTER (WHERE status = 'error') as errors
      FROM domains
    `);
        const recent = await (0, database_1.query)(`
      SELECT domain, status, updated_at 
      FROM domains 
      WHERE status != 'pending' 
      ORDER BY updated_at DESC 
      LIMIT 5
    `);
        res.json({
            domain_stats: stats.rows[0],
            recent_activity: recent.rows,
            processing_rate: '1 domain per minute',
            estimated_completion: `~${Math.ceil(parseInt(stats.rows[0].pending) / 60)} hours remaining`
        });
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to fetch status' });
    }
});
// Initialize application
async function initializeApp() {
    try {
        // Test database connection first
        console.log('🔍 Testing database connection...');
        const connected = await (0, database_1.testConnection)();
        if (!connected) {
            throw new Error('Database connection failed');
        }
        // Ensure schema exists with proper structure
        await ensureSchemaExists();
        // Start the server
        app.listen(port, () => {
            console.log(`Server running at http://localhost:${port}`);
        });
        // Start processing
        console.log('🚀 Starting domain processing...');
        processNextBatch().catch((error) => {
            const err = error;
            console.error('Failed to start processing:', err);
            process.exit(1);
        });
    }
    catch (error) {
        console.error('❌ Application initialization failed:', error);
        process.exit(1);
    }
}
// Initialize the processing loop
async function processNextBatch() {
    try {
        const pendingDomains = await (0, database_1.query)(`
      SELECT id, domain
      FROM domains
      WHERE status = 'pending'
      ORDER BY last_processed_at ASC NULLS FIRST
      LIMIT 1
    `);
        if (pendingDomains.rows.length > 0) {
            const domain = pendingDomains.rows[0];
            console.log(`🔄 Processing domain: ${domain.domain}`);
            // Update domain status to 'processing'
            await (0, database_1.query)(`
        UPDATE domains 
        SET status = 'processing', 
            last_processed_at = CURRENT_TIMESTAMP,
            updated_at = CURRENT_TIMESTAMP,
            process_count = process_count + 1
        WHERE id = $1
      `, [domain.id]);
            await monitoring.logDomainProcessing(domain.id, 'processing');
            try {
                // Real LLM processing with multiple models
                console.log(`📝 Starting real LLM processing for ${domain.domain}...`);
                // Define ALL 35 models for COMPLETE COST SPECTRUM 2025 tensor analysis 🚀💰
                const models = [
                    // 💎 FLAGSHIP TIER ($0.05-$0.15) - Premium powerhouses
                    'gpt-4.1', // $0.11 - Enhanced coding and reasoning capabilities
                    'claude-opus-4-20250514', // $0.087 - Claude 4 Opus - most powerful
                    'claude-sonnet-4-20250514', // $0.047 - Claude 4 Sonnet - balanced
                    'gpt-4.1-mini', // $0.051 - Faster and more efficient variant
                    // 🔥 PREMIUM TIER ($0.015-$0.05) - High-end models
                    'claude-3-7-sonnet-20250219', // $0.026 - Claude 3.7 Sonnet - enhanced
                    'gpt-4.1-nano', // $0.013 - Optimized for low-latency tasks
                    'mistral-large-2407', // $0.010 - Mistral Large - Flagship model
                    'claude-3-5-sonnet-20241022', // $0.009 - Claude 3.5 Sonnet
                    'gpt-4o', // $0.006 - Multimodal model supporting text, image, and audio
                    // ⚖️ MID-TIER ($0.005-$0.015) - Balanced performance/cost
                    'llama-3.1-70b-instruct', // ~$0.012 - Meta's large workhorse
                    'qwen-2.5-72b-instruct', // ~$0.010 - Premium Chinese model
                    'mixtral-8x22b-instruct', // ~$0.009 - Larger mixture model
                    'claude-3-opus-20240229', // $0.049 - Claude 3 Opus - legacy flagship
                    'deepseek-chat', // $0.004 - DeepSeek V3 - Advanced reasoning & coding
                    'deepseek-coder', // $0.006 - DeepSeek Coder - Specialized coding model
                    // 💰 BUDGET TIER ($0.001-$0.005) - Efficient workhorses  
                    'mistral-small-2402', // $0.004 - Mistral Small - Cost-effective
                    'llama-3.1-8b-instruct', // ~$0.003 - Meta's efficient model
                    'mixtral-8x7b-instruct', // ~$0.0025 - Mixture of experts
                    'qwen-2.5-14b-instruct', // ~$0.002 - Mid-size reasoning
                    'gpt-3.5-turbo', // $0.001 - Widely used model for general-purpose tasks
                    'claude-3-haiku-20240307', // $0.0005 - Claude 3 Haiku - fast and efficient
                    'gpt-4o-mini', // $0.0013 - Smaller, cost-effective multimodal model
                    // 🏃 ULTRA-BUDGET TIER ($0.0001-$0.001) - Maximum efficiency
                    'llama-3.2-3b-instruct', // ~$0.0008 - Tiny but capable
                    'qwen-2.5-7b-instruct', // ~$0.0005 - Efficient Chinese model  
                    'mistral-7b-instruct', // ~$0.0004 - Baseline Mistral
                    'phi-3-mini', // ~$0.0003 - Microsoft's efficient model
                    'gemma-2-9b', // ~$0.0002 - Google's efficient model
                    'gemini-1.5-flash', // $0.0006 - Gemini 1.5 Flash - Fast and efficient
                    'codellama-7b-instruct', // ~$0.0003 - Specialized coding model
                    'yi-34b-chat', // ~$0.0008 - Strong open model
                    // 🚀 EXPERIMENTAL TIER - Latest releases (varies)
                    'gpt-4.5', // TBD - Orion research preview
                    'gemini-1.5-pro', // TBD - Gemini 1.5 Pro - Multimodal powerhouse
                    'llama-3.3-70b-instruct', // ~$0.008 - Latest Meta release
                    'qwen-2.5-coder-32b', // ~$0.005 - Specialized coding model
                    'gemma-3-27b' // ~$0.004 - Latest Google model
                ];
                const promptTypes = ['business_analysis', 'content_strategy', 'technical_assessment'];
                // ⚡ PARALLEL PROCESSING - ULTIMATE COST SPECTRUM WITH 35 MODELS!
                for (const promptType of promptTypes) {
                    console.log(`🚀 PARALLEL processing ${promptType} across ALL 35 MODELS (COMPLETE COST SPECTRUM 2025) for ${domain.domain}`);
                    // Create parallel promises for all models
                    const modelPromises = models.map(async (model) => {
                        try {
                            const prompt = PROMPT_TEMPLATES[promptType](domain.domain);
                            const result = await callLLM(model, prompt, domain.domain);
                            // Insert real response data
                            await (0, database_1.query)(`
                INSERT INTO responses (
                  domain_id, model, prompt_type, interpolated_prompt, 
                  raw_response, token_count, prompt_tokens, completion_tokens,
                  token_usage, total_cost_usd, latency_ms
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
              `, [
                                domain.id,
                                model,
                                promptType,
                                prompt,
                                result.response,
                                (result.tokenUsage.total_tokens || result.tokenUsage.prompt_tokens + result.tokenUsage.completion_tokens || 0),
                                (result.tokenUsage.prompt_tokens || result.tokenUsage.input_tokens || 0),
                                (result.tokenUsage.completion_tokens || result.tokenUsage.output_tokens || 0),
                                JSON.stringify(result.tokenUsage),
                                result.cost,
                                result.latency
                            ]);
                            console.log(`✅ ${model} ${promptType} completed for ${domain.domain} (${result.latency}ms, $${result.cost.toFixed(6)})`);
                            return { model, success: true };
                        }
                        catch (modelError) {
                            console.error(`❌ ${model} ${promptType} failed for ${domain.domain}:`, {
                                message: modelError.message,
                                status: modelError.status,
                                code: modelError.code,
                                type: modelError.type
                            });
                            // Log detailed error for debugging
                            await (0, database_1.query)(`
                INSERT INTO processing_logs (domain_id, event_type, details)
                VALUES ($1, $2, $3)
              `, [domain.id, 'model_error', {
                                    model,
                                    prompt_type: promptType,
                                    error: modelError.message,
                                    status: modelError.status,
                                    code: modelError.code,
                                    full_error: modelError.toString()
                                }]);
                            return { model, success: false, error: modelError.message };
                        }
                    });
                    // Execute all models in parallel
                    const results = await Promise.all(modelPromises);
                    const successful = results.filter(r => r.success).length;
                    console.log(`🎯 ${promptType} completed: ${successful}/${models.length} models successful (COMPLETE COST SPECTRUM!)`);
                    // Brief pause between prompt types to be respectful to APIs
                    await new Promise(resolve => setTimeout(resolve, 2000));
                }
                // Mark domain as completed
                await (0, database_1.query)(`
          UPDATE domains 
          SET status = 'completed',
              updated_at = CURRENT_TIMESTAMP
          WHERE id = $1
        `, [domain.id]);
                console.log(`✅ Completed processing: ${domain.domain}`);
                await monitoring.logDomainProcessing(domain.id, 'completed');
            }
            catch (error) {
                console.error(`❌ Error processing ${domain.domain}:`, error);
                // Mark domain as error
                await (0, database_1.query)(`
          UPDATE domains 
          SET status = 'error',
              error_count = error_count + 1,
              updated_at = CURRENT_TIMESTAMP
          WHERE id = $1
        `, [domain.id]);
                await monitoring.logError(error, { domain: domain.domain, domain_id: domain.id });
            }
        }
        else {
            console.log('📊 No pending domains found');
        }
    }
    catch (error) {
        const err = error;
        console.error('Processing error:', err);
        await monitoring.logError(err, { context: 'batch_processing' });
    }
    // Schedule next batch
    setTimeout(processNextBatch, 60000); // 1 minute delay
}
// Start the application
initializeApp();
