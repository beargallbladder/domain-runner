import { IDatabaseService } from '../modules/database/interfaces';
import { ILLMProviderRegistry, IAPIKeyManager } from '../modules/llm-providers/interfaces';
import { IDomainProcessor } from '../modules/domain-processor/interfaces';
import { IJobQueue } from '../modules/queue/interfaces';
import { IMonitoringService } from '../modules/monitoring/interfaces';
import { AppConfig } from '../types';
import { Logger } from '../utils/logger';

// Import implementations
import { PostgresService } from '../modules/database/postgres-service';
import { ProviderRegistry } from '../modules/llm-providers/provider-registry';
import { APIKeyManager } from '../modules/llm-providers/api-key-manager';
import { DomainProcessor } from '../modules/domain-processor/domain-processor';
import { JobQueue } from '../modules/queue/job-queue';
import { MonitoringService } from '../modules/monitoring/monitoring-service';

// Provider implementations
import { OpenAIProvider } from '../modules/llm-providers/providers/openai-provider';
import { AnthropicProvider } from '../modules/llm-providers/providers/anthropic-provider';
import { DeepSeekProvider } from '../modules/llm-providers/providers/deepseek-provider';
import { TogetherProvider } from '../modules/llm-providers/providers/together-provider';
import { XAIProvider } from '../modules/llm-providers/providers/xai-provider';
import { PerplexityProvider } from '../modules/llm-providers/providers/perplexity-provider';
import { MistralProvider } from '../modules/llm-providers/providers/mistral-provider';
import { GoogleProvider } from '../modules/llm-providers/providers/google-provider';
import { CohereProvider } from '../modules/llm-providers/providers/cohere-provider';
import { AI21Provider } from '../modules/llm-providers/providers/ai21-provider';
import { GroqProvider } from '../modules/llm-providers/providers/groq-provider';
import { registerNewProviders } from '../providers/provider-initialization';

export interface Container {
  config: AppConfig;
  logger: Logger;
  database: IDatabaseService;
  providerRegistry: ILLMProviderRegistry;
  apiKeyManager: IAPIKeyManager;
  domainProcessor: IDomainProcessor;
  jobQueue: IJobQueue;
  monitoring: IMonitoringService;
}

export class DIContainer {
  private static instance: Container | null = null;

  static async initialize(config: AppConfig): Promise<Container> {
    if (this.instance) {
      return this.instance;
    }

    // Create root logger
    const logger = new Logger('domain-processor');

    // Initialize monitoring first
    const monitoring = new MonitoringService(logger.child('monitoring'));

    // Initialize database
    const database = new PostgresService(config.database, logger.child('database'));
    
    // Register database health check
    monitoring.registerHealthCheck('database', async () => {
      return await database.isHealthy();
    });

    // Initialize provider registry and API key manager
    const providerRegistry = new ProviderRegistry(logger.child('providers'));
    const apiKeyManager = new APIKeyManager(logger.child('api-keys'));

    // Register providers based on configuration
    this.registerProviders(config, providerRegistry, apiKeyManager, logger);

    // Initialize domain processor
    const domainProcessor = new DomainProcessor(
      database,
      providerRegistry,
      logger.child('processor')
    );

    // Initialize job queue
    const jobQueue = new JobQueue(
      config.queue.concurrency,
      logger.child('queue')
    );

    // Set up queue processing
    jobQueue.process(async (job) => {
      const domain = await database.getDomainById(job.domainId);
      if (domain) {
        await domainProcessor.processDomain(domain);
      }
    });

    // Set up queue monitoring
    jobQueue.onError((error, job) => {
      monitoring.incrementCounter('queue.errors', { domain: job.domain });
      logger.error(`Queue processing error for ${job.domain}`, error);
    });

    jobQueue.onComplete((job, result) => {
      monitoring.incrementCounter('queue.completed');
      monitoring.recordDuration('queue.processing', result.processingTime);
    });

    // Set up monitoring alerts
    monitoring.setAlertThreshold('queue.errors', 10, 'gt' as any);
    monitoring.setAlertThreshold('database.response_time', 1000, 'gt' as any);

    // Register provider health checks
    monitoring.registerHealthCheck('providers', async () => {
      const available = providerRegistry.getAvailableProviders();
      return available.length > 0;
    });

    this.instance = {
      config,
      logger,
      database,
      providerRegistry,
      apiKeyManager,
      domainProcessor,
      jobQueue,
      monitoring
    };

    logger.info('Container initialized successfully');
    return this.instance;
  }

  private static registerProviders(
    config: AppConfig,
    registry: ILLMProviderRegistry,
    keyManager: IAPIKeyManager,
    logger: Logger
  ): void {
    // Register OpenAI providers
    if (config.providers.openai?.enabled) {
      const keys = config.providers.openai.apiKeys;
      keyManager.addKeys('openai', keys);
      
      keys.forEach((key, index) => {
        const provider = new OpenAIProvider(
          config.providers.openai.model,
          key,
          config.providers.openai.tier,
          logger.child(`openai-${index}`)
        );
        registry.registerProvider(provider);
      });
    }

    // Register Anthropic providers
    if (config.providers.anthropic?.enabled) {
      const keys = config.providers.anthropic.apiKeys;
      keyManager.addKeys('anthropic', keys);
      
      keys.forEach((key, index) => {
        const provider = new AnthropicProvider(
          config.providers.anthropic.model,
          key,
          config.providers.anthropic.tier,
          logger.child(`anthropic-${index}`)
        );
        registry.registerProvider(provider);
      });
    }

    // Register DeepSeek providers
    if (config.providers.deepseek?.enabled) {
      const keys = config.providers.deepseek.apiKeys;
      keyManager.addKeys('deepseek', keys);
      
      keys.forEach((key, index) => {
        const provider = new DeepSeekProvider(
          config.providers.deepseek.model,
          key,
          config.providers.deepseek.tier,
          logger.child(`deepseek-${index}`)
        );
        registry.registerProvider(provider);
      });
    }

    // Register Together providers
    if (config.providers.together?.enabled) {
      const keys = config.providers.together.apiKeys;
      keyManager.addKeys('together', keys);
      
      keys.forEach((key, index) => {
        const provider = new TogetherProvider(
          config.providers.together.model,
          key,
          config.providers.together.tier,
          logger.child(`together-${index}`)
        );
        registry.registerProvider(provider);
      });
    }

    // Register XAI providers
    if (config.providers.xai?.enabled) {
      const keys = config.providers.xai.apiKeys;
      keyManager.addKeys('xai', keys);
      
      keys.forEach((key, index) => {
        const provider = new XAIProvider(
          config.providers.xai.model,
          key,
          config.providers.xai.tier,
          logger.child(`xai-${index}`)
        );
        registry.registerProvider(provider);
      });
    }

    // Register Perplexity providers
    if (config.providers.perplexity?.enabled) {
      const keys = config.providers.perplexity.apiKeys;
      keyManager.addKeys('perplexity', keys);
      
      keys.forEach((key, index) => {
        const provider = new PerplexityProvider(
          config.providers.perplexity.model,
          key,
          config.providers.perplexity.tier,
          logger.child(`perplexity-${index}`)
        );
        registry.registerProvider(provider);
      });
    }

    // Register Mistral providers
    if (config.providers.mistral?.enabled) {
      const keys = config.providers.mistral.apiKeys;
      keyManager.addKeys('mistral', keys);
      
      keys.forEach((key, index) => {
        const provider = new MistralProvider(
          config.providers.mistral.model,
          key,
          config.providers.mistral.tier,
          logger.child(`mistral-${index}`)
        );
        registry.registerProvider(provider);
      });
    }

    // Register Google providers
    if (config.providers.google?.enabled) {
      const keys = config.providers.google.apiKeys;
      keyManager.addKeys('google', keys);
      
      keys.forEach((key, index) => {
        const provider = new GoogleProvider(
          config.providers.google.model,
          key,
          config.providers.google.tier,
          logger.child(`google-${index}`)
        );
        registry.registerProvider(provider);
      });
    }

    // Register Cohere providers
    if (config.providers.cohere?.enabled) {
      const keys = config.providers.cohere.apiKeys;
      keyManager.addKeys('cohere', keys);
      
      keys.forEach((key, index) => {
        const provider = new CohereProvider(
          config.providers.cohere.model,
          key,
          config.providers.cohere.tier,
          logger.child(`cohere-${index}`)
        );
        registry.registerProvider(provider);
      });
    }

    // Register AI21 providers
    if (config.providers.ai21?.enabled) {
      const keys = config.providers.ai21.apiKeys;
      keyManager.addKeys('ai21', keys);
      
      keys.forEach((key, index) => {
        const provider = new AI21Provider(
          config.providers.ai21.model,
          key,
          config.providers.ai21.tier,
          logger.child(`ai21-${index}`)
        );
        registry.registerProvider(provider);
      });
    }

    // Register Groq providers
    if (config.providers.groq?.enabled) {
      const keys = config.providers.groq.apiKeys;
      keyManager.addKeys('groq', keys);
      
      keys.forEach((key, index) => {
        const provider = new GroqProvider(
          config.providers.groq.model,
          key,
          config.providers.groq.tier,
          logger.child(`groq-${index}`)
        );
        registry.registerProvider(provider);
      });
    }

    // Register new providers (Meta Llama, OpenRouter, Bedrock)
    registerNewProviders(registry, logger);
  }

  static async shutdown(): Promise<void> {
    if (!this.instance) return;

    const { logger, database, jobQueue } = this.instance;

    logger.info('Shutting down container');

    // Pause queue processing
    jobQueue.pause();

    // Wait for active jobs to complete (max 30 seconds)
    const timeout = setTimeout(() => {
      logger.warn('Shutdown timeout reached, forcing shutdown');
    }, 30000);

    while (jobQueue.getStats().active > 0) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    clearTimeout(timeout);

    // Close database connection
    await database.close();

    logger.info('Container shutdown complete');
    this.instance = null;
  }

  static get(): Container {
    if (!this.instance) {
      throw new Error('Container not initialized. Call initialize() first.');
    }
    return this.instance;
  }
}