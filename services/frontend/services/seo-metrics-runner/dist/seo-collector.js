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
exports.SEOCollector = void 0;
const axios_1 = __importDefault(require("axios"));
const cheerio = __importStar(require("cheerio"));
// Stealth configuration
const STEALTH_CONFIG = {
    userAgents: [
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
    ],
    requestDelay: 3000,
    timeout: 15000
};
class SEOCollector {
    constructor() {
        this.lastRequest = 0;
    }
    async makeRequest(url) {
        // Rate limiting - respect server resources
        const now = Date.now();
        const timeSince = now - this.lastRequest;
        if (timeSince < STEALTH_CONFIG.requestDelay) {
            await new Promise(resolve => setTimeout(resolve, STEALTH_CONFIG.requestDelay - timeSince));
        }
        const userAgent = STEALTH_CONFIG.userAgents[Math.floor(Math.random() * STEALTH_CONFIG.userAgents.length)];
        console.log(`🔍 Collecting: ${url}`);
        const response = await axios_1.default.get(url, {
            headers: { 'User-Agent': userAgent },
            timeout: STEALTH_CONFIG.timeout,
            validateStatus: () => true // Accept all status codes for analysis
        });
        this.lastRequest = Date.now();
        return response;
    }
    async collectSEOMetrics(domain) {
        const startTime = Date.now();
        const url = `https://${domain}`;
        try {
            const response = await this.makeRequest(url);
            const $ = cheerio.load(response.data || '');
            // Extract schema markup types
            const schemas = [];
            $('script[type="application/ld+json"]').each((_, el) => {
                try {
                    const json = JSON.parse($(el).html() || '');
                    if (json['@type'])
                        schemas.push(json['@type']);
                }
                catch (e) {
                    // Ignore malformed JSON
                }
            });
            // Count internal vs external links
            let internalLinks = 0;
            let externalLinks = 0;
            $('a[href]').each((_, el) => {
                const href = $(el).attr('href');
                if (href) {
                    if (href.startsWith('/') || href.includes(domain)) {
                        internalLinks++;
                    }
                    else if (href.startsWith('http')) {
                        externalLinks++;
                    }
                }
            });
            const metrics = {
                domain,
                httpStatusCode: response.status,
                pageLoadTime: Date.now() - startTime,
                pageSize: response.data ? response.data.length : 0,
                domNodes: $('*').length,
                httpsEnabled: url.startsWith('https://'),
                metaTitle: $('title').length > 0,
                metaDescription: $('meta[name="description"]').length > 0,
                h1Count: $('h1').length,
                imageCount: $('img').length,
                schemaMarkup: [...new Set(schemas)],
                mobileViewport: $('meta[name="viewport"]').length > 0,
                internalLinks,
                externalLinks,
                capturedAt: new Date()
            };
            console.log(`✅ ${domain}: ${metrics.httpStatusCode}, ${metrics.pageLoadTime}ms, ${schemas.length} schemas`);
            return metrics;
        }
        catch (error) {
            console.error(`❌ Failed ${domain}:`, error.message);
            throw error;
        }
    }
}
exports.SEOCollector = SEOCollector;
//# sourceMappingURL=seo-collector.js.map