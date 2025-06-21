import React from 'react';
import { Link } from 'react-router-dom';

const Home: React.FC = () => {
  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <div className="gradient-bg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <div className="text-center">
            <h1 className="text-4xl md:text-6xl font-bold text-white mb-6">
              AI Brand Intelligence
              <span className="block text-2xl md:text-3xl font-normal mt-2 text-blue-100">
                Monitor How AI Models Perceive Your Brand
              </span>
            </h1>
            
            <p className="text-xl text-blue-100 mb-8 max-w-3xl mx-auto">
              Track your brand's reputation across 35+ AI models. Get instant alerts when 
              AI develops brand confusion, perception declines, or visibility gaps threaten your business.
            </p>

            {/* Simple Search Bar */}
            <div className="max-w-2xl mx-auto mb-8">
              <div className="flex flex-col sm:flex-row gap-4">
                <input
                  type="text"
                  placeholder="Search any domain (e.g., apple.com, netflix.com)"
                  className="flex-1 px-4 py-3 rounded-lg shadow-lg text-gray-700 placeholder-gray-400 focus:ring-4 focus:ring-white/30 focus:outline-none"
                />
                <button className="px-8 py-3 bg-white text-brand-600 font-semibold rounded-lg shadow-lg hover:bg-gray-50 transition-colors">
                  Analyze Brand
                </button>
              </div>
            </div>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                to="/fire-alarm"
                className="flex items-center justify-center space-x-2 px-6 py-3 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-lg shadow-lg transition-colors"
              >
                <span>🚨</span>
                <span>View Fire Alarm Dashboard</span>
              </Link>
              <Link
                to="/register"
                className="px-6 py-3 bg-white/20 hover:bg-white/30 text-white font-semibold rounded-lg shadow-lg backdrop-blur-sm transition-colors border border-white/30"
              >
                Start Monitoring Free
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Simple Features Section */}
      <div className="bg-gray-50 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Why Monitor AI Brand Perception?
            </h2>
            <p className="text-gray-600 max-w-3xl mx-auto">
              As AI becomes the primary information source, your brand's AI perception 
              directly impacts customer acquisition, investor confidence, and business growth.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center metric-card">
              <div className="text-4xl mb-4">🚨</div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">Fire Alarm Alerts</h3>
              <p className="text-gray-600">
                Instant notifications when AI models develop brand confusion, 
                perception decline, or visibility gaps that threaten your reputation.
              </p>
            </div>

            <div className="text-center metric-card">
              <div className="text-4xl mb-4">📊</div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">Memory Tracking</h3>
              <p className="text-gray-600">
                Monitor how well AI models remember your brand and track 
                changes in perception over time across multiple AI systems.
              </p>
            </div>

            <div className="text-center metric-card">
              <div className="text-4xl mb-4">👁️</div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">Competitive Intelligence</h3>
              <p className="text-gray-600">
                Compare your AI visibility against competitors and identify 
                opportunities to improve your brand's position in AI responses.
              </p>
            </div>
          </div>

          <div className="text-center mt-12">
            <Link
              to="/register"
              className="brand-button text-lg px-8 py-4"
            >
              Start Free Monitoring
            </Link>
            <p className="text-gray-500 mt-3 text-sm">
              Track 1 domain free • No credit card required • Setup in 30 seconds
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Home; 