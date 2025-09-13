/**
 * Configuration for llmpagerank.com
 * Updated: August 12, 2025
 */

const CONFIG = {
  // API Configuration
  API: {
    // Use this until llmrank.io DNS is configured:
    BASE_URL: 'https://domain-runner.onrender.com',
    
    // After DNS configuration, switch to:
    // BASE_URL: 'https://llmrank.io',
    
    // API Key for llmpagerank.com
    API_KEY: 'llmpagerank-2025-neural-gateway',
    
    // Endpoints
    ENDPOINTS: {
      STATS: '/api/stats/rich',
      RANKINGS: '/api/rankings/rich',
      DOMAIN_DETAILS: '/api/domains/:domain/rich',
      PROVIDER_HEALTH: '/api/providers/health'
    }
  },

  // Feature Flags
  FEATURES: {
    SHOW_PROVIDER_BREAKDOWNS: true,
    SHOW_TRIBAL_ANALYSIS: true,
    SHOW_INFORMATION_ASYMMETRY: true,
    SHOW_MEMORY_LAG: true,
    ENABLE_CACHING: true,
    CACHE_TTL: 60000 // 1 minute
  },

  // UI Configuration
  UI: {
    DEFAULT_LIMIT: 50,
    REFRESH_INTERVAL: 300000, // 5 minutes
    THEME: 'dark'
  }
};

/**
 * API Client for llmpagerank.com
 */
class LLMPageRankAPI {
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

  // Get statistics with provider breakdowns
  async getStats() {
    return this.fetchWithAuth(CONFIG.API.ENDPOINTS.STATS);
  }

  // Get domain rankings
  async getRankings(limit = CONFIG.UI.DEFAULT_LIMIT, offset = 0) {
    return this.fetchWithAuth(CONFIG.API.ENDPOINTS.RANKINGS, { limit, offset });
  }

  // Get specific domain details
  async getDomainDetails(domain) {
    const endpoint = CONFIG.API.ENDPOINTS.DOMAIN_DETAILS.replace(':domain', domain);
    return this.fetchWithAuth(endpoint);
  }

  // Get provider health
  async getProviderHealth() {
    return this.fetchWithAuth(CONFIG.API.ENDPOINTS.PROVIDER_HEALTH);
  }
}

// Export for use in frontend
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { CONFIG, LLMPageRankAPI };
} else {
  window.LLMPageRankConfig = CONFIG;
  window.LLMPageRankAPI = LLMPageRankAPI;
}