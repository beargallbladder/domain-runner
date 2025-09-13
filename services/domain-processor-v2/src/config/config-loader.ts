import { AppConfig, DatabaseConfig, ProvidersConfig, QueueConfig, MonitoringConfig, ProviderTier } from '../types';
import * as fs from 'fs';
import * as path from 'path';

export class ConfigLoader {
  static load(configPath?: string): AppConfig {
    // Load from file if path provided
    if (configPath && fs.existsSync(configPath)) {
      const configFile = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
      return this.merge(this.getDefaults(), configFile);
    }

    // Load from environment variables
    return this.loadFromEnv();
  }

  private static getDefaults(): AppConfig {
    return {
      database: {
        connectionString: '',
        poolSize: 20,
        idleTimeout: 30000,
        connectionTimeout: 30000
      },
      providers: {},
      queue: {
        concurrency: 10,
        batchSize: 50,
        retryLimit: 3,
        timeout: 300000
      },
      monitoring: {
        metricsInterval: 60000,
        healthCheckInterval: 30000,
        alertThresholds: {
          errorRate: 0.1,
          responseTime: 5000,
          queueSize: 1000
        }
      }
    };
  }

  private static loadFromEnv(): AppConfig {
    const config = this.getDefaults();

    // Database configuration
    config.database.connectionString = process.env.DATABASE_URL || '';

    // Provider configuration
    config.providers = this.loadProvidersFromEnv();

    // Queue configuration
    if (process.env.QUEUE_CONCURRENCY) {
      config.queue.concurrency = parseInt(process.env.QUEUE_CONCURRENCY);
    }
    if (process.env.QUEUE_BATCH_SIZE) {
      config.queue.batchSize = parseInt(process.env.QUEUE_BATCH_SIZE);
    }

    return config;
  }

  private static loadProvidersFromEnv(): ProvidersConfig {
    const providers: ProvidersConfig = {};

    // OpenAI
    if (process.env.OPENAI_API_KEY) {
      const keys = this.parseApiKeys('OPENAI_API_KEY');
      providers.openai = {
        enabled: true,
        apiKeys: keys,
        tier: ProviderTier.MEDIUM,
        model: process.env.OPENAI_MODEL || 'gpt-4o-mini'
      };
    }

    // Anthropic
    if (process.env.ANTHROPIC_API_KEY) {
      const keys = this.parseApiKeys('ANTHROPIC_API_KEY');
      providers.anthropic = {
        enabled: true,
        apiKeys: keys,
        tier: ProviderTier.SLOW,
        model: process.env.ANTHROPIC_MODEL || 'claude-3-haiku-20240307'
      };
    }

    // DeepSeek
    if (process.env.DEEPSEEK_API_KEY) {
      const keys = this.parseApiKeys('DEEPSEEK_API_KEY');
      providers.deepseek = {
        enabled: true,
        apiKeys: keys,
        tier: ProviderTier.FAST,
        model: process.env.DEEPSEEK_MODEL || 'deepseek-chat'
      };
    }

    // Together AI
    if (process.env.TOGETHER_API_KEY) {
      const keys = this.parseApiKeys('TOGETHER_API_KEY');
      providers.together = {
        enabled: true,
        apiKeys: keys,
        tier: ProviderTier.FAST,
        model: process.env.TOGETHER_MODEL || 'meta-llama/Llama-3-8b-chat-hf'
      };
    }

    // Mistral
    if (process.env.MISTRAL_API_KEY) {
      const keys = this.parseApiKeys('MISTRAL_API_KEY');
      providers.mistral = {
        enabled: true,
        apiKeys: keys,
        tier: ProviderTier.MEDIUM,
        model: process.env.MISTRAL_MODEL || 'mistral-small-latest'
      };
    }

    // X.AI
    if (process.env.XAI_API_KEY) {
      const keys = this.parseApiKeys('XAI_API_KEY');
      providers.xai = {
        enabled: true,
        apiKeys: keys,
        tier: ProviderTier.FAST,
        model: process.env.XAI_MODEL || 'grok-2'
      };
    }

    // Perplexity
    if (process.env.PERPLEXITY_API_KEY) {
      const keys = this.parseApiKeys('PERPLEXITY_API_KEY');
      providers.perplexity = {
        enabled: true,
        apiKeys: keys,
        tier: ProviderTier.FAST,
        model: process.env.PERPLEXITY_MODEL || 'sonar'
      };
    }

    // Google
    if (process.env.GOOGLE_API_KEY) {
      const keys = this.parseApiKeys('GOOGLE_API_KEY');
      providers.google = {
        enabled: true,
        apiKeys: keys,
        tier: ProviderTier.SLOW,
        model: process.env.GOOGLE_MODEL || 'gemini-1.5-flash'
      };
    }

    // Cohere
    if (process.env.COHERE_API_KEY) {
      const keys = this.parseApiKeys('COHERE_API_KEY');
      providers.cohere = {
        enabled: true,
        apiKeys: keys,
        tier: ProviderTier.MEDIUM,
        model: process.env.COHERE_MODEL || 'command-r-plus'
      };
    }

    // AI21
    if (process.env.AI21_API_KEY) {
      const keys = this.parseApiKeys('AI21_API_KEY');
      providers.ai21 = {
        enabled: true,
        apiKeys: keys,
        tier: ProviderTier.MEDIUM,
        model: process.env.AI21_MODEL || 'jamba-mini'
      };
    }

    // Groq
    if (process.env.GROQ_API_KEY) {
      const keys = this.parseApiKeys('GROQ_API_KEY');
      providers.groq = {
        enabled: true,
        apiKeys: keys,
        tier: ProviderTier.FAST,
        model: process.env.GROQ_MODEL || 'llama3-8b-8192'
      };
    }

    return providers;
  }

  private static parseApiKeys(prefix: string): string[] {
    const keys: string[] = [];
    
    // Check for main key
    const mainKey = process.env[prefix];
    if (mainKey) keys.push(mainKey);

    // Check for numbered keys with BOTH formats
    for (let i = 1; i <= 10; i++) {
      // Format: KEY_2
      const keyUnderscore = process.env[`${prefix}_${i}`];
      if (keyUnderscore) keys.push(keyUnderscore);
      
      // Format: KEY2
      const keyNoUnderscore = process.env[`${prefix}${i}`];
      if (keyNoUnderscore && keyNoUnderscore !== keyUnderscore) {
        keys.push(keyNoUnderscore);
      }
    }

    return keys.filter(k => k && k.trim());
  }

  private static merge(defaults: AppConfig, overrides: Partial<AppConfig>): AppConfig {
    return {
      database: { ...defaults.database, ...overrides.database },
      providers: { ...defaults.providers, ...overrides.providers },
      queue: { ...defaults.queue, ...overrides.queue },
      monitoring: { ...defaults.monitoring, ...overrides.monitoring }
    };
  }

  static validate(config: AppConfig): string[] {
    const errors: string[] = [];

    // Validate database
    if (!config.database.connectionString) {
      errors.push('Database connection string is required');
    }

    // Validate providers
    const enabledProviders = Object.entries(config.providers)
      .filter(([_, p]) => p.enabled);
    
    if (enabledProviders.length === 0) {
      errors.push('At least one provider must be enabled');
    }

    enabledProviders.forEach(([name, provider]) => {
      if (provider.apiKeys.length === 0) {
        errors.push(`Provider ${name} has no API keys`);
      }
    });

    // Validate queue
    if (config.queue.concurrency < 1) {
      errors.push('Queue concurrency must be at least 1');
    }

    if (config.queue.batchSize < 1) {
      errors.push('Queue batch size must be at least 1');
    }

    return errors;
  }
}