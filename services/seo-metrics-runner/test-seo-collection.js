// Simple test script for SEO collection validation
const axios = require('axios');
const cheerio = require('cheerio');

const STEALTH_CONFIG = {
  userAgents: [
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
  ],
  requestDelay: 3000,
  timeout: 15000
};

async function testSEOCollection(domain) {
  console.log(`🧪 Testing SEO collection for ${domain}...`);
  
  const startTime = Date.now();
  const url = `https://${domain}`;
  
  try {
    // Make stealth request
    const userAgent = STEALTH_CONFIG.userAgents[Math.floor(Math.random() * STEALTH_CONFIG.userAgents.length)];
    
    const response = await axios.get(url, {
      headers: { 'User-Agent': userAgent },
      timeout: STEALTH_CONFIG.timeout,
      validateStatus: () => true
    });
    
    const $ = cheerio.load(response.data || '');
    
    // Extract schema markup
    const schemas = [];
    $('script[type="application/ld+json"]').each((_, el) => {
      try {
        const json = JSON.parse($(el).html() || '');
        if (json['@type']) schemas.push(json['@type']);
      } catch (e) {}
    });
    
    // Count links
    let internalLinks = 0;
    let externalLinks = 0;
    $('a[href]').each((_, el) => {
      const href = $(el).attr('href');
      if (href) {
        if (href.startsWith('/') || href.includes(domain)) {
          internalLinks++;
        } else if (href.startsWith('http')) {
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
    
    console.log(`✅ ${domain} SEO metrics:`, {
      status: metrics.httpStatusCode,
      loadTime: `${metrics.pageLoadTime}ms`,
      pageSize: `${Math.round(metrics.pageSize / 1024)}KB`,
      domNodes: metrics.domNodes,
      https: metrics.httpsEnabled,
      metaTitle: metrics.metaTitle,
      metaDescription: metrics.metaDescription,
      h1Count: metrics.h1Count,
      imageCount: metrics.imageCount,
      schemas: metrics.schemaMarkup.length,
      viewport: metrics.mobileViewport,
      internalLinks: metrics.internalLinks,
      externalLinks: metrics.externalLinks
    });
    
    return metrics;
    
  } catch (error) {
    console.error(`❌ Failed to collect SEO metrics for ${domain}:`, error.message);
    throw error;
  }
}

// Test with a few domains
async function runTests() {
  const testDomains = ['apple.com', 'google.com', 'microsoft.com'];
  
  console.log('🔍 Testing SEO collection on sample domains...');
  
  for (const domain of testDomains) {
    try {
      await testSEOCollection(domain);
      console.log('⏱️  Waiting 3 seconds before next test...');
      await new Promise(resolve => setTimeout(resolve, 3000));
    } catch (error) {
      console.error(`Failed test for ${domain}`);
    }
  }
  
  console.log('✅ SEO collection tests complete!');
}

if (require.main === module) {
  runTests().catch(console.error);
}

module.exports = { testSEOCollection }; 