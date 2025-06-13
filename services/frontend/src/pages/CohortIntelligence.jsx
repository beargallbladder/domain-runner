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
      const response = await fetch('https://cohort-intelligence.onrender.com/api/discover-categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ domain })
      });
      const data = await response.json();
      setCategories(data.categories || []);
    } catch (error) {
      console.error('Error discovering categories:', error);
    }
    setLoading(false);
  };

  const getCohortRankings = async (category) => {
    setLoading(true);
    try {
      const response = await fetch(`https://cohort-intelligence.onrender.com/api/cohort-rankings/${encodeURIComponent(category)}`);
      const data = await response.json();
      setCohortRankings(data.rankings || []);
      setPremiumBlocked(data.premium_required || false);
    } catch (error) {
      console.error('Error getting cohort rankings:', error);
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
          The Bloomberg Terminal for AI Brand Intelligence
        </p>
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
              placeholder="Enter domain (e.g., stripe.com)"
              className="w-full pl-10 pr-4 py-3 bg-gray-900 border border-gray-700 rounded-lg focus:border-blue-500 focus:outline-none"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 rounded-lg font-medium transition-colors"
          >
            {loading ? 'Analyzing...' : 'Discover Categories'}
          </button>
        </div>
      </form>

      {/* Categories Grid */}
      {categories.length > 0 && (
        <div className="mb-8">
          <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
            <Zap className="w-6 h-6 text-yellow-400" />
            Competitive Categories
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {categories.map((category, index) => (
              <div
                key={index}
                onClick={() => handleCategorySelect(category)}
                className="p-4 bg-gray-900 border border-gray-700 rounded-lg cursor-pointer hover:border-blue-500 transition-colors"
              >
                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-semibold text-lg">{category.name}</h3>
                  <span className="text-sm text-green-400 bg-green-900/20 px-2 py-1 rounded">
                    {Math.round(category.confidence * 100)}%
                  </span>
                </div>
                <div className="text-sm text-gray-400 mb-2">
                  Keywords: {category.keywords.join(', ')}
                </div>
                <div className="text-sm text-blue-400">
                  Competitors: {category.competitors.join(', ')}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Cohort Rankings */}
      {selectedCategory && (
        <div className="mb-8">
          <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
            <Crown className="w-6 h-6 text-yellow-400" />
            {selectedCategory.name} Cohort Rankings
          </h2>
          
          {premiumBlocked ? (
            <div className="p-8 bg-gradient-to-r from-purple-900/20 to-blue-900/20 border border-purple-500/30 rounded-lg text-center">
              <EyeOff className="w-12 h-12 text-purple-400 mx-auto mb-4" />
              <h3 className="text-xl font-bold mb-2">Premium Intelligence Required</h3>
              <p className="text-gray-400 mb-4">
                Want to see who's beating {searchDomain}? Upgrade to see the top 4 positions.
              </p>
              <button className="px-6 py-3 bg-purple-600 hover:bg-purple-700 rounded-lg font-medium transition-colors">
                Upgrade to Premium
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {cohortRankings.map((ranking, index) => (
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
                    {ranking.premium_required && (
                      <Eye className="w-4 h-4 text-purple-400" />
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Bloomberg-style Footer */}
      <div className="mt-12 pt-6 border-t border-gray-800 text-center text-gray-500">
        <p>Powered by LLM PageRank • Real-time competitive intelligence across 1,705+ domains</p>
      </div>
    </div>
  );
};

export default CohortIntelligence; 