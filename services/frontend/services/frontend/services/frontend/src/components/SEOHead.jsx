import React from 'react';
import { Helmet } from 'react-helmet';

const SEOHead = ({ 
  domain, 
  score, 
  rank, 
  totalDomains, 
  crisisBuffer, 
  category,
  competitors = [],
  pageType = 'analysis' 
}) => {
  const getPageTitle = () => {
    switch (pageType) {
      case 'crisis-score':
        return `${domain} Crisis Resilience Score: ${score}/100 | AI Memory Rankings`;
      case 'analyze':
        return `${domain} AI Memory Analysis | Ranks #${rank} of ${totalDomains} | Crisis Score: ${score}`;
      case 'competitive':
        return `${domain} vs Competitors | ${category} Industry AI Memory Rankings`;
      default:
        return `${domain} AI Memory Score: ${score}/100 | Crisis Resilience Analysis`;
    }
  };

  const getDescription = () => {
    const crisisStatus = crisisBuffer > 30 ? 'Strong crisis buffer' : 
                        crisisBuffer > 10 ? 'Moderate risk level' : 
                        'High vulnerability zone';
    
    switch (pageType) {
      case 'crisis-score':
        return `${domain} scores ${score}/100 for AI memory strength with ${crisisBuffer > 0 ? '+' : ''}${crisisBuffer.toFixed(1)} points above Facebook crisis baseline. ${crisisStatus} for reputation crises.`;
      case 'analyze':
        return `Complete AI memory analysis for ${domain}. Ranks #${rank} out of ${totalDomains} domains. Crisis resilience score: ${score}/100. ${crisisStatus} against reputation risks.`;
      case 'competitive':
        return `How ${domain} compares to ${category} competitors in AI memory rankings. Crisis resilience analysis vs ${competitors.length} industry peers.`;
      default:
        return `${domain} AI memory intelligence: Score ${score}/100, ranked #${rank} of ${totalDomains}. Crisis vulnerability analysis and competitive positioning.`;
    }
  };

  const getCanonicalUrl = () => {
    const baseUrl = 'https://www.llmpagerank.com';
    switch (pageType) {
      case 'crisis-score':
        return `${baseUrl}/crisis-score/${domain}`;
      case 'analyze':
        return `${baseUrl}/analyze/${domain}`;
      case 'competitive':
        return `${baseUrl}/competitive/${domain}`;
      default:
        return `${baseUrl}/domain/${domain}`;
    }
  };

  const structuredData = {
    "@context": "https://schema.org",
    "@type": "Report",
    "name": getPageTitle(),
    "description": getDescription(),
    "author": {
      "@type": "Organization",
      "name": "LLM PageRank",
      "url": "https://www.llmpagerank.com"
    },
    "about": {
      "@type": "Organization",
      "name": domain,
      "url": `https://${domain}`
    },
    "datePublished": new Date().toISOString(),
    "keywords": `${domain}, AI memory, crisis resilience, brand analysis, reputation risk, ${category}`,
    "mainEntity": {
      "@type": "Rating",
      "ratingValue": score,
      "bestRating": 100,
      "worstRating": 0,
      "ratingExplanation": `AI memory strength score for ${domain} based on language model consensus`
    }
  };

  return (
    <Helmet>
      {/* Primary Meta Tags */}
      <title>{getPageTitle()}</title>
      <meta name="title" content={getPageTitle()} />
      <meta name="description" content={getDescription()} />
      <meta name="keywords" content={`${domain}, AI memory analysis, crisis resilience, brand reputation, ${category}, competitive intelligence, memory score`} />
      <link rel="canonical" href={getCanonicalUrl()} />

      {/* Open Graph / Facebook */}
      <meta property="og:type" content="website" />
      <meta property="og:url" content={getCanonicalUrl()} />
      <meta property="og:title" content={getPageTitle()} />
      <meta property="og:description" content={getDescription()} />
      <meta property="og:image" content={`https://www.llmpagerank.com/api/social/preview/${domain}?score=${score}&rank=${rank}&type=${pageType}`} />
      <meta property="og:image:width" content="1200" />
      <meta property="og:image:height" content="630" />
      <meta property="og:image:alt" content={`${domain} AI Memory Score: ${score}/100`} />
      <meta property="og:site_name" content="LLM PageRank" />

      {/* Twitter */}
      <meta property="twitter:card" content="summary_large_image" />
      <meta property="twitter:url" content={getCanonicalUrl()} />
      <meta property="twitter:title" content={getPageTitle()} />
      <meta property="twitter:description" content={getDescription()} />
      <meta property="twitter:image" content={`https://www.llmpagerank.com/api/social/preview/${domain}?score=${score}&rank=${rank}&type=${pageType}`} />

      {/* Additional SEO */}
      <meta name="robots" content="index, follow" />
      <meta name="language" content="English" />
      <meta name="author" content="LLM PageRank" />
      
      {/* Structured Data */}
      <script type="application/ld+json">
        {JSON.stringify(structuredData)}
      </script>

      {/* Additional tracking for crisis events */}
      <meta name="crisis-score" content={score} />
      <meta name="crisis-buffer" content={crisisBuffer} />
      <meta name="domain-rank" content={rank} />
      <meta name="category" content={category} />
    </Helmet>
  );
};

export default SEOHead; 