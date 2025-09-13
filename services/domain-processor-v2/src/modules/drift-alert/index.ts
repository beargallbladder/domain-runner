/**
 * Memory Drift Alert Module
 * Export all drift alert-related components
 */

export * from './interfaces';
export { MemoryDriftAlertEngine } from './drift-alert-engine';
export { DriftAlertAPIRoutes } from './drift-alert-routes';

// Default configuration
export const DEFAULT_DRIFT_CONFIG = {
  enabled: true,
  checkInterval: 900000, // 15 minutes
  domains: [],
  alertChannels: [],
  thresholds: {
    low: 25,
    medium: 50,
    high: 75,
    critical: 90,
    consensusThreshold: 70
  },
  realitySources: [
    {
      type: 'official_website' as const,
      priority: 10
    },
    {
      type: 'news_article' as const,
      priority: 8
    },
    {
      type: 'api_data' as const,
      priority: 9
    }
  ]
};