// ============================================================================
// 📈 MARKET DATA SOURCES
// ============================================================================

import axios from 'axios';
import { MarketData } from '../types';

export class MarketDataSource {
  private googleTrendsEnabled: boolean;

  constructor() {
    this.googleTrendsEnabled = !!process.env.GOOGLE_TRENDS_ENABLED;
  }

  async getMarketData(domain: string): Promise<MarketData> {
    console.log(`📈 Fetching market data for ${domain}...`);
    
    try {
      const [trendsScore, socialSentiment, newsScore, mentions] = await Promise.all([
        this.getGoogleTrendsScore(domain),
        this.getSocialSentiment(domain),
        this.getNewsSentiment(domain),
        this.getBrandMentions(domain)
      ]);

      return {
        google_trends_score: trendsScore,
        social_sentiment: socialSentiment,
        news_sentiment: newsScore,
        brand_mentions: mentions,
        search_volume_trend: this.categorizeSearchTrend(trendsScore),
        last_updated: new Date()
      };
    } catch (error) {
      console.warn(`⚠️ Market data failed for ${domain}:`, error);
      return this.getDefaultMarketData();
    }
  }

  private async getGoogleTrendsScore(domain: string): Promise<number> {
    // Simplified Google Trends simulation
    // In real implementation, would use google-trends-api
    const companyName = this.domainToCompanyName(domain);
    
    // Known trends for specific companies
    const knownTrends: Record<string, number> = {
      'theranos': 5,  // Very low search interest
      'facebook': 60,
      'meta': 65,
      'google': 90,
      'apple': 95,
      'tesla': 80,
      'amazon': 85,
      'microsoft': 75
    };

    return knownTrends[companyName.toLowerCase()] || 40;
  }

  private async getSocialSentiment(domain: string): Promise<number> {
    // Simplified social sentiment analysis
    // In real implementation, would integrate with social media APIs
    
    const knownSentiments: Record<string, number> = {
      'theranos.com': -0.8,  // Very negative
      'facebook.com': -0.2,  // Slightly negative
      'meta.com': -0.1,      // Slightly negative
      'google.com': 0.3,     // Positive
      'apple.com': 0.5,      // Very positive
      'tesla.com': 0.2,      // Positive
      'amazon.com': 0.1,     // Slightly positive
      'microsoft.com': 0.4   // Positive
    };

    return knownSentiments[domain] || 0.0;
  }

  private async getNewsSentiment(domain: string): Promise<number> {
    // Simplified news sentiment
    // In real implementation, would analyze recent news articles
    
    const knownNewsSentiments: Record<string, number> = {
      'theranos.com': -0.9,  // Extremely negative news
      'facebook.com': -0.3,  // Negative news
      'meta.com': -0.2,      // Slightly negative
      'google.com': 0.2,     // Positive
      'apple.com': 0.4,      // Very positive
      'tesla.com': 0.1,      // Mixed
      'amazon.com': 0.2,     // Positive
      'microsoft.com': 0.3   // Positive
    };

    return knownNewsSentiments[domain] || 0.0;
  }

  private async getBrandMentions(domain: string): Promise<number> {
    // Simplified brand mention counting
    // In real implementation, would count mentions across platforms
    
    const companyName = this.domainToCompanyName(domain);
    const baseMentions: Record<string, number> = {
      'theranos': 1000,    // Low mentions (defunct)
      'facebook': 50000,   // High mentions
      'meta': 40000,       // High mentions
      'google': 100000,    // Very high mentions
      'apple': 80000,      // Very high mentions
      'tesla': 60000,      // High mentions
      'amazon': 70000,     // High mentions
      'microsoft': 45000   // High mentions
    };

    return baseMentions[companyName.toLowerCase()] || 5000;
  }

  private domainToCompanyName(domain: string): string {
    const cleanDomain = domain.replace('www.', '').replace('.com', '').replace('.', ' ');
    return cleanDomain.charAt(0).toUpperCase() + cleanDomain.slice(1);
  }

  private categorizeSearchTrend(score: number): 'increasing' | 'stable' | 'decreasing' {
    // Simplified trend categorization
    // In real implementation, would compare with historical data
    if (score > 70) return 'increasing';
    if (score < 30) return 'decreasing';
    return 'stable';
  }

  private getDefaultMarketData(): MarketData {
    return {
      google_trends_score: 40,
      social_sentiment: 0.0,
      news_sentiment: 0.0,
      brand_mentions: 5000,
      search_volume_trend: 'stable',
      last_updated: new Date()
    };
  }
} 