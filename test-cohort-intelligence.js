#!/usr/bin/env node

/**
 * 🎯 COHORT INTELLIGENCE PROOF OF CONCEPT
 * =======================================
 * 
 * This script demonstrates how the cohort intelligence system would work
 * using your existing 1,705 domains to create competitive categories.
 * 
 * It shows the killer feature: multi-category competition with premium gating.
 */

// Demo script - no external dependencies needed

// Sample of your actual domains (from the API)
const SAMPLE_DOMAINS = [
  'stripe.com',
  'asana.com', 
  'monday.com',
  'notion.so',
  'dropbox.com',
  'adobe.com',
  'microsoft.com',
  'google.com',
  'amazon.com',
  'salesforce.com'
];

// Mock category discovery (in real system, this would use LLM)
const CATEGORY_MAPPINGS = {
  'stripe.com': [
    { name: 'Payment Processing', confidence: 0.95, position: 2 },
    { name: 'FinTech Platforms', confidence: 0.88, position: 3 },
    { name: 'Developer Tools', confidence: 0.72, position: 8 }
  ],
  'asana.com': [
    { name: 'Project Management', confidence: 0.92, position: 1 },
    { name: 'Productivity Tools', confidence: 0.85, position: 4 },
    { name: 'Team Collaboration', confidence: 0.78, position: 6 }
  ],
  'monday.com': [
    { name: 'Project Management', confidence: 0.89, position: 2 },
    { name: 'Productivity Tools', confidence: 0.82, position: 5 },
    { name: 'Workflow Automation', confidence: 0.75, position: 3 }
  ],
  'notion.so': [
    { name: 'Productivity Tools', confidence: 0.94, position: 1 },
    { name: 'Knowledge Management', confidence: 0.91, position: 2 },
    { name: 'Team Collaboration', confidence: 0.73, position: 7 }
  ],
  'microsoft.com': [
    { name: 'Cloud Infrastructure', confidence: 0.93, position: 2 },
    { name: 'Productivity Tools', confidence: 0.96, position: 2 },
    { name: 'Enterprise Software', confidence: 0.98, position: 1 },
    { name: 'AI Platforms', confidence: 0.87, position: 3 },
    { name: 'Developer Tools', confidence: 0.84, position: 4 }
  ]
};

// Mock cohort rankings with premium strategy
function generateCohortRankings(category) {
  const domains = Object.keys(CATEGORY_MAPPINGS).filter(domain => 
    CATEGORY_MAPPINGS[domain].some(cat => cat.name === category)
  );
  
  const rankings = domains
    .map(domain => {
      const categoryData = CATEGORY_MAPPINGS[domain].find(cat => cat.name === category);
      return {
        domain,
        position: categoryData.position,
        score: Math.round((100 - categoryData.position * 5) + Math.random() * 10),
        trend: Math.random() > 0.5 ? 'up' : 'down'
      };
    })
    .sort((a, b) => a.position - b.position);
  
  return {
    category,
    total_competitors: rankings.length,
    rankings: rankings.map(r => ({
      ...r,
      premium_required: r.position <= 4,
      visible: r.position > 4 // Free users only see positions 5+
    }))
  };
}

// Demonstrate the killer feature
function demonstrateCohortIntelligence() {
  console.log('🎯 COHORT INTELLIGENCE DEMONSTRATION');
  console.log('=====================================\n');
  
  console.log('💡 THE CONCEPT:');
  console.log('- Brands compete in MULTIPLE categories simultaneously');
  console.log('- Premium users see positions 1-4 (market leaders)');
  console.log('- Free users see positions 5-10+ (creates upgrade pressure)');
  console.log('- Updates every 2 days to drive return visits\n');
  
  // Show Microsoft's multi-category competition
  console.log('📊 EXAMPLE: Microsoft competes in 5 categories:');
  const microsoftCategories = CATEGORY_MAPPINGS['microsoft.com'];
  microsoftCategories.forEach(cat => {
    console.log(`   ${cat.name}: Position #${cat.position} (${cat.confidence * 100}% confidence)`);
  });
  console.log('');
  
  // Show category rankings with premium strategy
  const categories = ['Productivity Tools', 'Project Management', 'Payment Processing'];
  
  categories.forEach(category => {
    console.log(`🏆 ${category.toUpperCase()} COHORT RANKINGS:`);
    const cohort = generateCohortRankings(category);
    
    console.log(`   Total competitors: ${cohort.total_competitors}`);
    console.log('   Rankings:');
    
    cohort.rankings.forEach(ranking => {
      if (ranking.premium_required) {
        console.log(`   #${ranking.position} 🔒 [PREMIUM ONLY] - Upgrade to see market leader`);
      } else {
        const trend = ranking.trend === 'up' ? '📈' : '📉';
        console.log(`   #${ranking.position} ${ranking.domain} (${ranking.score}) ${trend}`);
      }
    });
    console.log('');
  });
  
  console.log('💰 BUSINESS IMPACT:');
  console.log('- Premium conversion: Users want to see who\'s #1-4');
  console.log('- Engagement: Multi-category creates stickiness');
  console.log('- Viral: "We\'re #2 in Payment Processing!" social sharing');
  console.log('- Competitive anxiety: "Who\'s beating us?" drives upgrades\n');
  
  console.log('🚀 IMPLEMENTATION PLAN:');
  console.log('1. Deploy cohort-intelligence-service to Render');
  console.log('2. Run category discovery on your 1,705 domains');
  console.log('3. Generate competitor lists for each category');
  console.log('4. Add competitors to sophisticated-runner queue');
  console.log('5. Update frontend with category-based cohorts');
  console.log('6. Implement premium gating (hide top 4)');
  console.log('7. Schedule cohort updates every 2 days\n');
  
  console.log('🎯 RESULT: Transform from simple rankings to strategic competitive intelligence!');
}

// Run the demonstration
demonstrateCohortIntelligence(); 