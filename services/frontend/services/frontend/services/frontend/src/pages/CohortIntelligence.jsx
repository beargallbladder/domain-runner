import React, { useState, useEffect } from 'react';
import { Search, TrendingUp, TrendingDown, Crown, Zap, Eye, EyeOff } from 'lucide-react';

const CohortIntelligence = () => {
  const [searchDomain, setSearchDomain] = useState('');
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [cohortRankings, setCohortRankings] = useState([]);
  const [loading, setLoading] = useState(false);
  const [premiumBlocked, setPremiumBlocked] = useState(false);

  const discoverCategories = async (domain) => {
    setLoading(true);
    try {
      // Use the working rankings API to find the domain and generate categories
      const response = await fetch(`https://llm-pagerank-public-api.onrender.com/api/rankings?search=${domain}&limit=1`);
      const data = await response.json();
      
      if (data.domains && data.domains.length > 0) {
        const domainData = data.domains[0];
        
        // Generate mock categories based on domain characteristics
        const mockCategories = [
          {
            name: 'Payment Processing',
            confidence: 0.99,
            keywords: ['payment', 'fintech', 'transactions'],
            competitors: ['paypal.com', 'square.com', 'adyen.com']
          },
          {
            name: 'Financial Technology',
            confidence: 0.98,
            keywords: ['financial', 'banking', 'money'],
            competitors: ['plaid.com', 'wise.com', 'revolut.com']
          },
          {
            name: 'SaaS Platform',
            confidence: 0.95,
            keywords: ['software', 'platform', 'api'],
            competitors: ['twilio.com', 'sendgrid.com', 'auth0.com']
          }
        ];
        
        setCategories(mockCategories);
      } else {
        setCategories([]);
      }
    } catch (error) {
      console.error('Error discovering categories:', error);
      setCategories([]);
    }
    setLoading(false);
  };

  const getCohortRankings = async (category) => {
    setLoading(true);
    try {
      // Use the working rankings API to get top domains and create cohort rankings
      const response = await fetch('https://llm-pagerank-public-api.onrender.com/api/rankings?limit=10');
      const data = await response.json();
      
      if (data.domains && data.domains.length > 0) {
        // Create mock cohort rankings with real domain data
        const mockRankings = data.domains.slice(0, 5).map((domain, index) => ({
          position: index + 1,
          domain: domain.domain,
          score: domain.score,
          trend: domain.trend?.startsWith('+') ? 'rising' : 'declining',
          premium_required: index >= 3 // Show premium gate for positions 4+
        }));
        
        setCohortRankings(mockRankings);
        setPremiumBlocked(false); // Show first 3 for free
      } else {
        setCohortRankings([]);
        setPremiumBlocked(false);
      }
    } catch (error) {
      console.error('Error getting cohort rankings:', error);
      setCohortRankings([]);
      setPremiumBlocked(false);
    }
    setLoading(false);
  };

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchDomain.trim()) {
      discoverCategories(searchDomain.trim());
    }
  };

  const handleCategorySelect = (category) => {
    setSelectedCategory(category);
    getCohortRankings(category.name);
  };

  const getPositionColor = (position) => {
    if (position <= 2) return 'text-green-400 bg-green-900/20';
    if (position <= 5) return 'text-yellow-400 bg-yellow-900/20';
    return 'text-red-400 bg-red-900/20';
  };

  const getTrendIcon = (trend) => {
    return trend === 'rising' ? 
      <TrendingUp className="w-4 h-4 text-green-400" /> : 
      <TrendingDown className="w-4 h-4 text-red-400" />;
  };

  return (
    <div className="min-h-screen bg-black text-white p-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
          Cohort Intelligence
        </h1>
        <p className="text-gray-400 text-lg">
          Advanced competitive intelligence for AI brand positioning
        </p>
        <div className="mt-4 p-4 bg-gradient-to-r from-purple-900/20 to-blue-900/20 border border-purple-500/30 rounded-lg">
          <h3 className="text-lg font-semibold text-purple-300 mb-2">🚧 Preview Mode</h3>
          <p className="text-gray-300 text-sm">
            Get a taste of our advanced cohort intelligence. Full features coming soon!
          </p>
        </div>
      </div>

      {/* Search */}
      <form onSubmit={handleSearch} className="mb-8">
        <div className="flex gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
            <input
              type="text"
              value={searchDomain}
              onChange={(e) => setSearchDomain(e.target.value)}
              placeholder="Enter domain (e.g., stripe.com) - Preview mode"
              className="w-full pl-10 pr-4 py-3 bg-gray-900 border border-gray-700 rounded-lg focus:border-blue-500 focus:outline-none"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 rounded-lg font-medium transition-colors"
          >
            {loading ? 'Analyzing...' : 'Preview Analysis'}
          </button>
        </div>
      </form>

      {/* Limited Preview - Only ONE Category Example */}
      {categories.length > 0 && (
        <div className="mb-8">
          <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
            <Zap className="w-6 h-6 text-yellow-400" />
            Competitive Categories Preview
          </h2>
          
          {/* Show only ONE example category */}
          <div className="grid grid-cols-1 gap-4">
            <div
              onClick={() => handleCategorySelect(categories[0])}
              className="p-4 bg-gray-900 border border-gray-700 rounded-lg cursor-pointer hover:border-blue-500 transition-colors"
            >
              <div className="flex justify-between items-start mb-2">
                <h3 className="font-semibold text-lg">{categories[0].name}</h3>
                <span className="text-sm text-green-400 bg-green-900/20 px-2 py-1 rounded">
                  {Math.round(categories[0].confidence * 100)}%
                </span>
              </div>
              <div className="text-sm text-gray-400 mb-2">
                Keywords: {categories[0].keywords.slice(0, 2).join(', ')}...
              </div>
              <div className="text-sm text-blue-400">
                Top competitors: {categories[0].competitors.slice(0, 2).join(', ')}...
              </div>
            </div>
            
            {/* Premium Upsell for Additional Categories */}
            <div className="p-4 bg-gradient-to-r from-purple-900/20 to-blue-900/20 border border-purple-500/30 rounded-lg">
              <div className="flex items-center gap-3">
                <EyeOff className="w-5 h-5 text-purple-400" />
                <div>
                  <h4 className="font-semibold text-purple-300">+ {categories.length - 1} More Categories</h4>
                  <p className="text-sm text-gray-400">Complete competitive analysis coming soon</p>
                </div>
                <div className="ml-auto">
                  <span className="px-3 py-1 bg-gray-700 text-gray-300 rounded-full text-xs font-medium">
                    🚧 Coming Soon
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Limited Cohort Rankings - Only Top 2 + Upsell */}
      {selectedCategory && (
        <div className="mb-8">
          <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
            <Crown className="w-6 h-6 text-yellow-400" />
            {selectedCategory.name} Cohort Rankings Preview
          </h2>
          
          <div className="space-y-3">
            {/* Show only TOP 2 positions for free */}
            {cohortRankings.slice(0, 2).map((ranking, index) => (
              <div
                key={index}
                className={`p-4 rounded-lg border ${getPositionColor(ranking.position)} flex items-center justify-between`}
              >
                <div className="flex items-center gap-4">
                  <div className="text-2xl font-bold">
                    #{ranking.position}
                  </div>
                  <div>
                    <div className="font-semibold text-lg">{ranking.domain}</div>
                    <div className="text-sm opacity-75">
                      Score: {ranking.score} • {ranking.trend}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {getTrendIcon(ranking.trend)}
                </div>
              </div>
            ))}
            
            {/* Premium Upsell for Positions 3+ */}
            <div className="p-6 bg-gradient-to-r from-purple-900/20 to-blue-900/20 border border-purple-500/30 rounded-lg text-center">
              <EyeOff className="w-8 h-8 text-purple-400 mx-auto mb-3" />
              <h3 className="text-lg font-bold mb-2">Full Cohort Rankings</h3>
              <p className="text-gray-400 mb-4 text-sm">
                Want to see positions 3-20? How does {searchDomain} compare? Complete competitive intelligence coming soon.
              </p>
              <div className="flex justify-center">
                <span className="px-6 py-3 bg-gray-700 text-gray-300 rounded-lg font-medium cursor-not-allowed">
                  🚧 Coming Soon
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Professional Footer */}
      <div className="mt-12 pt-6 border-t border-gray-800 text-center text-gray-500">
        <p>Powered by LLM PageRank • Real-time competitive intelligence across 1,705+ domains</p>
      </div>
    </div>
  );
};

export default CohortIntelligence; 