"use strict";
// 🚀 FORCE RENDER CACHE BUST: Deployment timestamp 2025-06-09T05:58:00Z - Build ID: CACHE_BREAKER_565_DOMAINS
// 🔥 ULTRA NUCLEAR CACHE BUST: Version 2.0.0 - Force Rebuild - 565 Premium Domains
// 🚨 RENDER PLATFORM BUG WORKAROUND: Multiple cache busters deployed
// 💥 BUILD_ID: ULTRA_NUCLEAR_565_DOMAINS_2025_06_09_06_02
// 🎯 DOMAIN_COUNT_VERIFICATION: Should be 565 not 350
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
const domainManagerIntegration_1 = require("./integration/domainManagerIntegration");
// Load environment variables
dotenv.config();
// 🚀 DUAL OpenAI clients for maximum ultra-budget reliability
const openaiKeys = [process.env.OPENAI_API_KEY, process.env.OPENAI_API_KEY2].filter(Boolean);
const openaiClients = openaiKeys.map(key => new openai_1.default({ apiKey: key }));
// Smart OpenAI client rotation for load balancing
function getOpenAIClient() {
    const randomIndex = Math.floor(Math.random() * openaiClients.length);
    return openaiClients[randomIndex] || openaiClients[0];
}
// Fallback for legacy code
const openai = getOpenAIClient();
// 🏆 DUAL Anthropic clients for CHAMPION MODEL claude-3-haiku 2X POWER!
const anthropicKeys = [process.env.ANTHROPIC_API_KEY, process.env.ATHROPTIC_API_KEY2].filter(Boolean);
const anthropicClients = anthropicKeys.map(key => new sdk_1.default({ apiKey: key }));
// Smart Anthropic client rotation for claude-3-haiku DOMINATION
function getAnthropicClient() {
    const randomIndex = Math.floor(Math.random() * anthropicClients.length);
    return anthropicClients[randomIndex] || anthropicClients[0];
}
// Fallback for legacy code
const anthropic = getAnthropicClient();
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
// 🚀 Grok/X.AI client for ultra-cheap models
const grokClient = axios_1.default.create({
    baseURL: 'https://api.x.ai/v1',
    headers: {
        'Authorization': `Bearer ${process.env.XAI_API_KEY}`,
        'Content-Type': 'application/json'
    },
    timeout: 30000
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
    // 🚀 COMPLETE PREMIUM DOMAIN LIST - 500+ DOMAINS ACROSS 25 SECTORS 🚀
    // Representing $20+ TRILLION market cap for maximum business intelligence diversity
    const domains = [
        // 📊 FOUNDATION DOMAINS (Original high-volume traffic)
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
        'netlify.app', 'yandex.com', 'mashable.com', 'ebay.com', 'etsy.com', 'walmart.com',
        // 🚀 AI/ML POWERHOUSES ($3T+ market cap)
        'openai.com', 'anthropic.com', 'huggingface.co', 'midjourney.com', 'stability.ai',
        'character.ai', 'perplexity.ai', 'replicate.com', 'runwayml.com', 'cohere.com',
        'together.ai', 'fireworks.ai', 'adept.ai', 'inflection.ai', 'mistral.ai',
        'deepmind.com', 'scale.com', 'databricks.com', 'snowflake.com', 'palantir.com',
        'c3.ai', 'ai21.com', 'jasper.ai', 'copy.ai', 'writesonic.com',
        'synthesia.io', 'luma.ai', 'pika.art', 'elevenlabs.io', 'udio.com',
        // ☁️ CLOUD INFRASTRUCTURE TITANS ($2T+ market cap)
        'aws.amazon.com', 'cloud.google.com', 'azure.microsoft.com', 'digitalocean.com', 'linode.com',
        'vultr.com', 'hetzner.com', 'contabo.com', 'ovhcloud.com', 'scaleway.com',
        'fly.io', 'render.com', 'vercel.com', 'railway.app', 'planetscale.com',
        'supabase.com', 'firebase.google.com', 'mongodb.com', 'redis.com', 'elasticsearch.com',
        'docker.com', 'kubernetes.io', 'helm.sh', 'terraform.io', 'pulumi.com',
        'grafana.com', 'datadog.com', 'newrelic.com', 'splunk.com', 'elastic.co',
        // 💸 FINTECH REVOLUTION ($1.5T+ market cap)
        'stripe.com', 'paypal.com', 'square.com', 'wise.com', 'revolut.com',
        'klarna.com', 'affirm.com', 'robinhood.com', 'coinbase.com', 'binance.com',
        'kraken.com', 'ftx.com', 'gemini.com', 'crypto.com', 'blockchain.com',
        'circle.com', 'ripple.com', 'opensea.io', 'uniswap.org', 'aave.com',
        'compound.finance', 'makerdao.com', 'chainlink.com', 'solana.com', 'ethereum.org',
        'polygon.technology', 'avalanche.network', 'cardano.org', 'algorand.com', 'terra.money',
        // 🚗 EV/AUTONOMOUS VEHICLES ($800B+ market cap)
        'tesla.com', 'rivian.com', 'lucidmotors.com', 'nio.com', 'xpeng.com',
        'byd.com', 'waymo.com', 'cruise.com', 'uber.com', 'lyft.com',
        'grab.com', 'didi.com', 'ola.com', 'lime.com', 'bird.com',
        'getaround.com', 'turo.com', 'zipcar.com', 'chargepoint.com', 'evgo.com',
        // 🏥 HEALTH/FITNESS TECH ($600B+ market cap)
        'teladoc.com', 'doximity.com', 'veracyte.com', 'moderna.com', 'biontech.se',
        'illumina.com', '23andme.com', 'crispr.com', 'editas.com', 'intellia.com',
        'peloton.com', 'fitbit.com', 'whoop.com', 'oura.com', 'strava.com',
        'myfitnesspal.com', 'headspace.com', 'calm.com', 'mindfulness.com', 'betterhelp.com',
        // 🎮 GAMING/METAVERSE ($400B+ market cap)
        'roblox.com', 'epicgames.com', 'steam.com', 'minecraft.net', 'fortnite.com',
        'unity.com', 'unrealengine.com', 'oculus.com', 'meta.com', 'sandbox.game',
        'decentraland.org', 'axieinfinity.com', 'enjin.io', 'immutable.com', 'polygon.technology',
        'activision.com', 'ea.com', 'ubisoft.com', 'take2games.com', 'nintendo.com',
        // 🎓 EDTECH/LEARNING ($200B+ market cap)
        'coursera.org', 'udemy.com', 'edx.org', 'khanacademy.org', 'skillshare.com',
        'masterclass.com', 'pluralsight.com', 'lynda.com', 'codecademy.com', 'freecodecamp.org',
        'duolingo.com', 'babbel.com', 'rosettastone.com', 'chegg.com', 'pearson.com',
        // 🏢 ENTERPRISE SOFTWARE ($1T+ market cap)
        'salesforce.com', 'oracle.com', 'sap.com', 'workday.com', 'servicenow.com',
        'atlassian.com', 'slack.com', 'zoom.us', 'teams.microsoft.com', 'discord.com',
        'notion.so', 'airtable.com', 'monday.com', 'asana.com', 'trello.com',
        // 🛒 E-COMMERCE GIANTS ($2T+ market cap)
        'amazon.com', 'shopify.com', 'ebay.com', 'etsy.com', 'alibaba.com',
        'jd.com', 'pinduoduo.com', 'mercadolibre.com', 'flipkart.com', 'rakuten.com',
        'wayfair.com', 'overstock.com', 'wish.com', 'temu.com', 'shein.com',
        // 📱 SOCIAL MEDIA EVOLUTION ($1.5T+ market cap)
        'facebook.com', 'instagram.com', 'twitter.com', 'threads.net', 'tiktok.com',
        'snapchat.com', 'linkedin.com', 'pinterest.com', 'reddit.com', 'discord.com',
        'telegram.org', 'signal.org', 'whatsapp.com', 'wechat.com', 'line.me',
        'clubhouse.com', 'mastodon.social', 'bluesky.app', 'substack.com', 'medium.com',
        // 🎬 STREAMING/ENTERTAINMENT ($500B+ market cap)
        'netflix.com', 'disney.com', 'hbo.com', 'paramount.com', 'peacocktv.com',
        'hulu.com', 'amazon.com/prime', 'apple.com/tv', 'youtube.com', 'twitch.tv',
        'spotify.com', 'apple.com/music', 'soundcloud.com', 'tidal.com', 'deezer.com',
        // 🏠 PROPTECH/REAL ESTATE ($300B+ market cap)
        'zillow.com', 'redfin.com', 'realtor.com', 'apartments.com', 'rent.com',
        'airbnb.com', 'vrbo.com', 'booking.com', 'expedia.com', 'kayak.com',
        'compass.com', 'opendoor.com', 'offerpad.com', 'remax.com', 'coldwellbanker.com',
        // 🚚 LOGISTICS/DELIVERY ($400B+ market cap)
        'fedex.com', 'ups.com', 'dhl.com', 'usps.com', 'amazon.com/logistics',
        'doordash.com', 'ubereats.com', 'grubhub.com', 'instacart.com', 'shipt.com',
        'postmates.com', 'seamless.com', 'deliveroo.com', 'justeat.com', 'zomato.com',
        // 🔒 CYBERSECURITY ($200B+ market cap)
        'crowdstrike.com', 'paloaltonetworks.com', 'fortinet.com', 'checkpoint.com', 'zscaler.com',
        'okta.com', 'auth0.com', 'duo.com', 'onelogin.com', 'ping.com',
        'symantec.com', 'mcafee.com', 'trendmicro.com', 'kaspersky.com', 'bitdefender.com',
        // 🌐 WEB3/BLOCKCHAIN ($300B+ market cap)
        'ethereum.org', 'bitcoin.org', 'solana.com', 'polygon.technology', 'avalanche.network',
        'chainlink.com', 'uniswap.org', 'opensea.io', 'metamask.io', 'coinbase.com',
        'binance.com', 'kraken.com', 'gemini.com', 'crypto.com', 'blockchain.com',
        // 🛡️ PRIVACY/VPN ($50B+ market cap)
        'nordvpn.com', 'expressvpn.com', 'surfshark.com', 'protonvpn.com', 'mullvad.net',
        'duckduckgo.com', 'brave.com', 'tor.org', 'signal.org', 'protonmail.com',
        // 📈 ANALYTICS/DATA ($150B+ market cap)
        'google.com/analytics', 'adobe.com/analytics', 'mixpanel.com', 'amplitude.com', 'segment.com',
        'tableau.com', 'powerbi.microsoft.com', 'looker.com', 'qlik.com', 'sisense.com',
        // 🎨 DESIGN/CREATIVE ($100B+ market cap)
        'adobe.com', 'figma.com', 'canva.com', 'sketch.com', 'invision.com',
        'dribbble.com', 'behance.net', 'unsplash.com', 'pexels.com', 'shutterstock.com',
        // 💼 PRODUCTIVITY/COLLABORATION ($200B+ market cap)
        'google.com/workspace', 'microsoft.com/office', 'notion.so', 'obsidian.md', 'roam.com',
        'airtable.com', 'monday.com', 'asana.com', 'trello.com', 'basecamp.com',
        // 🏦 TRADITIONAL FINANCE DIGITAL ($1T+ market cap)
        'jpmorgan.com', 'bankofamerica.com', 'wellsfargo.com', 'citibank.com', 'goldmansachs.com',
        'morganstanley.com', 'blackrock.com', 'vanguard.com', 'fidelity.com', 'schwab.com',
        // 🌟 EMERGING TECH/STARTUPS ($100B+ market cap)
        'spacex.com', 'starlink.com', 'neuralink.com', 'boring.com', 'hyperloop.com',
        'relativity.space', 'rocket-lab.com', 'virgin.com/galactic', 'blueorigin.com', 'axiom.space',
        // 🌶️ CONTROVERSIAL/POLARIZING (Maximum response diversity)
        'infowars.com', 'breitbart.com', 'truthsocial.com', 'parler.com', 'gab.com',
        'rt.com', 'aljazeera.com', '4chan.org', 'wikileaks.org', 'rumble.com'
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
            // 🚀 Smart OpenAI API call with dual key rotation
            const selectedOpenAI = getOpenAIClient();
            const completion = await selectedOpenAI.chat.completions.create({
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
            // 🏆 Smart Anthropic API call with dual key rotation for CHAMPION claude-3-haiku!
            const selectedAnthropic = getAnthropicClient();
            const message = await selectedAnthropic.messages.create({
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
        else if (model.includes('meta-llama') || model.includes('mistralai') || model.includes('NousResearch') || model.includes('CodeLlama')) {
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
            if (model.includes('70B') || model.includes('72B')) {
                cost = promptTokens * 0.000008 + completionTokens * 0.000015; // Large models
            }
            else if (model.includes('34B') || model.includes('22B')) {
                cost = promptTokens * 0.000005 + completionTokens * 0.000010; // Mid-size models
            }
            else if (model.includes('8B') || model.includes('7B') || model.includes('9B')) {
                cost = promptTokens * 0.0000015 + completionTokens * 0.000003; // Small models
            }
            else if (model.includes('3B')) {
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
        else if (model.includes('grok')) {
            // 🚀 Grok/X.AI API call (OpenAI-compatible)
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
            // Grok pricing (ultra-competitive)
            let cost = 0;
            if (model.includes('grok-2')) {
                cost = promptTokens * 0.000005 + completionTokens * 0.000015; // Grok 2 pricing
            }
            else if (model.includes('grok-beta')) {
                cost = promptTokens * 0.000005 + completionTokens * 0.000015; // Grok Beta pricing
            }
            else {
                cost = promptTokens * 0.000005 + completionTokens * 0.000015; // Default Grok pricing
            }
            return {
                response: response.data.choices[0]?.message?.content || 'No response',
                tokenUsage: usage,
                cost: cost,
                latency: latency
            };
        }
        else if (model.includes('Qwen') || model.includes('microsoft') || model.includes('google/gemma')) {
            // 🔧 FIXED: Route to Together AI instead of Hugging Face
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
            // Ultra-budget model pricing (Together AI rates)
            let cost = 0;
            if (model.includes('72B') || model.includes('70B')) {
                cost = promptTokens * 0.000008 + completionTokens * 0.000012; // Large Qwen models
            }
            else if (model.includes('32B') || model.includes('27B')) {
                cost = promptTokens * 0.000003 + completionTokens * 0.000006; // Mid Qwen/Gemma models
            }
            else if (model.includes('14B') || model.includes('9B')) {
                cost = promptTokens * 0.000001 + completionTokens * 0.000002; // Small models
            }
            else if (model.includes('7B') || model.includes('3B')) {
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
            message: '🎉 PREMIUM DOMAIN SEEDING COMPLETE! 500+ domains across 25 sectors',
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
// JOLT MIGRATION ENDPOINT - Run once to add JOLT metadata support
app.post('/migrate-jolt', async (req, res) => {
    try {
        console.log('🔧 Running JOLT metadata migration...');
        // Run the migration SQL
        await (0, database_1.query)(`
      BEGIN;
      
      -- Add JOLT metadata to domains table (all optional, defaults safe)
      ALTER TABLE domains 
      ADD COLUMN IF NOT EXISTS is_jolt BOOLEAN DEFAULT FALSE;
      
      ALTER TABLE domains 
      ADD COLUMN IF NOT EXISTS jolt_type TEXT;
      
      ALTER TABLE domains 
      ADD COLUMN IF NOT EXISTS jolt_severity TEXT 
      CHECK (jolt_severity IS NULL OR jolt_severity IN ('low', 'medium', 'high', 'critical'));
      
      ALTER TABLE domains 
      ADD COLUMN IF NOT EXISTS jolt_additional_prompts INTEGER DEFAULT 0;
      
      -- Add cost tracking to responses table (optional)
      ALTER TABLE responses
      ADD COLUMN IF NOT EXISTS cost_usd DECIMAL(10,6);
      
      -- Create index for JOLT queries (only affects JOLT domains)
      CREATE INDEX IF NOT EXISTS idx_domains_jolt ON domains(is_jolt) WHERE is_jolt = TRUE;
      
      COMMIT;
    `);
        // Insert key JOLT domains
        const joltDomains = [
            { domain: 'apple.com', type: 'leadership_change', severity: 'critical', prompts: 8 },
            { domain: 'theranos.com', type: 'corporate_collapse', severity: 'critical', prompts: 7 },
            { domain: 'facebook.com', type: 'brand_transition', severity: 'high', prompts: 6 },
            { domain: 'twitter.com', type: 'brand_transition', severity: 'critical', prompts: 8 },
            { domain: 'tesla.com', type: 'leadership_controversy', severity: 'high', prompts: 6 }
        ];
        let joltSeeded = 0;
        for (const jolt of joltDomains) {
            const result = await (0, database_1.query)(`
        INSERT INTO domains (domain, is_jolt, jolt_type, jolt_severity, jolt_additional_prompts)
        VALUES ($1, TRUE, $2, $3, $4)
        ON CONFLICT (domain) DO UPDATE SET
          is_jolt = TRUE,
          jolt_type = EXCLUDED.jolt_type,
          jolt_severity = EXCLUDED.jolt_severity,
          jolt_additional_prompts = EXCLUDED.jolt_additional_prompts
        RETURNING (xmax = 0) AS inserted
      `, [jolt.domain, jolt.type, jolt.severity, jolt.prompts]);
            if (result.rows[0].inserted)
                joltSeeded++;
        }
        res.json({
            success: true,
            message: '🎉 JOLT metadata migration complete!',
            changes: [
                'Added is_jolt, jolt_type, jolt_severity, jolt_additional_prompts to domains table',
                'Added cost_usd to responses table',
                'Created JOLT domain index'
            ],
            jolt_domains_seeded: joltSeeded,
            note: 'All changes are optional - existing data unchanged'
        });
    }
    catch (error) {
        console.error('❌ JOLT migration failed:', error);
        res.status(500).json({
            success: false,
            error: 'JOLT migration failed',
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
        // 🚀 ADD DYNAMIC DOMAIN MANAGEMENT (with graceful fallback)
        try {
            await (0, domainManagerIntegration_1.runDomainManagerMigration)(database_1.pool);
            const domainManager = (0, domainManagerIntegration_1.integrateDomainManager)(app, database_1.pool);
            console.log('✅ Dynamic domain management integrated');
        }
        catch (error) {
            console.error('⚠️ Domain management integration failed, continuing with basic functionality:', error);
            console.log('💡 System will operate normally, domain management features unavailable');
        }
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
        // 🚀 5X THROTTLE TEST: Process 5 domains concurrently instead of 1
        const pendingDomains = await (0, database_1.query)(`
      SELECT id, domain
      FROM domains
      WHERE status = 'pending'
      ORDER BY last_processed_at ASC NULLS FIRST
      LIMIT 5
    `);
        if (pendingDomains.rows.length > 0) {
            console.log(`🚀 5X THROTTLE: Processing ${pendingDomains.rows.length} domains concurrently!`);
            // Process all domains in parallel
            const domainPromises = pendingDomains.rows.map(async (domain) => {
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
                    // 💰 ULTRA-BUDGET FOCUS: 15 CHEAPEST WORKING MODELS + GROK
                    const models = [
                        // 🏆 PROVEN ULTRA-CHEAP CHAMPIONS (Your best performers!)
                        'claude-3-haiku-20240307', // 🥇 1,055 responses - $0.00000025 input - CHAMPION!
                        'deepseek-chat', // 🥈 954 responses - $0.000002 input - Ultra-smart + cheap
                        'deepseek-coder', // 🥉 953 responses - $0.000002 input - Coding specialist
                        'mistral-small-2402', // 🏃 955 responses - $0.000002 input - European efficiency
                        'meta-llama/Meta-Llama-3.1-8B-Instruct-Turbo', // 🦙 850 responses - $0.0000015 input
                        'gpt-4o-mini', // 💎 983 responses - $0.0000015 input - OpenAI budget
                        'gpt-3.5-turbo', // 🔧 970 responses - $0.000001 input - Reliable workhorse
                        'meta-llama/Meta-Llama-3.1-70B-Instruct-Turbo', // 🦙 855 responses - $0.000008 input - Larger but cheap
                        // 🚀 GROK MODELS - Missing from your setup!
                        'grok-beta', // $0.000005 input + $0.000015 output - X.AI API
                        'grok-2', // TBD pricing - likely similar to grok-beta
                        // 🔧 FIXED TOGETHER AI MODELS (Previously failed due to wrong routing)
                        'Qwen/Qwen2.5-14B-Instruct', // Fixed: Route to Together AI - $0.000003 input
                        'Qwen/Qwen2.5-7B-Instruct', // Fixed: Route to Together AI - $0.0000008 input  
                        'mistralai/Mixtral-8x7B-Instruct-v0.1', // Fixed: Route to Together AI - $0.0000006 input
                        'microsoft/Phi-3-mini-4k-instruct', // Fixed: Route to Together AI - $0.0000001 input
                        'google/gemma-2-9b-it', // Fixed: Route to Together AI - $0.0000003 input
                    ];
                    const promptTypes = ['business_analysis', 'content_strategy', 'technical_assessment'];
                    // 💰 PARALLEL PROCESSING - ULTRA-BUDGET FOCUS WITH 15 CHEAPEST MODELS!
                    for (const promptType of promptTypes) {
                        console.log(`💰 PARALLEL processing ${promptType} across 15 ULTRA-BUDGET MODELS + GROK for ${domain.domain}`);
                        // Create parallel promises for all models
                        const modelPromises = models.map(async (model) => {
                            try {
                                const prompt = PROMPT_TEMPLATES[promptType](domain.domain);
                                const result = await callLLM(model, prompt, domain.domain);
                                // Insert real response data (including JOLT cost tracking)
                                await (0, database_1.query)(`
                  INSERT INTO responses (
                    domain_id, model, prompt_type, interpolated_prompt, 
                    raw_response, token_count, prompt_tokens, completion_tokens,
                    token_usage, total_cost_usd, latency_ms, cost_usd
                  ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
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
                                    result.latency,
                                    result.cost // Store cost in new JOLT cost tracking field
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
                        console.log(`💰 ${promptType} completed: ${successful}/${models.length} models successful (ULTRA-BUDGET FOCUS!)`);
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
            });
            // Wait for all domains to complete
            await Promise.all(domainPromises);
            console.log(`🎉 5X THROTTLE: Completed batch of ${pendingDomains.rows.length} domains!`);
            // 🔄 CONTINUE PROCESSING: Schedule next batch if more domains remain
            console.log('🔄 Checking for more pending domains...');
            setTimeout(processNextBatch, 12000); // Continue processing
        }
        else {
            console.log('🎉 ALL DOMAINS PROCESSED! No more pending domains - STOPPING INFINITE LOOP!');
            console.log('💰 Processing complete - no more API costs will be incurred');
            console.log('🏁 Service will remain running for API endpoints, but no more LLM processing');
            // NO MORE setTimeout - STOP THE LOOP!
        }
    }
    catch (error) {
        const err = error;
        console.error('Processing error:', err);
        await monitoring.logError(err, { context: 'batch_processing' });
        // Even on error, stop the loop if no more work
        const pendingCheck = await (0, database_1.query)(`SELECT COUNT(*) as count FROM domains WHERE status = 'pending'`);
        if (parseInt(pendingCheck.rows[0].count) === 0) {
            console.log('🛑 No pending domains found after error - STOPPING LOOP');
            return; // Stop the infinite loop
        }
        // Only retry if there are still pending domains
        setTimeout(processNextBatch, 12000);
    }
}
// Start the application
initializeApp();
