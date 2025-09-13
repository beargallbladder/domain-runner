/**
 * LLM Consensus API Module
 * Export all consensus-related components
 */

export * from './interfaces';
export { LLMConsensusEngine } from './consensus-engine';
export { ConsensusAPIRoutes } from './consensus-routes';

// Default configuration
export const DEFAULT_CONSENSUS_CONFIG = {
  maxConcurrentRequests: 50,
  defaultTimeout: 30000, // 30 seconds
  cacheEnabled: true,
  cacheTTL: 3600, // 1 hour
  driftDetectionEnabled: true,
  driftThreshold: 50, // 50% drift triggers alert
  realtimeUpdates: true,
  providers: {
    openai: { enabled: true, weight: 1.2, timeout: 20000 },
    anthropic: { enabled: true, weight: 1.2, timeout: 20000 },
    google: { enabled: true, weight: 1.1, timeout: 20000 },
    deepseek: { enabled: true, weight: 1.0, timeout: 15000 },
    mistral: { enabled: true, weight: 1.0, timeout: 15000 },
    xai: { enabled: true, weight: 1.0, timeout: 15000 },
    together: { enabled: true, weight: 0.9, timeout: 15000 },
    perplexity: { enabled: true, weight: 1.0, timeout: 15000 },
    cohere: { enabled: true, weight: 0.9, timeout: 15000 },
    ai21: { enabled: true, weight: 0.8, timeout: 15000 },
    groq: { enabled: true, weight: 1.0, timeout: 10000 }
  }
};