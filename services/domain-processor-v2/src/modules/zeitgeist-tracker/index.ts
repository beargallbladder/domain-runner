/**
 * AI Zeitgeist Tracker Module
 * Export all zeitgeist-related components
 */

export * from './interfaces';
export { AIZeitgeistEngine } from './zeitgeist-engine';
export { ZeitgeistAPIRoutes } from './zeitgeist-routes';

// Default configuration
export const DEFAULT_ZEITGEIST_CONFIG = {
  updateInterval: 300000, // 5 minutes
  trendThreshold: 3, // Minimum mentions to be considered a trend
  emergenceWindow: 24, // Hours to look back for emergence
  alertThresholds: {
    rapidRise: 30, // 30% momentum threshold
    consensusShift: 0.5, // 50% consensus change threshold
    divergence: 70, // 70% divergence score threshold
    volumeSpike: 3 // 3x volume multiplier threshold
  },
  providers: [
    'openai',
    'anthropic',
    'google',
    'deepseek',
    'mistral',
    'xai',
    'together',
    'perplexity',
    'cohere',
    'ai21',
    'groq'
  ],
  enableRealtime: true,
  cacheEnabled: true,
  cacheTTL: 3600 // 1 hour
};