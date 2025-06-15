"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.newsScanner = exports.NewsScanner = void 0;
const xml2js = require('xml2js');
// Simple sentiment analysis
function analyzeSentiment(text) {
    const positiveWords = ['good', 'great', 'excellent', 'successful', 'positive', 'growth', 'profit', 'award'];
    const negativeWords = ['bad', 'crisis', 'scandal', 'fraud', 'loss', 'decline', 'lawsuit', 'investigation', 'fail'];
    const words = text.toLowerCase().split(/\s+/);
    let score = 0;
    words.forEach(word => {
        if (positiveWords.includes(word))
            score += 1;
        if (negativeWords.includes(word))
            score -= 1;
    });
    return Math.max(-1, Math.min(1, score / words.length * 10));
}
class NewsScanner {
    constructor() {
        this.crisisKeywords = [
            'scandal', 'investigation', 'lawsuit', 'recall', 'crisis',
            'bankruptcy', 'fraud', 'resignation', 'layoffs', 'closure',
            'whistleblower', 'regulatory action', 'FDA warning', 'SEC investigation',
            'data breach', 'cyber attack', 'hack', 'fine', 'penalty'
        ];
        this.eventTypeMap = {
            'leadership': ['resignation', 'CEO', 'fired', 'stepped down', 'leaves', 'departure'],
            'scandal': ['scandal', 'fraud', 'investigation', 'whistleblower'],
            'regulatory': ['FDA', 'SEC', 'fine', 'penalty', 'regulatory', 'violation'],
            'security': ['data breach', 'hack', 'cyber attack', 'security'],
            'financial': ['bankruptcy', 'layoffs', 'losses', 'revenue', 'earnings'],
            'product': ['recall', 'defect', 'safety', 'withdrawal']
        };
    }
    // Scan Google News RSS for domain-related crisis events
    async scanGoogleNews(domains) {
        const events = [];
        for (const domain of domains) {
            try {
                // Create crisis-focused search queries
                const queries = [
                    `"${domain}" crisis`,
                    `"${domain}" scandal`,
                    `"${domain}" investigation`,
                    `"${domain}" lawsuit`,
                    `"${domain}" resignation`
                ];
                for (const query of queries) {
                    const encodedQuery = encodeURIComponent(query);
                    const rssUrl = `https://news.google.com/rss/search?q=${encodedQuery}&hl=en&gl=US&ceid=US:en`;
                    try {
                        const response = await fetch(rssUrl);
                        if (!response.ok)
                            continue;
                        const xmlText = await response.text();
                        const parsed = await xml2js.parseStringPromise(xmlText);
                        const items = parsed?.rss?.channel?.[0]?.item || [];
                        for (const item of items.slice(0, 5)) { // Limit to recent articles
                            const headline = item.title?.[0] || '';
                            const link = item.link?.[0] || '';
                            const pubDate = item.pubDate?.[0] || '';
                            if (this.isRelevantCrisisNews(headline, domain)) {
                                const event = {
                                    domain,
                                    event_date: this.parseDate(pubDate),
                                    headline: headline.replace(/<[^>]*>/g, ''), // Strip HTML
                                    source_url: link,
                                    event_type: this.classifyEventType(headline),
                                    sentiment_score: this.calculateSentiment(headline)
                                };
                                events.push(event);
                            }
                        }
                    }
                    catch (error) {
                        console.warn(`⚠️  Failed to scan Google News for ${domain}:`, error);
                    }
                    // Rate limiting
                    await this.sleep(1000);
                }
            }
            catch (error) {
                console.warn(`⚠️  Error scanning domain ${domain}:`, error);
            }
        }
        return events;
    }
    // Check if headline is relevant crisis news
    isRelevantCrisisNews(headline, domain) {
        const lowerHeadline = headline.toLowerCase();
        const domainName = domain.replace('.com', '').replace('.', '');
        // Must mention the domain/company
        const mentionsDomain = lowerHeadline.includes(domainName.toLowerCase()) ||
            lowerHeadline.includes(domain.toLowerCase());
        if (!mentionsDomain)
            return false;
        // Must contain crisis keywords
        const containsCrisisKeyword = this.crisisKeywords.some(keyword => lowerHeadline.includes(keyword.toLowerCase()));
        return containsCrisisKeyword;
    }
    // Classify the type of event based on headline
    classifyEventType(headline) {
        const lowerHeadline = headline.toLowerCase();
        for (const [eventType, keywords] of Object.entries(this.eventTypeMap)) {
            if (keywords.some(keyword => lowerHeadline.includes(keyword.toLowerCase()))) {
                return eventType;
            }
        }
        return 'general_crisis';
    }
    // Calculate sentiment score
    calculateSentiment(text) {
        return analyzeSentiment(text);
    }
    // Parse date from RSS pubDate
    parseDate(pubDate) {
        try {
            const date = new Date(pubDate);
            return date.toISOString().split('T')[0]; // YYYY-MM-DD format
        }
        catch {
            return new Date().toISOString().split('T')[0];
        }
    }
    // Rate limiting helper
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    // Main scanning method
    async scanAllSources(domains) {
        console.log(`📰 Scanning news for ${domains.length} domains...`);
        const googleNewsEvents = await this.scanGoogleNews(domains);
        const allEvents = [...googleNewsEvents];
        // Remove duplicates based on headline + domain
        const uniqueEvents = allEvents.filter((event, index, array) => array.findIndex(e => e.headline === event.headline && e.domain === event.domain) === index);
        return {
            events: uniqueEvents,
            sources_scanned: ['google_news'],
            total_articles: uniqueEvents.length
        };
    }
}
exports.NewsScanner = NewsScanner;
exports.newsScanner = new NewsScanner();
//# sourceMappingURL=news-scanner.js.map