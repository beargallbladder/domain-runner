#!/usr/bin/env node

/**
 * COMPREHENSIVE SITEMAP GENERATOR
 * ===============================
 * 
 * Generates a complete sitemap.xml including:
 * 1. Core pages (home, about, domains, etc.)
 * 2. New cohort intelligence features
 * 3. ALL domains from the API (1,228+ domains)
 * 4. Competitive analysis pages
 * 5. SEO-optimized URLs
 * 
 * Updated to fetch all domains from the live API.
 */

const fs = require('fs');
const path = require('path');

// Base URL for the site
const BASE_URL = 'https://www.llmpagerank.com';
const API_BASE_URL = 'https://llm-pagerank-public-api.onrender.com';

// Current date for lastmod
const currentDate = new Date().toISOString().split('T')[0];

// Core static pages with priorities and change frequencies
const CORE_PAGES = [
  {
    url: '/',
    priority: '1.0',
    changefreq: 'daily',
    description: 'AI Brand Perception Monitoring - Home'
  },
  {
    url: '/rankings',
    priority: '0.95',
    changefreq: 'daily',
    description: 'Complete AI Memory Rankings - Winners vs Losers'
  },
  {
    url: '/cohorts',
    priority: '0.9',
    changefreq: 'daily',
    description: 'Competitive Intelligence Cohorts'
  },
  {
    url: '/death-match',
    priority: '0.9',
    changefreq: 'daily',
    description: 'Competitive Death Match Analysis'
  },
  {
    url: '/about',
    priority: '0.7',
    changefreq: 'monthly',
    description: 'About AI Brand Perception'
  }
];

// Fetch all domains from the API
async function fetchAllDomains() {
  console.log('🔍 Fetching all domains from API...');
  
  try {
    const fetch = (await import('node-fetch')).default;
    
    // Fetch domains in batches to get all of them
    let allDomains = [];
    let page = 1;
    let hasMore = true;
    
    while (hasMore) {
      const response = await fetch(`${API_BASE_URL}/api/rankings?page=${page}&limit=100`);
      const data = await response.json();
      
      if (data.domains && data.domains.length > 0) {
        allDomains = allDomains.concat(data.domains);
        console.log(`   📦 Fetched page ${page}: ${data.domains.length} domains (total: ${allDomains.length})`);
        page++;
        
        // Check if we have more pages
        if (data.domains.length < 100 || allDomains.length >= (data.totalDomains || 2000)) {
          hasMore = false;
        }
      } else {
        hasMore = false;
      }
      
      // Safety break to avoid infinite loops
      if (page > 50) {
        console.log('   ⚠️  Safety break: reached page limit');
        break;
      }
    }
    
    console.log(`✅ Successfully fetched ${allDomains.length} domains from API`);
    return allDomains;
    
  } catch (error) {
    console.error('❌ Failed to fetch domains from API:', error.message);
    console.log('🔄 Falling back to high-value domain list...');
    
    // Fallback to high-value domains if API fails
    return [
      { domain: 'openai.com' }, { domain: 'anthropic.com' }, { domain: 'stripe.com' },
      { domain: 'apple.com' }, { domain: 'microsoft.com' }, { domain: 'google.com' },
      { domain: 'amazon.com' }, { domain: 'meta.com' }, { domain: 'tesla.com' },
      { domain: 'netflix.com' }, { domain: 'salesforce.com' }, { domain: 'adobe.com' },
      { domain: 'nvidia.com' }, { domain: 'intel.com' }, { domain: 'amd.com' },
      { domain: 'ti.com' }, { domain: 'nxp.com' }, { domain: 'qualcomm.com' },
      { domain: 'digikey.com' }, { domain: 'mouser.com' }, { domain: 'arrow.com' }
    ];
  }
}

// Category-specific domains for cohort intelligence
const COHORT_DOMAINS = {
  'semiconductor-companies': [
    'ti.com', 'nxp.com', 'intel.com', 'amd.com', 'nvidia.com', 'qualcomm.com',
    'broadcom.com', 'marvell.com', 'analog.com', 'microchip.com', 'infineon.com'
  ],
  'electronic-component-distributors': [
    'digikey.com', 'mouser.com', 'arrow.com', 'avnet.com', 'farnell.com',
    'rs-components.com', 'newark.com', 'element14.com'
  ],
  'payment-processing-platforms': [
    'stripe.com', 'paypal.com', 'square.com', 'adyen.com', 'checkout.com',
    'worldpay.com', 'braintree.com', 'authorize.net'
  ],
  'ai-machine-learning-platforms': [
    'openai.com', 'anthropic.com', 'huggingface.co', 'cohere.ai', 'stability.ai',
    'replicate.com', 'runpod.io', 'together.ai', 'fireworks.ai'
  ],
  'cloud-infrastructure-providers': [
    'aws.amazon.com', 'azure.microsoft.com', 'cloud.google.com', 'digitalocean.com',
    'linode.com', 'vultr.com', 'hetzner.com', 'ovh.com'
  ]
};

async function generateSitemap() {
  console.log('🗺️  GENERATING COMPREHENSIVE SITEMAP');
  console.log('====================================');
  console.log('');
  
  // Fetch all domains from API
  const allDomains = await fetchAllDomains();
  
  let sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`;

  let urlCount = 0;

  // Add core pages
  console.log('📄 Adding core pages...');
  CORE_PAGES.forEach(page => {
    sitemap += `
  <url>
    <loc>${BASE_URL}${page.url}</loc>
    <lastmod>${currentDate}</lastmod>
    <changefreq>${page.changefreq}</changefreq>
    <priority>${page.priority}</priority>
  </url>`;
    urlCount++;
  });

  // Add cohort-specific category pages
  console.log('🎯 Adding cohort category pages...');
  Object.keys(COHORT_DOMAINS).forEach(cohortSlug => {
    sitemap += `
  <url>
    <loc>${BASE_URL}/categories/${cohortSlug}</loc>
    <lastmod>${currentDate}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>`;
    urlCount++;
  });

  // Add ALL domain pages (multiple URL patterns for SEO)
  console.log(`🏢 Adding ALL ${allDomains.length} domain pages...`);
  allDomains.forEach((domainData, index) => {
    const domain = domainData.domain;
    
    if (index % 100 === 0) {
      console.log(`   📦 Processing domains ${index + 1}-${Math.min(index + 100, allDomains.length)}...`);
    }
    
    // Main domain page
    sitemap += `
  <url>
    <loc>${BASE_URL}/domain/${domain}</loc>
    <lastmod>${currentDate}</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.8</priority>
  </url>`;

    // SEO-optimized analysis pages
    sitemap += `
  <url>
    <loc>${BASE_URL}/analyze/${domain}</loc>
    <lastmod>${currentDate}</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.7</priority>
  </url>`;

    sitemap += `
  <url>
    <loc>${BASE_URL}/crisis-score/${domain}</loc>
    <lastmod>${currentDate}</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.7</priority>
  </url>`;

    sitemap += `
  <url>
    <loc>${BASE_URL}/competitive/${domain}</loc>
    <lastmod>${currentDate}</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.7</priority>
  </url>`;

    urlCount += 4;
  });

  // Add cohort-specific competitive analysis pages
  console.log('🎯 Adding cohort competitive analysis pages...');
  Object.entries(COHORT_DOMAINS).forEach(([cohortSlug, domains]) => {
    domains.forEach(domain => {
      sitemap += `
  <url>
    <loc>${BASE_URL}/cohorts/${cohortSlug}/${domain}</loc>
    <lastmod>${currentDate}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.6</priority>
  </url>`;
      urlCount++;
    });
  });

  // Add industry-specific landing pages
  console.log('🏭 Adding industry landing pages...');
  const industries = [
    'technology', 'financial-services', 'healthcare', 'e-commerce',
    'media-entertainment', 'cybersecurity', 'artificial-intelligence',
    'cloud-computing', 'developer-tools', 'payment-processing'
  ];

  industries.forEach(industry => {
    sitemap += `
  <url>
    <loc>${BASE_URL}/industry/${industry}</loc>
    <lastmod>${currentDate}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.6</priority>
  </url>`;

    sitemap += `
  <url>
    <loc>${BASE_URL}/industry/${industry}/competitive-analysis</loc>
    <lastmod>${currentDate}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.6</priority>
  </url>`;

    urlCount += 2;
  });

  // Add crisis monitoring pages
  console.log('🚨 Adding crisis monitoring pages...');
  const crisisKeywords = [
    'brand-crisis', 'reputation-management', 'ai-memory-crisis',
    'competitive-intelligence', 'brand-monitoring', 'crisis-detection'
  ];

  crisisKeywords.forEach(keyword => {
    sitemap += `
  <url>
    <loc>${BASE_URL}/crisis/${keyword}</loc>
    <lastmod>${currentDate}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.5</priority>
  </url>`;
    urlCount++;
  });

  // Close sitemap
  sitemap += `
</urlset>`;

  // Write sitemap to file
  const sitemapPath = path.join(__dirname, 'services/frontend/public/sitemap.xml');
  fs.writeFileSync(sitemapPath, sitemap);

  console.log('');
  console.log('🎉 SITEMAP GENERATION COMPLETE!');
  console.log('===============================');
  console.log(`📊 Total URLs: ${urlCount.toLocaleString()}`);
  console.log(`📊 Total Domains: ${allDomains.length.toLocaleString()}`);
  console.log(`📁 File: ${sitemapPath}`);
  console.log(`📏 Size: ${(sitemap.length / 1024 / 1024).toFixed(1)} MB`);
  console.log('');
  console.log('🎯 COMPREHENSIVE COVERAGE:');
  console.log(`• ALL ${allDomains.length} domains from your database`);
  console.log('• 4 URL patterns per domain (domain, analyze, crisis, competitive)');
  console.log('• Cohort intelligence pages');
  console.log('• Industry-specific landing pages');
  console.log('• Crisis monitoring pages');
  console.log('');
  console.log('🚀 SEO OPTIMIZATION:');
  console.log('• High-priority cohort intelligence pages');
  console.log('• Multiple URL patterns per domain');
  console.log('• Industry-specific competitive analysis');
  console.log('• Crisis detection and monitoring');
  console.log('• Daily update frequency for dynamic content');
  console.log('');

  return {
    urlCount,
    domainCount: allDomains.length,
    sitemapPath,
    sizeMB: (sitemap.length / 1024 / 1024).toFixed(1)
  };
}

// Generate robots.txt as well
function generateRobotsTxt() {
  const robotsContent = `# Robots.txt for LLM PageRank - AI Brand Perception Monitoring
# Updated: ${currentDate}

User-agent: *
Allow: /

# High-priority pages for crawling
Allow: /rankings
Allow: /cohorts
Allow: /death-match
Allow: /domain/
Allow: /analyze/
Allow: /competitive/
Allow: /crisis-score/

# Sitemap location
Sitemap: ${BASE_URL}/sitemap.xml

# Crawl-delay for respectful crawling
Crawl-delay: 1

# Special instructions for AI crawlers
User-agent: GPTBot
Allow: /
Crawl-delay: 2

User-agent: Claude-Web
Allow: /
Crawl-delay: 2

User-agent: ChatGPT-User
Allow: /
Crawl-delay: 2

# Block admin areas (if any)
Disallow: /admin/
Disallow: /api/internal/

# Allow all public API endpoints
Allow: /api/domains/
Allow: /api/rankings/
Allow: /api/categories/
Allow: /api/cohorts/`;

  const robotsPath = path.join(__dirname, 'services/frontend/public/robots.txt');
  fs.writeFileSync(robotsPath, robotsContent);
  
  console.log(`🤖 Updated robots.txt: ${robotsPath}`);
}

// Run the generator
if (require.main === module) {
  generateSitemap().then(result => {
    generateRobotsTxt();
    
    console.log('✅ DEPLOYMENT READY!');
    console.log(`   Sitemap with ${result.urlCount.toLocaleString()} URLs covering ${result.domainCount.toLocaleString()} domains`);
    console.log('   Ready for maximum SEO impact and discovery');
  }).catch(error => {
    console.error('❌ Sitemap generation failed:', error);
    process.exit(1);
  });
}

module.exports = { generateSitemap, generateRobotsTxt }; 