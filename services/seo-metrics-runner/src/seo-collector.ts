import axios from 'axios';
import * as cheerio from 'cheerio';

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

export interface SEOMetrics {
  domain: string;
  httpStatusCode: number;
  pageLoadTime: number;
  pageSize: number;
  domNodes: number;
  httpsEnabled: boolean;
  metaTitle: boolean;
  metaDescription: boolean;
  h1Count: number;
  imageCount: number;
  schemaMarkup: string[];
  mobileViewport: boolean;
  internalLinks: number;
  externalLinks: number;
  capturedAt: Date;
}

export class SEOCollector {
  private lastRequest = 0;
  
  private async makeRequest(url: string): Promise<any> {
    // Rate limiting - respect server resources
    const now = Date.now();
    const timeSince = now - this.lastRequest;
    if (timeSince < STEALTH_CONFIG.requestDelay) {
      await new Promise(resolve => setTimeout(resolve, STEALTH_CONFIG.requestDelay - timeSince));
    }
    
    const userAgent = STEALTH_CONFIG.userAgents[Math.floor(Math.random() * STEALTH_CONFIG.userAgents.length)];
    
    console.log(`🔍 Collecting: ${url}`);
    const response = await axios.get(url, {
      headers: { 'User-Agent': userAgent },
      timeout: STEALTH_CONFIG.timeout,
      validateStatus: () => true // Accept all status codes for analysis
    });
    
    this.lastRequest = Date.now();
    return response;
  }
  
  async collectSEOMetrics(domain: string): Promise<SEOMetrics> {
    const startTime = Date.now();
    const url = `https://${domain}`;
    
    try {
      const response = await this.makeRequest(url);
      const $ = cheerio.load(response.data || '');
      
      // Extract schema markup types
      const schemas: string[] = [];
      $('script[type="application/ld+json"]').each((_: any, el: any) => {
        try {
          const json = JSON.parse($(el).html() || '');
          if (json['@type']) schemas.push(json['@type']);
        } catch (e) {
          // Ignore malformed JSON
        }
      });
      
      // Count internal vs external links
      let internalLinks = 0;
      let externalLinks = 0;
      $('a[href]').each((_: any, el: any) => {
        const href = $(el).attr('href');
        if (href) {
          if (href.startsWith('/') || href.includes(domain)) {
            internalLinks++;
          } else if (href.startsWith('http')) {
            externalLinks++;
          }
        }
      });
      
      const metrics: SEOMetrics = {
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
      
    } catch (error) {
      console.error(`❌ Failed ${domain}:`, (error as Error).message);
      throw error;
    }
  }
} 