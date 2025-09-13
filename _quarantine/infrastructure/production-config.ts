/**
 * Production Configuration Module
 * Centralized configuration for all production services
 * Ensures consistency and reliability across the system
 */

export interface ServiceConfig {
  name: string;
  port: number;
  healthCheckPath: string;
  dependencies: string[];
  resources: {
    memory: string;
    cpu: string;
    maxConnections?: number;
  };
  retryPolicy: {
    maxRetries: number;
    backoffMs: number;
    maxBackoffMs: number;
  };
  monitoring: {
    enableMetrics: boolean;
    enableTracing: boolean;
    enableLogs: boolean;
  };
}

export interface LLMProviderConfig {
  name: string;
  apiKeys: string[];
  rateLimit: {
    requestsPerMinute: number;
    tokensPerMinute: number;
  };
  timeout: number;
  maxRetries: number;
  models: string[];
}

export interface DatabaseConfig {
  connectionString: string;
  poolSize: number;
  idleTimeoutMs: number;
  connectionTimeoutMs: number;
  maxRetries: number;
  enableSSL: boolean;
}

export interface CacheConfig {
  provider: 'memory' | 'redis' | 'postgresql';
  ttlSeconds: number;
  maxSize: number;
  evictionPolicy: 'lru' | 'lfu' | 'fifo';
}

export const PRODUCTION_CONFIG = {
  environment: 'production',
  version: '2.1.1',
  
  // Global settings
  global: {
    logLevel: 'info',
    enableDebugMode: false,
    gracefulShutdownTimeoutMs: 30000,
    healthCheckIntervalMs: 30000,
    metricsCollectionIntervalMs: 60000,
  },

  // Service configurations
  services: {
    'sophisticated-runner': {
      name: 'sophisticated-runner',
      port: 10000,
      healthCheckPath: '/health',
      dependencies: ['postgresql', 'redis'],
      resources: {
        memory: '2Gi',
        cpu: '1000m',
        maxConnections: 100,
      },
      retryPolicy: {
        maxRetries: 3,
        backoffMs: 1000,
        maxBackoffMs: 30000,
      },
      monitoring: {
        enableMetrics: true,
        enableTracing: true,
        enableLogs: true,
      },
    } as ServiceConfig,
    
    'domain-runner': {
      name: 'domain-runner',
      port: 10001,
      healthCheckPath: '/health',
      dependencies: ['postgresql'],
      resources: {
        memory: '1Gi',
        cpu: '500m',
        maxConnections: 50,
      },
      retryPolicy: {
        maxRetries: 3,
        backoffMs: 1000,
        maxBackoffMs: 30000,
      },
      monitoring: {
        enableMetrics: true,
        enableTracing: true,
        enableLogs: true,
      },
    } as ServiceConfig,
    
    'llmrank-api': {
      name: 'llmrank-api',
      port: 10002,
      healthCheckPath: '/health',
      dependencies: ['postgresql'],
      resources: {
        memory: '512Mi',
        cpu: '250m',
        maxConnections: 30,
      },
      retryPolicy: {
        maxRetries: 3,
        backoffMs: 500,
        maxBackoffMs: 15000,
      },
      monitoring: {
        enableMetrics: true,
        enableTracing: true,
        enableLogs: true,
      },
    } as ServiceConfig,
  },

  // LLM Provider configurations
  llmProviders: {
    openai: {
      name: 'openai',
      apiKeys: process.env.OPENAI_API_KEYS?.split(',') || [],
      rateLimit: {
        requestsPerMinute: 500,
        tokensPerMinute: 150000,
      },
      timeout: 60000,
      maxRetries: 3,
      models: ['gpt-4-turbo-preview', 'gpt-4', 'gpt-3.5-turbo'],
    } as LLMProviderConfig,
    
    anthropic: {
      name: 'anthropic',
      apiKeys: process.env.ANTHROPIC_API_KEYS?.split(',') || [],
      rateLimit: {
        requestsPerMinute: 100,
        tokensPerMinute: 100000,
      },
      timeout: 120000,
      maxRetries: 3,
      models: ['claude-3-opus', 'claude-3-sonnet', 'claude-3-haiku'],
    } as LLMProviderConfig,
    
    deepseek: {
      name: 'deepseek',
      apiKeys: process.env.DEEPSEEK_API_KEYS?.split(',') || [],
      rateLimit: {
        requestsPerMinute: 200,
        tokensPerMinute: 100000,
      },
      timeout: 60000,
      maxRetries: 3,
      models: ['deepseek-chat', 'deepseek-coder'],
    } as LLMProviderConfig,
  },

  // Database configuration
  database: {
    connectionString: process.env.DATABASE_URL || '',
    poolSize: 20,
    idleTimeoutMs: 30000,
    connectionTimeoutMs: 5000,
    maxRetries: 3,
    enableSSL: true,
  } as DatabaseConfig,

  // Cache configuration
  cache: {
    provider: 'postgresql',
    ttlSeconds: 3600,
    maxSize: 10000,
    evictionPolicy: 'lru',
  } as CacheConfig,

  // Domain processing settings
  domainProcessing: {
    batchSize: 100,
    parallelWorkers: 10,
    timeoutPerDomain: 30000,
    maxRetriesPerDomain: 2,
    rateLimitPerHour: 1000,
  },

  // Monitoring and alerting
  monitoring: {
    datadogApiKey: process.env.DATADOG_API_KEY,
    sentryDsn: process.env.SENTRY_DSN,
    alerting: {
      email: process.env.ALERT_EMAIL,
      slack: process.env.SLACK_WEBHOOK,
      pagerduty: process.env.PAGERDUTY_KEY,
    },
    thresholds: {
      errorRatePercent: 5,
      latencyP99Ms: 5000,
      cpuUsagePercent: 80,
      memoryUsagePercent: 85,
    },
  },

  // Feature flags
  features: {
    enableVolatilitySwarm: true,
    enableNeuralOrchestration: true,
    enableAdaptiveCaching: true,
    enableAutoScaling: true,
    enableCircuitBreaker: true,
    enableDistributedTracing: true,
  },

  // Security settings
  security: {
    enableRateLimiting: true,
    enableApiKeyRotation: true,
    apiKeyRotationIntervalDays: 30,
    enableEncryption: true,
    enableAuditLogging: true,
  },
};

// Validation function
export function validateConfig(): boolean {
  const requiredEnvVars = [
    'DATABASE_URL',
    'OPENAI_API_KEYS',
    'ANTHROPIC_API_KEYS',
    'DEEPSEEK_API_KEYS',
  ];

  const missingVars = requiredEnvVars.filter(v => !process.env[v]);
  
  if (missingVars.length > 0) {
    console.error(`Missing required environment variables: ${missingVars.join(', ')}`);
    return false;
  }

  return true;
}

// Export helper functions
export function getServiceConfig(serviceName: string): ServiceConfig | undefined {
  return PRODUCTION_CONFIG.services[serviceName];
}

export function getLLMProviderConfig(providerName: string): LLMProviderConfig | undefined {
  return PRODUCTION_CONFIG.llmProviders[providerName];
}

export function isFeatureEnabled(featureName: keyof typeof PRODUCTION_CONFIG.features): boolean {
  return PRODUCTION_CONFIG.features[featureName] || false;
}