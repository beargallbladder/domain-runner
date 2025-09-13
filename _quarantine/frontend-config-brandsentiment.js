/**
 * Configuration for brandsentiment.io
 * Updated: August 12, 2025
 */

const CONFIG = {
  // API Configuration
  API: {
    // Use this until llmrank.io DNS is configured:
    BASE_URL: 'https://domain-runner.onrender.com',
    
    // After DNS configuration, switch to:
    // BASE_URL: 'https://llmrank.io',
    
    // API Key for brandsentiment.io
    API_KEY: 'brandsentiment-premium-2025',
    
    // Endpoints
    ENDPOINTS: {
      STATS: '/api/stats/rich',
      RANKINGS: '/api/rankings/rich',
      DOMAIN_DETAILS: '/api/domains/:domain/rich',
      PROVIDER_HEALTH: '/api/providers/health'
    }
  },

  // Brand Sentiment Specific Features
  FEATURES: {
    SENTIMENT_ANALYSIS: true,
    COMPETITIVE_INTELLIGENCE: true,
    TRIBAL_CONSENSUS: true,
    MEMORY_DECAY_TRACKING: true,
    REAL_TIME_ALERTS: true,
    ENABLE_CACHING: true,
    CACHE_TTL: 60000 // 1 minute
  },

  // UI Configuration
  UI: {
    DEFAULT_LIMIT: 100,
    REFRESH_INTERVAL: 300000, // 5 minutes
    THEME: 'light',
    CHART_COLORS: {
      positive: '#10b981',
      neutral: '#6b7280',
      negative: '#ef4444',
      baseTribal: '#3b82f6',
      searchTribal: '#8b5cf6'
    }
  },

  // Sentiment Thresholds
  THRESHOLDS: {
    POSITIVE: 70,
    NEUTRAL: 40,
    CRITICAL_ASYMMETRY: 30,
    TRIBAL_DIVERGENCE: 20
  }
};

/**
 * API Client for brandsentiment.io
 */
class BrandSentimentAPI {
  constructor() {
    this.baseURL = CONFIG.API.BASE_URL;
    this.apiKey = CONFIG.API.API_KEY;
    this.cache = new Map();
  }

  async fetchWithAuth(endpoint, params = {}) {
    const cacheKey = `${endpoint}:${JSON.stringify(params)}`;
    
    // Check cache
    if (CONFIG.FEATURES.ENABLE_CACHING) {
      const cached = this.cache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < CONFIG.FEATURES.CACHE_TTL) {
        return cached.data;
      }
    }

    const url = new URL(`${this.baseURL}${endpoint}`);
    Object.keys(params).forEach(key => url.searchParams.append(key, params[key]));

    const response = await fetch(url, {
      headers: {
        'x-api-key': this.apiKey,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`API Error: ${response.status}`);
    }

    const data = await response.json();
    
    // Cache result
    if (CONFIG.FEATURES.ENABLE_CACHING) {
      this.cache.set(cacheKey, { data, timestamp: Date.now() });
    }

    return data;
  }

  // Get brand sentiment statistics
  async getBrandStats() {
    const data = await this.fetchWithAuth(CONFIG.API.ENDPOINTS.STATS);
    return this.enrichWithSentiment(data);
  }

  // Get competitive brand rankings
  async getCompetitiveRankings(limit = CONFIG.UI.DEFAULT_LIMIT, offset = 0) {
    const data = await this.fetchWithAuth(CONFIG.API.ENDPOINTS.RANKINGS, { limit, offset });
    return this.enrichRankingsWithSentiment(data);
  }

  // Get specific brand analysis
  async getBrandAnalysis(domain) {
    const endpoint = CONFIG.API.ENDPOINTS.DOMAIN_DETAILS.replace(':domain', domain);
    const data = await this.fetchWithAuth(endpoint);
    return this.analyzeBrandSentiment(data);
  }

  // Enrich data with sentiment analysis
  enrichWithSentiment(data) {
    if (data.providers) {
      data.sentiment = {
        baseTribalAvg: this.calculateTribalAverage(data.providers, 'base-llm'),
        searchTribalAvg: this.calculateTribalAverage(data.providers, 'search-enhanced'),
        consensus: this.calculateConsensus(data.providers)
      };
    }
    return data;
  }

  // Enrich rankings with sentiment categories
  enrichRankingsWithSentiment(data) {
    if (data.rankings) {
      data.rankings = data.rankings.map(item => ({
        ...item,
        sentimentCategory: this.getSentimentCategory(item.averageScore),
        hasAsymmetry: item.informationAsymmetry > CONFIG.THRESHOLDS.CRITICAL_ASYMMETRY
      }));
    }
    return data;
  }

  // Analyze brand sentiment in detail
  analyzeBrandSentiment(data) {
    if (data.providers) {
      const scores = data.providers.map(p => p.score);
      const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
      const max = Math.max(...scores);
      const min = Math.min(...scores);
      
      data.analysis = {
        averageSentiment: avg,
        sentimentCategory: this.getSentimentCategory(avg),
        asymmetry: max - min,
        asymmetryLevel: max - min > CONFIG.THRESHOLDS.CRITICAL_ASYMMETRY ? 'HIGH' : 'NORMAL',
        providerAgreement: this.calculateAgreement(scores),
        tribalDivergence: this.calculateTribalDivergence(data.providers)
      };
    }
    return data;
  }

  // Helper: Get sentiment category
  getSentimentCategory(score) {
    if (score >= CONFIG.THRESHOLDS.POSITIVE) return 'POSITIVE';
    if (score >= CONFIG.THRESHOLDS.NEUTRAL) return 'NEUTRAL';
    return 'NEGATIVE';
  }

  // Helper: Calculate tribal average
  calculateTribalAverage(providers, tribe) {
    const tribal = providers.filter(p => p.tribe === tribe);
    if (tribal.length === 0) return 0;
    return tribal.reduce((sum, p) => sum + (p.avgScore || p.score || 0), 0) / tribal.length;
  }

  // Helper: Calculate consensus
  calculateConsensus(providers) {
    const scores = providers.map(p => p.avgScore || p.score || 0);
    const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
    const variance = scores.reduce((sum, s) => sum + Math.pow(s - avg, 2), 0) / scores.length;
    return variance < 100 ? 'HIGH' : variance < 400 ? 'MEDIUM' : 'LOW';
  }

  // Helper: Calculate agreement
  calculateAgreement(scores) {
    const std = Math.sqrt(scores.reduce((sum, s) => sum + Math.pow(s - (scores.reduce((a, b) => a + b, 0) / scores.length), 2), 0) / scores.length);
    return std < 10 ? 'STRONG' : std < 20 ? 'MODERATE' : 'WEAK';
  }

  // Helper: Calculate tribal divergence
  calculateTribalDivergence(providers) {
    const base = this.calculateTribalAverage(providers, 'base-llm');
    const search = this.calculateTribalAverage(providers, 'search-enhanced');
    return Math.abs(base - search);
  }
}

// Export for use in frontend
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { CONFIG, BrandSentimentAPI };
} else {
  window.BrandSentimentConfig = CONFIG;
  window.BrandSentimentAPI = BrandSentimentAPI;
}