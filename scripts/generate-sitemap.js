import fs from 'fs';
import path from 'path';
import https from 'https';

const STATIC_ROUTES = [
  {
    path: '/',
    changefreq: 'daily',
    priority: 1.0
  },
  {
    path: '/about',
    changefreq: 'weekly',
    priority: 0.8
  },
  {
    path: '/domains',
    changefreq: 'daily',
    priority: 0.9
  },
  {
    path: '/rankings',
    changefreq: 'daily',
    priority: 0.9
  },
  {
    path: '/categories',
    changefreq: 'weekly',
    priority: 0.8
  },
  {
    path: '/leaderboard',
    changefreq: 'daily',
    priority: 0.8
  }
];

async function generateSitemap() {
  try {
    console.log('🔍 Fetching domains from API...');
    
    // Fetch all domains from public API (paginated)
    const fetchPage = (page) => {
      return new Promise((resolve, reject) => {
        const url = `https://llm-pagerank-public-api.onrender.com/api/rankings?limit=100&page=${page}`;
        https.get(url, (res) => {
          let data = '';
          res.on('data', (chunk) => data += chunk);
          res.on('end', () => {
            try {
              const parsed = JSON.parse(data);
              resolve(parsed);
            } catch (error) {
              console.error('Failed to parse API response:', error);
              resolve({ domains: [], totalDomains: 0, totalPages: 0 });
            }
          });
        }).on('error', (error) => {
          console.error('API request failed:', error);
          resolve({ domains: [], totalDomains: 0, totalPages: 0 });
        });
      });
    };

    // Get first page to determine total pages
    const firstPage = await fetchPage(1);
    console.log(`📊 Total domains available: ${firstPage.totalDomains}`);
    console.log(`📄 Total pages: ${firstPage.totalPages}`);
    
    let allDomains = [...(firstPage.domains || [])];
    
    // Fetch remaining pages
    for (let page = 2; page <= Math.min(firstPage.totalPages, 50); page++) { // Limit to 50 pages max
      console.log(`📥 Fetching page ${page}/${firstPage.totalPages}...`);
      const pageData = await fetchPage(page);
      allDomains = allDomains.concat(pageData.domains || []);
      
      // Small delay to be nice to the API
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    // Remove duplicates based on domain name
    const uniqueDomains = allDomains.filter((domain, index, self) => 
      index === self.findIndex(d => d.domain === domain.domain)
    );
    
    const domains = uniqueDomains;
    
    console.log(`✅ Found ${allDomains.length} total domains, ${domains.length} unique domains from API`);
    
    // Generate sitemap XML
    let sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
`;

    // Add static routes
    for (const route of STATIC_ROUTES) {
      sitemap += `  <url>
    <loc>https://www.llmpagerank.com${route.path}</loc>
    <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>
    <changefreq>${route.changefreq}</changefreq>
    <priority>${route.priority}</priority>
  </url>
`;
    }

    // Add domain analysis pages
    for (const domainData of domains) {
      const domain = domainData.domain || domainData;
      
      // Main domain page
      sitemap += `  <url>
    <loc>https://www.llmpagerank.com/domain/${domain}</loc>
    <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.8</priority>
  </url>
`;

      // SEO analysis pages
      sitemap += `  <url>
    <loc>https://www.llmpagerank.com/analyze/${domain}</loc>
    <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.7</priority>
  </url>
`;

      sitemap += `  <url>
    <loc>https://www.llmpagerank.com/crisis-score/${domain}</loc>
    <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.7</priority>
  </url>
`;

      sitemap += `  <url>
    <loc>https://www.llmpagerank.com/competitive/${domain}</loc>
    <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.7</priority>
  </url>
`;
    }

    sitemap += `</urlset>`;

    // Write sitemap to public directory
    const sitemapPath = path.join(process.cwd(), 'public', 'sitemap.xml');
    fs.writeFileSync(sitemapPath, sitemap);

    const totalUrls = STATIC_ROUTES.length + (domains.length * 4); // 4 URLs per domain
    console.log(`🎉 Generated sitemap with ${totalUrls} URLs`);
    console.log(`📁 Saved to: ${sitemapPath}`);
    console.log(`🔗 URLs per domain: /domain/{domain}, /analyze/{domain}, /crisis-score/{domain}, /competitive/{domain}`);

  } catch (error) {
    console.error('❌ Error generating sitemap:', error);
    process.exit(1);
  }
}

generateSitemap(); 